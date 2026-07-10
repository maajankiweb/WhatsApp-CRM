import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { findExistingContact } from '@/lib/contacts/dedupe';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';

vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/contacts/dedupe', () => ({
  findExistingContact: vi.fn(),
}));

vi.mock('@/lib/whatsapp/send-message', () => ({
  sendMessageToConversation: vi.fn(),
}));

const makeChainableMock = (data: any) => {
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    insert: vi.fn().mockImplementation(() => chain),
  };
  return chain;
};

describe('POST /api/integrations/shopify/webhook', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);
  });

  const createReq = (topic: string, body: unknown, orgId: string = 'org-123') => {
    return new Request(`https://app.test/api/integrations/shopify/webhook?org_id=${orgId}`, {
      method: 'POST',
      headers: {
        'x-shopify-topic': topic,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  it('returns 400 if org_id is missing', async () => {
    const req = new Request('https://app.test/api/integrations/shopify/webhook', {
      method: 'POST',
      headers: { 'x-shopify-topic': 'checkouts/create' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('org_id is required');
  });

  it('triggers cart recovery for abandoned checkout when enabled', async () => {
    const mockConfig = {
      abandoned_cart_enabled: true,
      abandoned_cart_message: 'Hi {{name}}, cart value {{total_price}} at {{checkout_url}}',
      tracking_alerts_enabled: false,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ecommerce_integrations') {
        return makeChainableMock(mockConfig);
      }
      if (table === 'conversations') {
        return makeChainableMock({ id: 'conv-999' });
      }
      return makeChainableMock({});
    });

    vi.mocked(findExistingContact).mockResolvedValue({ id: 'contact-777' } as any);

    const payload = {
      phone: '+919999999999',
      customer: { first_name: 'John', last_name: 'Doe' },
      abandoned_checkout_url: 'https://shopify.com/checkout/1',
      total_price: '500.00',
      completed_at: null,
    };

    const req = createReq('checkouts/create', payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Recovery notification sent');

    expect(sendMessageToConversation).toHaveBeenCalledWith(mockSupabase, 'org-123', {
      conversationId: 'conv-999',
      messageType: 'text',
      contentText: 'Hi John, cart value 500.00 at https://shopify.com/checkout/1',
    });
  });

  it('skips cart recovery if checkout is already completed', async () => {
    const mockConfig = {
      abandoned_cart_enabled: true,
      abandoned_cart_message: 'Hi {{name}}',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ecommerce_integrations') {
        return makeChainableMock(mockConfig);
      }
      return makeChainableMock({});
    });

    const payload = {
      phone: '+919999999999',
      completed_at: '2026-07-08T12:00:00Z',
    };

    const req = createReq('checkouts/update', payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Checkout already completed');
    expect(sendMessageToConversation).not.toHaveBeenCalled();
  });
});
