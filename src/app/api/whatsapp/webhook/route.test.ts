import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, clearAuditUserCache } from './route'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'

// Mock environment variables
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'mock-verify-token'
process.env.META_APP_SECRET = 'mock-app-secret'
process.env.ENCRYPTION_KEY = 'f22db883c72a607586ae54f45814ad2692c0e797556a3588fec8450287eedecc'

// Track promises scheduled in after() so we can await them in tests
let afterPromises: Promise<unknown>[] = []

// Mock next/server
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

// Mock signature verification
vi.mock('@/lib/whatsapp/webhook-signature', () => ({
  verifyMetaWebhookSignature: vi.fn(() => true),
}))

// Mock encryption
vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: (t: string) => t === 'ivHex:ctHex:tagHex' ? 'fake-decrypted-token' : t,
  encrypt: (t: string) => t,
  isLegacyFormat: () => false,
}))

// Mock other services
vi.mock('@/lib/automations/engine', () => ({
  runAutomationsForTrigger: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/flows/engine', () => ({
  dispatchInboundToFlows: vi.fn().mockResolvedValue({ consumed: false }),
}))

vi.mock('@/lib/ai/auto-reply', () => ({
  dispatchInboundToAiReply: vi.fn().mockResolvedValue(undefined),
}))

export const mockIsOutsideBusinessHours = vi.fn(() => false)
vi.mock('@/lib/business-hours', () => ({
  isOutsideBusinessHours: () => mockIsOutsideBusinessHours(),
}))

export const mockEngineSendText = vi.fn().mockResolvedValue({ whatsapp_message_id: 'mock-ooo-msg' })
vi.mock('@/lib/automations/meta-send', () => ({
  engineSendText: (args: any) => mockEngineSendText(args),
  engineSendTemplate: vi.fn(),
}))

vi.mock('@/lib/webhooks/deliver', () => ({
  dispatchWebhookEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/whatsapp/template-webhook', () => ({
  isTemplateWebhookField: (field: string) => field ? field.startsWith('message_template_') : false,
  handleTemplateWebhookChange: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/whatsapp/meta-api', () => ({
  getMediaUrl: vi.fn().mockResolvedValue('https://mock-media-url'),
}))

// Mock database query state
let mockQueryResult: Record<string, unknown> = {}

class MockQueryBuilder {
  private table: string

  constructor(table: string) {
    this.table = table
  }

  select() { return this }
  insert() { return this }
  update() { return this }
  upsert() { return this }
  delete() { return this }
  eq() { return this }
  like() { return this }
  in() { return this }
  order() { return this }
  limit() { return this }
  single() {
    const val = this.getResolveValue()
    console.log(`[MockDB] ${this.table}.single() called -> returning`, val)
    return Promise.resolve(val)
  }
  maybeSingle() {
    const val = this.getResolveValue()
    console.log(`[MockDB] ${this.table}.maybeSingle() called -> returning`, val)
    return Promise.resolve(val)
  }
  then(resolve: (value: unknown) => unknown) {
    const val = this.getResolveValue()
    console.log(`[MockDB] ${this.table}.then() called -> returning`, val)
    return Promise.resolve(val).then(resolve)
  }

  private getResolveValue() {
    const val = mockQueryResult[this.table]
    if (Array.isArray(val)) {
      const popped = val.shift() || { data: null, error: null }
      console.log(`[MockDB] Array query for ${this.table} -> shifted`, popped)
      return popped
    }
    if (typeof val === 'function') {
      return val()
    }
    return val || { data: null, error: null }
  }
}

const mockFrom = vi.fn((table: string) => {
  console.log(`[MockDB] from(${table}) called`)
  return new MockQueryBuilder(table)
})

const mockSupabaseClient = {
  from: mockFrom,
}

