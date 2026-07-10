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

describe('POST /api/integrations/woocommerce/webhook', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);
  });

  const createReq = (body: unknown, orgId: string = 'org-123') => {
    return new Request(`https://app.test/api/integrations/woocommerce/webhook?org_id=${orgId}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  it('triggers cart recovery for WooCommerce payload', async () => {
    const mockConfig = {
      abandoned_cart_enabled: true,
      abandoned_cart_message: 'Hi {{name}}, complete order here {{checkout_url}}',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ecommerce_integrations') {
        return makeChainableMock(mockConfig);
      }
      if (table === 'conversations') {
        return makeChainableMock({ id: 'conv-111' });
      }
      return makeChainableMock({});
    });

    vi.mocked(findExistingContact).mockResolvedValue({ id: 'contact-222' } as any);

    const payload = {
      billing: {
        phone: '9988776655',
        first_name: 'Jane',
        last_name: 'Smith',
      },
      checkout_url: 'https://my-woo-store.com/checkout?id=5',
      total: '1200.00',
    };

    const req = createReq(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('WooCommerce Recovery notification sent');

    expect(sendMessageToConversation).toHaveBeenCalledWith(mockSupabase, 'org-123', {
      conversationId: 'conv-111',
      messageType: 'text',
      contentText: 'Hi Jane, complete order here https://my-woo-store.com/checkout?id=5',
    });
  });
});
