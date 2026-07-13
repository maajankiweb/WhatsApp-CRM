import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'

// ─── Env vars (must be set before the module is loaded) ───────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.META_WEBHOOK_VERIFY_TOKEN = 'mock-verify-token'

// ─── Capture after() promises so we can await them in tests ───────────────────
let afterPromises: Promise<unknown>[] = []

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: (callback: () => unknown) => {
      const p = callback()
      if (p instanceof Promise) {
        afterPromises.push(p)
      }
    },
    NextResponse: actual.NextResponse,
  }
})

// ─── Signature verification ────────────────────────────────────────────────────
vi.mock('@/lib/whatsapp/webhook-signature', () => ({
  verifyMetaWebhookSignature: vi.fn(() => true),
}))

// ─── Encryption: identity so the verify_token round-trips ─────────────────────
vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: (t: string) => t,
  encrypt: (t: string) => t,
  isLegacyFormat: () => false,
}))

// ─── External service stubs ───────────────────────────────────────────────────
vi.mock('@/lib/automations/engine', () => ({
  runAutomationsForTrigger: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/flows/engine', () => ({
  dispatchInboundToFlows: vi.fn().mockResolvedValue({ consumed: false }),
}))
vi.mock('@/lib/ai/auto-reply', () => ({
  dispatchInboundToAiReply: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/webhooks/deliver', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/whatsapp/template-webhook', () => ({
  isTemplateWebhookField: (field: string) =>
    Boolean(field?.startsWith('message_template_')),
  handleTemplateWebhookChange: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/whatsapp/meta-api', () => ({
  getMediaUrl: vi.fn().mockResolvedValue('https://mock-media-url'),
  downloadMedia: vi.fn().mockResolvedValue('https://stored-media-url'),
}))

// ─── findExistingContact: default returns null (new contact on every inbound) ─
import { findExistingContact } from '@/lib/contacts/dedupe'
vi.mock('@/lib/contacts/dedupe', () => ({
  findExistingContact: vi.fn().mockResolvedValue(null),
  isUniqueViolation: vi.fn().mockReturnValue(false),
}))

// ─── MockQueryBuilder ─────────────────────────────────────────────────────────
// mockQueryResult is keyed by table name. Values:
//   object   → returned verbatim for every call on that table
//   array    → items shift()ed off one by one (sequential queries on same table)
//   function → called each time, useful to avoid array exhaustion
let mockQueryResult: Record<string, unknown> = {}

class MockQueryBuilder {
  private tbl: string
  constructor(table: string) { this.tbl = table }

  select() { return this }
  insert() { return this }
  update() { return this }
  upsert() { return this }
  delete() { return this }
  eq()     { return this }
  like()   { return this }
  in()     { return this }
  order()  { return this }
  limit()  { return this }

  single()      { return Promise.resolve(this.resolve()) }
  maybeSingle() { return Promise.resolve(this.resolve()) }
  then(cb: (v: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(cb)
  }

  private resolve() {
    const v = mockQueryResult[this.tbl]
    if (Array.isArray(v)) return v.shift() ?? { data: null, error: null }
    if (typeof v === 'function') return (v as () => unknown)()
    return v ?? { data: null, error: null }
  }
}

const mockFrom = vi.fn((table: string) => new MockQueryBuilder(table))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}))