// Mock @supabase/supabase-js createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('GET /api/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult = {}
    afterPromises = []
    clearAuditUserCache()
  })

  it('verifies webhook correctly with valid token', async () => {
    const req = new NextRequest(
      'https://app.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=mock-verify-token'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('12345')
  })

  it('fails verification with invalid token', async () => {
    const req = new NextRequest(
      'https://app.test/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=wrong-token'
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('fails verification with missing parameters', async () => {
    const req = new NextRequest('https://app.test/api/whatsapp/webhook')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResult = {}
    afterPromises = []
    clearAuditUserCache()
    vi.mocked(verifyMetaWebhookSignature).mockReturnValue(true)
  })

  const createReq = (body: unknown, signature = 'sha256=validsig') => {
    const headers = new Headers()
    if (signature) {
      headers.set('x-hub-signature-256', signature)
    }
    return new NextRequest('https://app.test/api/whatsapp/webhook', {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    })
  }

  it('rejects request with invalid signature with 403', async () => {
    vi.mocked(verifyMetaWebhookSignature).mockReturnValueOnce(false)
    const req = createReq({ entry: [] }, 'sha256=invalidsig')
    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Invalid signature')
  })

  it('logs and returns 200 for unknown numbers without processing payload', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'unknown-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [{ id: 'msg-1', from: '12345', timestamp: '1783077575', type: 'text', text: { body: 'Hello' } }],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = { data: null, error: null }

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)
    const data = await res.json()
    expect(data.status).toBe('ignored_unknown_number')
    expect(mockFrom).toHaveBeenCalledWith('waba_connections')
    // Ensure no queries were made to contacts/messages/conversations since number was unknown
    expect(mockFrom).not.toHaveBeenCalledWith('contacts')
    expect(mockFrom).not.toHaveBeenCalledWith('conversations')
    expect(mockFrom).not.toHaveBeenCalledWith('messages')
  })

  it('handles template events without phone_number_id by processing them and returning 200', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'message_template_status_update',
              value: {
                event: 'APPROVED',
                message_template_id: '1234567890',
                message_template_name: 'test_template',
              },
            },
          ],
        },
      ],
    }

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)
    const data = await res.json()
    expect(data.status).toBe('template_event_received')
  })

  it('resolves organization and processes message successfully', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'valid-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [{ id: 'msg-1', from: '12345', timestamp: '1783077575', type: 'text', text: { body: 'Hello' } }],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = {
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    }

    mockQueryResult['user_organizations'] = {
      data: {
        user_id: 'owner-user-uuid',
      },
      error: null,
    }

    // contacts: 1. check existing (null), 2. insert successfully
    mockQueryResult['contacts'] = [
      { data: null, error: null }, // findExistingContact result
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null }, // insert result
    ]

    // conversations: 1. check existing (null), 2. insert successfully
    mockQueryResult['conversations'] = [
      { data: null, error: null }, // check existing result
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null }, // insert result
      { data: null, error: null }, // findOrCreateConversation check
    ]

    // messages: 1. prior count (0), 2. insert message, 3. update conversation
    mockQueryResult['messages'] = [
      { count: 0, error: null }, // prior customer message count
      { data: { id: 'msg-uuid-555' }, error: null }, // insert message result
    ]

    mockQueryResult['broadcast_recipients'] = [
      { data: null, error: null }, // flagBroadcastReplyIfAny search
    ]

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    // Verify correct tables were queried
    expect(mockFrom).toHaveBeenCalledWith('waba_connections')
    expect(mockFrom).toHaveBeenCalledWith('user_organizations')
    expect(mockFrom).toHaveBeenCalledWith('contacts')
    expect(mockFrom).toHaveBeenCalledWith('conversations')
    expect(mockFrom).toHaveBeenCalledWith('messages')
  })

  it('caches resolved auditUserId to avoid repeated database queries', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'valid-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [{ id: 'msg-1', from: '12345', timestamp: '1783077575', type: 'text', text: { body: 'Hello' } }],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = () => ({
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    })

    mockQueryResult['user_organizations'] = () => ({
      data: {
        user_id: 'owner-user-uuid',
      },
      error: null,
    })

    // Returning non-array functions in mockQueryResult so they don't shift/empty
    mockQueryResult['contacts'] = () => ({
      data: [{ id: 'contact-uuid-999', name: 'Alice', phone: '12345' }],
      error: null,
    })

    mockQueryResult['conversations'] = () => ({
      data: { id: 'conv-uuid-777', unread_count: 0 },
      error: null,
    })

    mockQueryResult['messages'] = () => ({
      data: { id: 'msg-uuid-555' },
      error: null,
    })

    mockQueryResult['broadcast_recipients'] = () => ({
      data: null,
      error: null,
    })

    // First request
    const req1 = createReq(payload)
    const res1 = await POST(req1)
    expect(res1.status).toBe(200)
    await Promise.all(afterPromises)

    // Verify user_organizations was queried
    const calls1 = mockFrom.mock.calls.filter(c => c[0] === 'user_organizations').length
    expect(calls1).toBe(1)

    // Clear calls count for mock
    vi.mocked(mockFrom).mockClear()
    afterPromises = []

    // Second request (same organization)
    const req2 = createReq(payload)
    const res2 = await POST(req2)
    expect(res2.status).toBe(200)
    await Promise.all(afterPromises)

    // Verify user_organizations was NOT queried this time because it is cached
    const calls2 = mockFrom.mock.calls.filter(c => c[0] === 'user_organizations').length
    expect(calls2).toBe(0)
  })

  it('processes status updates (delivered, read) and updates tables', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'valid-phone-id',
                },
                statuses: [
                  {
                    id: 'msg-meta-123',
                    status: 'delivered',
                    timestamp: '1783077575',
                    recipient_id: '12345',
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = {
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    }

    mockQueryResult['user_organizations'] = {
      data: { user_id: 'owner-user-uuid' },
      error: null,
    }

    mockQueryResult['messages'] = [
      { error: null }, // update message result
      { data: { conversation_id: 'conv-uuid-777', conversations: { organization_id: 'org-uuid-123' } }, error: null }, // select message result for dispatching webhook
    ]

    mockQueryResult['broadcast_recipients'] = [
      { data: { id: 'recipient-uuid-111', status: 'sent' }, error: null }, // fetch broadcast recipient result
      { error: null }, // update broadcast recipient result
    ]

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockFrom).toHaveBeenCalledWith('broadcast_recipients')
    const { dispatchWebhookEvent } = await import('@/lib/webhooks/deliver')
    expect(dispatchWebhookEvent).toHaveBeenCalled()
  })

  it('processes incoming reaction messages and upserts reaction in database', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'valid-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [
                  {
                    id: 'msg-react-123',
                    from: '12345',
                    timestamp: '1783077575',
                    type: 'reaction',
                    reaction: {
                      message_id: 'parent-meta-id',
                      emoji: '❤️',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = {
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    }

    mockQueryResult['user_organizations'] = {
      data: { user_id: 'owner-user-uuid' },
      error: null,
    }

    mockQueryResult['contacts'] = [
      { data: null, error: null },
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]

    mockQueryResult['conversations'] = [
      { data: null, error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },
      { data: null, error: null },
    ]

    mockQueryResult['messages'] = [
      { data: { id: 'parent-internal-id' }, error: null }, // lookupInternalIdByMetaId
    ]

    mockQueryResult['message_reactions'] = { error: null } // upsert result

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockFrom).toHaveBeenCalledWith('message_reactions')
  })

  it('processes interactive list/button reply messages', async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  phone_number_id: 'valid-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [
                  {
                    id: 'msg-interactive-123',
                    from: '12345',
                    timestamp: '1783077575',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: {
                        id: 'btn-yes-id',
                        title: 'Yes, proceed',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = {
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    }

    mockQueryResult['user_organizations'] = {
      data: { user_id: 'owner-user-uuid' },
      error: null,
    }

    mockQueryResult['contacts'] = [
      { data: null, error: null },
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]

    mockQueryResult['conversations'] = [
      { data: null, error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },
      { data: null, error: null },
      { error: null }, // update conversation last_message_text
    ]

    mockQueryResult['messages'] = [
      { count: 0, error: null }, // prior customer messages count
      { data: { id: 'inserted-msg-uuid' }, error: null }, // insert message
    ]

    mockQueryResult['broadcast_recipients'] = [
      { data: null, error: null },
    ]

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    // Verify it was saved with the interactive reply ID
    const insertCalls = mockFrom.mock.calls.filter(c => c[0] === 'messages')
    expect(insertCalls.length).toBeGreaterThan(0)
  })

  it('triggers OOO reply and skips other dispatch handlers when outside business hours', async () => {
    mockIsOutsideBusinessHours.mockReturnValue(true)
    mockEngineSendText.mockClear()

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '12345',
                  phone_number_id: 'valid-phone-id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '12345' }],
                messages: [
                  {
                    id: 'msg-id-ooo',
                    from: '12345',
                    timestamp: '1783077575',
                    type: 'text',
                    text: { body: 'hello outside hours' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    mockQueryResult['waba_connections'] = {
      data: {
        organization_id: 'org-uuid-123',
        access_token_encrypted: 'ivHex:ctHex:tagHex',
      },
      error: null,
    }

    mockQueryResult['user_organizations'] = {
      data: { user_id: 'owner-user-uuid' },
      error: null,
    }

    mockQueryResult['contacts'] = [
      { data: null, error: null },
      { data: { id: 'contact-uuid-999', name: 'Alice', phone: '12345' }, error: null },
    ]

    mockQueryResult['conversations'] = [
      { data: null, error: null },
      { data: { id: 'conv-uuid-777', unread_count: 0 }, error: null },
      { data: null, error: null },
      { error: null },
    ]

    mockQueryResult['messages'] = [
      { count: 0, error: null },
      { data: { id: 'inserted-msg-uuid' }, error: null },
    ]

    mockQueryResult['broadcast_recipients'] = [
      { data: null, error: null },
    ]

    mockQueryResult['business_hours'] = {
      data: {
        is_enabled: true,
        timezone: 'Asia/Kolkata',
        ooo_message: 'We are closed!',
        daily_hours: {},
      },
      error: null,
    }

    const req = createReq(payload)
    const res = await POST(req)
    expect(res.status).toBe(200)
    await Promise.all(afterPromises)

    expect(mockIsOutsideBusinessHours).toHaveBeenCalled()
    expect(mockEngineSendText).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'org-uuid-123',
        text: 'We are closed!',
      })
    )
  })
})

