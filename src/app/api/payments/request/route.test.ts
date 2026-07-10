import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireRole } from '@/lib/auth/account';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import { decrypt } from '@/lib/whatsapp/encryption';
import Razorpay from 'razorpay';

vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(),
  toErrorResponse: (err: any) => {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: err.status || 500 });
  },
}));

vi.mock('@/lib/whatsapp/send-message', () => ({
  sendMessageToConversation: vi.fn(),
}));

vi.mock('@/lib/whatsapp/encryption', () => ({
  decrypt: vi.fn().mockReturnValue('mock-decrypted-secret'),
}));

const mockCreatePaymentLink = vi.fn();
vi.mock('razorpay', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.paymentLink = {
        create: mockCreatePaymentLink,
      };
    }),
  };
});

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

describe('POST /api/payments/request', () => {
  const mockSupabase = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireRole).mockResolvedValue({
      supabase: mockSupabase as any,
      accountId: 'org-abc',
      userId: 'user-xyz',
      role: 'agent',
      account: { id: 'org-abc', name: 'Test Org' },
    });
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/payments/request', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('generates a UPI QR code request successfully', async () => {
    const mockConv = {
      id: 'conv-123',
      contact_id: 'contact-456',
      contact: { phone: '+919876543210', name: 'Albin' },
    };

    const mockSettings = {
      upi_vpa: 'test@upi',
      upi_name: 'Test Store',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'conversations') {
        return makeChainableMock(mockConv);
      }
      if (table === 'payment_settings') {
        return makeChainableMock(mockSettings);
      }
      if (table === 'payment_requests') {
        return makeChainableMock({ id: 'req-999' });
      }
      return makeChainableMock({});
    });

    const req = createReq({
      conversation_id: 'conv-123',
      amount: 150.50,
      description: 'Consultation fee',
      method: 'upi',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.payment_request_id).toBe('req-999');

    expect(sendMessageToConversation).toHaveBeenCalledWith(mockSupabase, 'org-abc', {
      conversationId: 'conv-123',
      messageType: 'image',
      mediaUrl: expect.stringContaining('upi%3A%2F%2Fpay'),
      contentText: expect.stringContaining('₹150.50'),
    });
  });

  it('generates a Razorpay payment link request successfully', async () => {
    const mockConv = {
      id: 'conv-123',
      contact_id: 'contact-456',
      contact: { phone: '+919876543210', name: 'Albin' },
    };

    const mockSettings = {
      razorpay_key_id: 'rzp_id_123',
      razorpay_key_secret: 'encrypted_secret_xyz',
    };

    mockCreatePaymentLink.mockResolvedValue({
      id: 'plink_987',
      short_url: 'https://rzp.io/i/abc',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'conversations') {
        return makeChainableMock(mockConv);
      }
      if (table === 'payment_settings') {
        return makeChainableMock(mockSettings);
      }
      if (table === 'payment_requests') {
        return makeChainableMock({ id: 'req-888' });
      }
      return makeChainableMock({});
    });

    const req = createReq({
      conversation_id: 'conv-123',
      amount: 450,
      description: 'Premium subscription',
      method: 'razorpay',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.payment_request_id).toBe('req-888');

    expect(mockCreatePaymentLink).toHaveBeenCalledWith(expect.objectContaining({
      amount: 45000,
      currency: 'INR',
      description: 'Premium subscription',
    }));

    expect(sendMessageToConversation).toHaveBeenCalledWith(mockSupabase, 'org-abc', {
      conversationId: 'conv-123',
      messageType: 'text',
      contentText: expect.stringContaining('https://rzp.io/i/abc'),
    });
  });
});