// ─── Shared fixtures ──────────────────────────────────────────────────────────
/** Minimal whatsapp_config row. decrypt() is identity so verify_token matches. */
const VALID_CONFIG_ROW = {
  id: 'cfg-uuid',
  account_id: 'org-uuid-123',
  user_id: 'owner-user-uuid',
  phone_number_id: 'valid-phone-id',
  access_token: 'fake-token',
  verify_token: 'mock-verify-token',
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult = {}
    afterPromises = []
  })

  it('verifies webhook with valid token → 200 + challenge echoed', async () => {
    mockQueryResult['whatsapp_config'] = { data: [VALID_CONFIG_ROW], error: null }
    const req = new NextRequest(
      'https://app.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=mock-verify-token'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('12345')
  })

  it('returns 403 when verify_token does not match any config', async () => {
    mockQueryResult['whatsapp_config'] = { data: [VALID_CONFIG_ROW], error: null }
    const req = new NextRequest(
      'https://app.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=wrong-token'
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when hub parameters are missing', async () => {
    const req = new NextRequest('https://app.test/api/whatsapp/webhook')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when whatsapp_config query fails', async () => {
    mockQueryResult['whatsapp_config'] = { data: null, error: { message: 'db error' } }
    const req = new NextRequest(
      'https://app.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=abc&hub.verify_token=mock-verify-token'
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult = {}
    afterPromises = []
    vi.mocked(verifyMetaWebhookSignature).mockReturnValue(true)
    vi.mocked(findExistingContact).mockResolvedValue(null)
  })

  const createReq = (body: unknown, sig = 'sha256=validsig') => {
    const h = new Headers()
    if (sig) h.set('x-hub-signature-256', sig)
    return new NextRequest('https://app.test/api/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: h,
    })
  }

  // ── signature guard ────────────────────────────────────────────────────────
  it('rejects invalid HMAC signature → 401', async () => {
    vi.mocked(verifyMetaWebhookSignature).mockReturnValueOnce(false)
    const res = await POST(createReq({ entry: [] }, 'sha256=bad'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid signature')
  })

  // ── unknown phone number ───────────────────────────────────────────────────
  it('returns 200 and ignores messages from unknown phone numbers', async () => {
    // Empty config rows → no matching phone
    mockQueryResult['whatsapp_config'] = { data: [], error: null }

    const payload = {
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'unknown-phone-id' },
        contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
        messages: [{ id: 'msg-1', from: '12345', timestamp: '1783077575', type: 'text', text: { body: 'Hello' } }],
      } }] }],
    }

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('whatsapp_config')
    expect(mockFrom).not.toHaveBeenCalledWith('contacts')
    expect(mockFrom).not.toHaveBeenCalledWith('messages')
  })

  // ── template event ─────────────────────────────────────────────────────────
  it('handles template status events and returns 200', async () => {
    const payload = {
      entry: [{ changes: [{ field: 'message_template_status_update', value: {
        event: 'APPROVED',
        message_template_id: '123',
        message_template_name: 'test_template',
      } }] }],
    }

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    const { handleTemplateWebhookChange } = await import('@/lib/whatsapp/template-webhook')
    expect(handleTemplateWebhookChange).toHaveBeenCalled()
  })

  // ── empty entry ────────────────────────────────────────────────────────────
  it('returns 200 immediately when entry array is empty', async () => {
    const res = await POST(createReq({ entry: [] }))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ── full inbound text message ──────────────────────────────────────────────
  it('processes inbound message: creates contact + conversation + message row', async () => {
    const payload = {
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'valid-phone-id' },
        contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
        messages: [{ id: 'msg-1', from: '12345', timestamp: '1783077575', type: 'text', text: { body: 'Hello' } }],
      } }] }],
    }

    // whatsapp_config → single row
    mockQueryResult['whatsapp_config'] = { data: [VALID_CONFIG_ROW], error: null }

    // findExistingContact is mocked → returns null → route inserts new contact
    mockQueryResult['contacts'] = [
      // insert → new contact
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]

    // conversations: limit(1) → empty list → insert → new conversation
    mockQueryResult['conversations'] = [
      { data: [], error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },        // insert
    ]

    // messages: prior count head → insert
    mockQueryResult['messages'] = [
      { count: 0, error: null },                                              // select head count
      { data: { id: 'msg-uuid-555' }, error: null },                         // insert
    ]

    // broadcast_recipients: no match
    mockQueryResult['broadcast_recipients'] = [
      { data: null, error: null },
    ]

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('whatsapp_config')
    expect(mockFrom).toHaveBeenCalledWith('contacts')
    expect(mockFrom).toHaveBeenCalledWith('conversations')
    expect(mockFrom).toHaveBeenCalledWith('messages')
  })

  // ── status update (delivered / read) ──────────────────────────────────────
  it('processes status updates: patches messages + broadcast_recipients + fires webhook', async () => {
    const payload = {
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'valid-phone-id' },
        statuses: [{ id: 'msg-meta-123', status: 'delivered', timestamp: '1783077575', recipient_id: '12345' }],
      } }] }],
    }

    mockQueryResult['messages'] = [
      { error: null },                                                          // update status
      {                                                                         // select for webhook fan-out
        data: { conversation_id: 'conv-uuid-777', conversations: { account_id: 'org-uuid-123' } },
        error: null,
      },
    ]
    mockQueryResult['broadcast_recipients'] = [
      { data: { id: 'recipient-uuid-111', status: 'sent' }, error: null },    // maybeSingle
      { error: null },                                                          // update
    ]

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockFrom).toHaveBeenCalledWith('broadcast_recipients')
    const { dispatchWebhookEvent } = await import('@/lib/webhooks/deliver')
    expect(dispatchWebhookEvent).toHaveBeenCalled()
  })

  // ── reaction message ───────────────────────────────────────────────────────
  it('processes reaction messages and upserts to message_reactions', async () => {
    const payload = {
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'valid-phone-id' },
        contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
        messages: [{
          id: 'msg-react-123',
          from: '12345',
          timestamp: '1783077575',
          type: 'reaction',
          reaction: { message_id: 'parent-meta-id', emoji: '❤️' },
        }],
      } }] }],
    }

    mockQueryResult['whatsapp_config'] = { data: [VALID_CONFIG_ROW], error: null }
    // New contact insert
    mockQueryResult['contacts'] = [
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]
    // New conversation
    mockQueryResult['conversations'] = [
      { data: [], error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },
    ]
    // lookupInternalIdByMetaId → messages.maybeSingle()
    mockQueryResult['messages'] = [
      { data: { id: 'parent-internal-id' }, error: null },
    ]
    // upsert reaction
    mockQueryResult['message_reactions'] = { error: null }

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('message_reactions')
  })

  // ── interactive button reply ───────────────────────────────────────────────
  it('processes interactive button reply and saves interactive_reply_id', async () => {
    const payload = {
      entry: [{ changes: [{ field: 'messages', value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'valid-phone-id' },
        contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
        messages: [{
          id: 'msg-interactive-123',
          from: '12345',
          timestamp: '1783077575',
          type: 'interactive',
          interactive: {
            type: 'button_reply',
            button_reply: { id: 'btn-yes-id', title: 'Yes, proceed' },
          },
        }],
      } }] }],
    }

    mockQueryResult['whatsapp_config'] = { data: [VALID_CONFIG_ROW], error: null }
    mockQueryResult['contacts'] = [
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]
    mockQueryResult['conversations'] = [
      { data: [], error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },
    ]
    mockQueryResult['messages'] = [
      { count: 0, error: null },
      { data: { id: 'inserted-msg-uuid' }, error: null },
    ]
    mockQueryResult['broadcast_recipients'] = [
      { data: null, error: null },
    ]

    const res = await POST(createReq(payload))
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    const messagesCalls = mockFrom.mock.calls.filter(c => c[0] === 'messages')
    expect(messagesCalls.length).toBeGreaterThan(0)
  })
})
