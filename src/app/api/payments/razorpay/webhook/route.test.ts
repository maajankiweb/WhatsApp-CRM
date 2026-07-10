import { describe, expect, it, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { POST } from './route';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';

vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('mock-decrypted-secret'),
}));

describe('POST /api/payments/razorpay/webhook', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabaseAdmin).mockReturnValue(mockSupabase as any);
  });

  const createReq = (body: unknown, secret: string = 'mock-decrypted-secret', orgId: string = 'org-123') => {
    const bodyStr = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    return new Request(`https://app.test/api/payments/razorpay/webhook?org_id=${orgId}`, {
      method: 'POST',
      headers: {
        'x-razorpay-signature': signature,
        'content-type': 'application/json',
      },
      body: bodyStr,
    });
  };

  it('rejects with 400 if signature is mismatch', async () => {
    const mockSettings = {
      razorpay_key_secret: 'encrypted_secret',
    };
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: mockSettings, error: null }),
        }),
      }),
    });

    const req = createReq({ event: 'payment.captured' }, 'wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Signature mismatch');
  });

  it('settles invoice and appends message on payment_link.paid event', async () => {
    const mockSettings = {
      razorpay_key_secret: 'encrypted_secret',
    };

    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn() });
    const mockInsert = vi.fn().mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: 'msg-123' }, error: null }) }) });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'payment_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockSettings, error: null }),
            }),
          }),
        };
      }
      if (table === 'payment_requests' || table === 'conversations') {
        return { update: mockUpdate };
      }
      if (table === 'messages') {
        return { insert: mockInsert };
      }
      return {};
    });

    const payload = {
      event: 'payment_link.paid',
      payload: {
        payment_link: {
          entity: {
            id: 'plink_abc123',
            amount: 50000, // 500 INR in paise
            description: 'Monthly service retainer',
            notes: {
              organization_id: 'org-123',
              conversation_id: 'conv-999',
              contact_id: 'contact-777',
            },
          },
        },
      },
    };

    const req = createReq(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('Payment recorded and settled');

    // Verify messages insertion
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: 'org-123',
      conversation_id: 'conv-999',
      contact_id: 'contact-777',
      direction: 'outbound',
      content_text: expect.stringContaining('₹500.00'),
    }));
  });
});
