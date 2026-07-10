import { NextResponse, after } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import { getMediaUrl } from '@/lib/whatsapp/meta-api'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { dispatchInboundToFlows } from '@/lib/flows/engine'
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply'
import { dispatchWebhookEvent } from '@/lib/webhooks/deliver'
import {
  handleTemplateWebhookChange,
  isTemplateWebhookField,
} from '@/lib/whatsapp/template-webhook'

export const maxDuration = 60

export interface UserCacheEntry {
  userId: string
  expiresAt: number
}
export const auditUserCache = new Map<string, UserCacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function clearAuditUserCache() {
  auditUserCache.clear()
}

// Lazy-initialized service-role client.
// Bypassing RLS with service_role is safe here because this is an unauthenticated webhook endpoint called by Meta.
// The phone_number_id is globally unique and verified by Meta's signature, and the organization_id scoping is explicitly
// resolved and enforced in the application code, preventing cross-tenant data leakage.
let _adminClient: SupabaseClient | null = null
function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  audio?: { id: string; mime_type: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  reaction?: { message_id: string; emoji: string }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string; description?: string }
  }
  context?: { id: string }
}

interface WhatsAppWebhookEntry {
  id: string
  changes: Array<{
    value: {
      messaging_product: string
      metadata: {
        display_phone_number: string
        phone_number_id: string
      }
      contacts?: Array<{
        profile: { name: string }
        wa_id: string
      }>
      messages?: WhatsAppMessage[]
      statuses?: Array<{
        id: string
        status: string
        timestamp: string
        recipient_id: string
      }>
    }
    field: string
  }>
}

// GET - Webhook verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    if (!expectedToken) {
      console.error('[webhook] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured on the server.')
      return NextResponse.json(
        { error: 'Webhook verify token not configured' },
        { status: 500 }
      )
    }

    if (verifyToken === expectedToken) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    return NextResponse.json(
      { error: 'Verification token mismatch' },
      { status: 403 }
    )
  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Receive messages & status events
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  // Verify signature BEFORE parsing payload. Reject with 403.
  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] rejected request with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let body: { entry?: WhatsAppWebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entry = body.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value
  const phoneNumberId = value?.metadata?.phone_number_id

  // Handle cases where phone_number_id is missing (e.g. template status changes)
  if (!phoneNumberId) {
    if (change && isTemplateWebhookField(change.field)) {
      // Process template lifecycle webhook event asynchronously using service role client
      after(async () => {
        try {
          await handleTemplateWebhookChange(
            { field: change.field, value: change.value as unknown },
            supabaseAdmin()
          )
        } catch (error) {
          console.error('[webhook] Error handling template webhook change:', error)
        }
      })
      return NextResponse.json({ status: 'template_event_received' }, { status: 200 })
    }

    console.warn('[webhook] phone_number_id not found in metadata and not a template event')
    return NextResponse.json({ status: 'ignored' }, { status: 200 })
  }

  // Look up matching row in waba_connections by phone_number_id to resolve organization_id
  const { data: connection, error: connError } = await supabaseAdmin()
    .from('waba_connections')
    .select('organization_id, access_token_encrypted')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle()

  if (connError) {
    console.error('[webhook] DB error looking up waba_connections:', connError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!connection) {
    console.log(`[webhook] No matching organization found for phone_number_id: ${phoneNumberId}`)
    // Return 200 even for unknown numbers to avoid retry storms from Meta
    return NextResponse.json({ status: 'ignored_unknown_number' }, { status: 200 })
  }

  const { organization_id: organizationId, access_token_encrypted: accessTokenEncrypted } = connection

  // Decrypt access token to communicate with Meta Graph API
  let decryptedToken: string
  try {
    decryptedToken = decrypt(accessTokenEncrypted)
  } catch (error) {
    console.error('[webhook] Failed to decrypt access token:', error)
    return NextResponse.json({ error: 'Decryption failed' }, { status: 500 })
  }

  // Resolve audit user_id for the organization (owner or admin)
  const auditUserId = await resolveAuditUserIdForOrg(supabaseAdmin(), organizationId)
  if (!auditUserId) {
    console.error(`[webhook] No owner/admin found for organization: ${organizationId}`)
    return NextResponse.json({ error: 'No user found for organization' }, { status: 500 })
  }

  // Run the message / status processing inside Next.js after() to keep lambda functions alive until writes complete
  after(async () => {
    try {
      await processWebhook(body, organizationId, auditUserId, decryptedToken)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      const errStack = error instanceof Error ? error.stack : undefined
      console.error(
        JSON.stringify({
          event: 'webhook_processing_failed',
          severity: 'ERROR',
          organization_id: organizationId,
          phone_number_id: phoneNumberId,
          error: errMessage,
          stack: errStack,
          payload_preview: {
            message_ids: body.entry?.flatMap(e =>
              e.changes?.flatMap(c => c.value.messages?.map(m => m.id) || []) || []
            ),
            sender_phones: body.entry?.flatMap(e =>
              e.changes?.flatMap(c => c.value.messages?.map(m => m.from) || []) || []
            ),
          },
        })
      )
    }
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

// Find owner or admin user belonging to the organization to act as the audit user for new contact / conversation records
async function resolveAuditUserIdForOrg(
  db: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const now = Date.now()
  const cached = auditUserCache.get(organizationId)
  if (cached && cached.expiresAt > now) {
    return cached.userId
  }

  const { data: member } = await db
    .from('user_organizations')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .maybeSingle()

  let userId = member?.user_id || null

  if (!userId) {
    const { data: adminMember } = await db
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()
    userId = adminMember?.user_id || null
  }

  if (!userId) {
    const { data: anyMember } = await db
      .from('user_organizations')
      .select('user_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .maybeSingle()
    userId = anyMember?.user_id || null
  }

  if (userId) {
    auditUserCache.set(organizationId, {
      userId,
      expiresAt: now + CACHE_TTL,
    })
  }

  return userId
}

async function processWebhook(
  body: { entry?: WhatsAppWebhookEntry[] },
  organizationId: string,
  auditUserId: string,
  accessToken: string
) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (isTemplateWebhookField(change.field)) {
        await handleTemplateWebhookChange(
          { field: change.field, value: change.value as unknown },
          supabaseAdmin()
        )
        continue
      }

      const value = change.value

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status, organizationId)
        }
      }

      // Handle incoming messages
      if (!value.messages || !value.contacts) continue

      for (let i = 0; i < value.messages.length; i++) {
        const message = value.messages[i]
        const contact = value.contacts[i] || value.contacts[0]

        await processMessage(
          message,
          contact,
          organizationId,
          auditUserId,
          accessToken
        )
      }
    }
  }
}

const RECIPIENT_STATUS_LADDER = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
] as const

function ladderLevel(s: string): number {
  const idx = (RECIPIENT_STATUS_LADDER as readonly string[]).indexOf(s)
  return idx < 0 ? -1 : idx
}

function isValidStatusTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') {
    return current === 'pending' || current === 'sent'
  }
  if (current === 'failed') {
    return false
  }
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false
  if (ci < 0) return true
  return ii > ci
}

async function handleStatusUpdate(
  status: {
    id: string
    status: string
    timestamp: string
    recipient_id: string
  },
  organizationId: string
) {
  // 1) Mirror onto messages — scoped to organization_id
  const { error: msgErr } = await supabaseAdmin()
    .from('messages')
    .update({ status: status.status })
    .eq('message_id', status.id)
    .eq('organization_id', organizationId)

  if (msgErr) {
    console.error('Error updating message status:', msgErr)
  }

  // 2) Mirror onto broadcast_recipients via whatsapp_message_id — scoped to organization_id
  const tsIso = new Date(parseInt(status.timestamp) * 1000).toISOString()

  const { data: recipient, error: recFetchErr } = await supabaseAdmin()
    .from('broadcast_recipients')
    .select('id, status')
    .eq('whatsapp_message_id', status.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (recFetchErr) {
    console.error('Error fetching broadcast recipient:', recFetchErr)
  } else if (
    recipient &&
    isValidStatusTransition(recipient.status, status.status)
  ) {
    const update: Record<string, unknown> = { status: status.status }
    if (status.status === 'sent' && !('sent_at' in update)) update.sent_at = tsIso
    if (status.status === 'delivered') update.delivered_at = tsIso
    if (status.status === 'read') update.read_at = tsIso

    const { error: recUpdateErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update(update)
      .eq('id', recipient.id)
      .eq('organization_id', organizationId)

    if (recUpdateErr) {
      console.error('Error updating broadcast recipient status:', recUpdateErr)
    }
  }

  // 3) Webhook fan-out for messages we store (inbox / API sends).
  const { data: msgRow } = await supabaseAdmin()
    .from('messages')
    .select('conversation_id, conversations(organization_id)')
    .eq('message_id', status.id)
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle()

  if (msgRow) {
    const conv = msgRow.conversations as unknown as { organization_id: string } | null
    const orgId = conv?.organization_id
    if (orgId) {
      await dispatchWebhookEvent(
        supabaseAdmin(),
        orgId,
        'message.status_updated',
        {
          whatsapp_message_id: status.id,
          conversation_id: msgRow.conversation_id,
          status: status.status,
        }
      )
    }
  }
}

async function flagBroadcastReplyIfAny(organizationId: string, contactId: string) {
  try {
    const { data: recs, error } = await supabaseAdmin()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(organization_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.organization_id', organizationId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !recs || recs.length === 0) return

    const row = recs[0]
    const { error: updErr } = await supabaseAdmin()
      .from('broadcast_recipients')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('organization_id', organizationId)

    if (updErr) {
      console.error('Error marking broadcast recipient replied:', updErr)
    }
  } catch (err) {
    console.error('flagBroadcastReplyIfAny failed:', err)
  }
}

async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', metaId)
    .eq('conversation_id', conversationId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) {
    console.error('[webhook] lookupInternalIdByMetaId failed:', error.message)
    return null
  }
  return data?.id ?? null
}

async function handleReaction(
  message: WhatsAppMessage,
  conversationId: string,
  contactId: string,
  organizationId: string
) {
  const reaction = message.reaction
  if (!reaction?.message_id) return

  const targetInternalId = await lookupInternalIdByMetaId(
    reaction.message_id,
    conversationId,
    organizationId
  )
  if (!targetInternalId) {
    console.warn('[webhook] reaction target message not found; skipping', reaction.message_id)
    return
  }

  if (!reaction.emoji) {
    const { error: delError } = await supabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', targetInternalId)
      .eq('actor_type', 'customer')
      .eq('actor_id', contactId)
      .eq('organization_id', organizationId)
    if (delError) {
      console.error('[webhook] reaction delete failed:', delError.message)
    }
    return
  }

  const { error: upsertError } = await supabaseAdmin()
    .from('message_reactions')
    .upsert(
      {
        organization_id: organizationId,
        message_id: targetInternalId,
        conversation_id: conversationId,
        actor_type: 'customer',
        actor_id: contactId,
        emoji: reaction.emoji,
      },
      { onConflict: 'message_id,actor_type,actor_id' }
    )
  if (upsertError) {
    console.error('[webhook] reaction upsert failed:', upsertError.message)
  }
}

async function processMessage(
  message: WhatsAppMessage,
  contact: { profile: { name: string }; wa_id: string },
  organizationId: string,
  auditUserId: string,
  accessToken: string
) {
  const senderPhone = normalizePhone(message.from)
  const contactName = contact.profile.name

  // Find or create contact
  const contactOutcome = await findOrCreateContact(
    organizationId,
    auditUserId,
    senderPhone,
    contactName
  )
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  // Find or create conversation
  const convResult = await findOrCreateConversation(
    organizationId,
    auditUserId,
    contactRecord.id
  )
  if (!convResult) return
  const conversation = convResult.conversation

  // Emit conversation.created event
  if (convResult.created) {
    await dispatchWebhookEvent(supabaseAdmin(), organizationId, 'conversation.created', {
      conversation_id: conversation.id,
      contact_id: contactRecord.id,
    })
  }

  // Reactions short-circuit
  if (message.type === 'reaction') {
    await handleReaction(message, conversation.id, contactRecord.id, organizationId)
    return
  }

  // Parse message content
  const { contentText, mediaUrl, mediaType, interactiveReplyId } =
    await parseMessageContent(message, accessToken)
  void mediaType

  // Resolve swipe-reply context if present
  let replyToInternalId: string | null = null
  if (message.context?.id) {
    replyToInternalId = await lookupInternalIdByMetaId(
      message.context.id,
      conversation.id,
      organizationId
    )
    if (!replyToInternalId) {
      console.warn('[webhook] reply context parent not found:', message.context.id)
    }
  }

  const ALLOWED_CONTENT_TYPES = new Set([
    'text', 'image', 'document', 'audio', 'video',
    'location', 'template', 'interactive',
  ])
  const contentType = ALLOWED_CONTENT_TYPES.has(message.type)
    ? message.type
    : message.type === 'sticker'
      ? 'image'
      : 'text'

  // Determine whether this is the contact's very first inbound message
  const { count: priorCustomerMsgCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
    .eq('organization_id', organizationId)
  const isFirstInboundMessage = (priorCustomerMsgCount ?? 0) === 0

  const { error: msgError } = await supabaseAdmin().from('messages').insert({
    organization_id: organizationId,
    conversation_id: conversation.id,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    message_id: message.id,
    status: 'delivered',
    created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    reply_to_message_id: replyToInternalId,
    interactive_reply_id: interactiveReplyId,
  })

  if (msgError) {
    console.error('Error inserting message:', msgError)
    return
  }

  // Update conversation
  const { error: convError } = await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${message.type}]`,
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)
    .eq('organization_id', organizationId)

  if (convError) {
    console.error('Error updating conversation:', convError)
  }

  await flagBroadcastReplyIfAny(organizationId, contactRecord.id)

  // Check Business Hours and trigger OOO Auto-Reply if configured
  let isOOO = false
  try {
    const { data: bh } = await supabaseAdmin()
      .from('business_hours')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (bh && bh.is_enabled) {
      const { isOutsideBusinessHours } = await import('@/lib/business-hours')
      if (isOutsideBusinessHours(new Date(), bh.timezone, bh.daily_hours)) {
        isOOO = true
        const { engineSendText } = await import('@/lib/automations/meta-send')
        await engineSendText({
          accountId: organizationId,
          userId: auditUserId,
          conversationId: conversation.id,
          contactId: contactRecord.id,
          text: bh.ooo_message,
        })
      }
    }
  } catch (err) {
    console.error('[business-hours] OOO check/reply failed:', err)
  }

  let flowConsumed = false
  if (!isOOO) {
    const flowResult = await dispatchInboundToFlows({
      accountId: organizationId,
      userId: auditUserId,
      contactId: contactRecord.id,
      conversationId: conversation.id,
      message:
        interactiveReplyId
          ? {
              kind: 'interactive_reply',
              reply_id: interactiveReplyId,
              reply_title: contentText ?? '',
              meta_message_id: message.id,
            }
          : {
              kind: 'text',
              text: contentText ?? message.text?.body ?? '',
              meta_message_id: message.id,
            },
      isFirstInboundMessage,
    })
    flowConsumed = flowResult.consumed
  }

  const inboundText = contentText ?? message.text?.body ?? ''
  const automationTriggers: (
    | 'new_contact_created'
    | 'first_inbound_message'
    | 'new_message_received'
    | 'keyword_match'
  )[] = []
  if (!flowConsumed) {
    automationTriggers.push('new_message_received', 'keyword_match')
  }
  if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
  if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')

  if (!isOOO) {
    for (const triggerType of automationTriggers) {
      runAutomationsForTrigger({
        accountId: organizationId,
        triggerType,
        contactId: contactRecord.id,
        context: {
          message_text: inboundText,
          conversation_id: conversation.id,
        },
      }).catch((err) => console.error('[automations] dispatch failed:', err))
    }

    if (!flowConsumed && !interactiveReplyId && inboundText.trim()) {
      await dispatchInboundToAiReply({
        accountId: organizationId,
        conversationId: conversation.id,
        contactId: contactRecord.id,
        configOwnerUserId: auditUserId,
      })
    }
  }

  await dispatchWebhookEvent(supabaseAdmin(), organizationId, 'message.received', {
    conversation_id: conversation.id,
    contact_id: contactRecord.id,
    whatsapp_message_id: message.id,
    content_type: contentType,
    text: contentText,
  })
}

async function parseMessageContent(
  message: WhatsAppMessage,
  accessToken: string
): Promise<{
  contentText: string | null
  mediaUrl: string | null
  mediaType: string | null
  interactiveReplyId: string | null
}> {
  const verifyAndBuildUrl = async (mediaId: string): Promise<string | null> => {
    try {
      await getMediaUrl({ mediaId, accessToken })
      return `/api/whatsapp/media/${mediaId}`
    } catch (error) {
      console.error(
        `Failed to verify media ${mediaId} with Meta:`,
        error instanceof Error ? error.message : error
      )
      return null
    }
  }

  const empty = {
    contentText: null,
    mediaUrl: null,
    mediaType: null,
    interactiveReplyId: null,
  }

  switch (message.type) {
    case 'text':
      return { ...empty, contentText: message.text?.body || null }

    case 'image':
      if (message.image?.id) {
        return {
          ...empty,
          contentText: message.image.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.image.id),
          mediaType: message.image.mime_type,
        }
      }
      return empty

    case 'video':
      if (message.video?.id) {
        return {
          ...empty,
          contentText: message.video.caption || null,
          mediaUrl: await verifyAndBuildUrl(message.video.id),
          mediaType: message.video.mime_type,
        }
      }
      return empty

    case 'document':
      if (message.document?.id) {
        return {
          ...empty,
          contentText: message.document.caption || message.document.filename || null,
          mediaUrl: await verifyAndBuildUrl(message.document.id),
          mediaType: message.document.mime_type,
        }
      }
      return empty

    case 'audio':
      if (message.audio?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.audio.id),
          mediaType: message.audio.mime_type,
        }
      }
      return empty

    case 'sticker':
      if (message.sticker?.id) {
        return {
          ...empty,
          mediaUrl: await verifyAndBuildUrl(message.sticker.id),
          mediaType: message.sticker.mime_type,
        }
      }
      return empty

    case 'location':
      if (message.location) {
        const loc = message.location
        const locationText = [loc.name, loc.address, `${loc.latitude},${loc.longitude}`]
          .filter(Boolean)
          .join(' - ')
        return { ...empty, contentText: locationText }
      }
      return empty

    case 'reaction':
      return { ...empty, contentText: message.reaction?.emoji || null }

    case 'interactive': {
      const reply = message.interactive?.button_reply ?? message.interactive?.list_reply
      if (reply?.id) {
        return {
          ...empty,
          contentText: reply.title || reply.id,
          interactiveReplyId: reply.id,
        }
      }
      return { ...empty, contentText: '[Interactive reply]' }
    }

    default:
      return {
        ...empty,
        contentText: `[Unsupported message type: ${message.type}]`,
      }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContactRow = any

interface ContactOutcome {
  contact: ContactRow
  wasCreated: boolean
}

async function findOrCreateContact(
  organizationId: string,
  auditUserId: string,
  phone: string,
  name: string
): Promise<ContactOutcome | null> {
  const existingContact = await findExistingContact(
    supabaseAdmin(),
    organizationId,
    phone
  )

  if (existingContact) {
    if (name && name !== existingContact.name) {
      await supabaseAdmin()
        .from('contacts')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existingContact.id)
        .eq('organization_id', organizationId)
    }
    return { contact: existingContact, wasCreated: false }
  }

  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      organization_id: organizationId,
      account_id: organizationId,
      user_id: auditUserId,
      phone,
      name: name || phone,
    })
    .select()
    .single()

  if (createError) {
    if (isUniqueViolation(createError)) {
      const raced = await findExistingContact(supabaseAdmin(), organizationId, phone)
      if (raced) return { contact: raced, wasCreated: false }
    }
    console.error('Error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

async function findOrCreateConversation(
  organizationId: string,
  auditUserId: string,
  contactId: string
) {
  const { data: existing, error: findError } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('contact_id', contactId)
    .maybeSingle()

  if (!findError && existing) {
    return { conversation: existing, created: false }
  }

  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      organization_id: organizationId,
      account_id: organizationId,
      user_id: auditUserId,
      contact_id: contactId,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating conversation:', createError)
    return null
  }

  return { conversation: newConv, created: true }
}
