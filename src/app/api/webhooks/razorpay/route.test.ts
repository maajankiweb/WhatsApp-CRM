import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { POST } from './route';

// Mock Razorpay SDK
const mockFetchSubscription = vi.fn();
vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      subscriptions = {
        fetch: mockFetchSubscription,
      };
    },
  };
});

// Mock Supabase admin client
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => {
  return {
    update: mockUpdate,
  };
});

mockUpdate.mockImplementation(() => ({
  eq: mockEq,
}));

mockEq.mockImplementation(() => Promise.resolve({ error: null }));

const mockAdminClient = {
  from: mockFrom,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockAdminClient,
}));

describe('POST /api/webhooks/razorpay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'key_id_test';
    process.env.RAZORPAY_KEY_SECRET = 'key_secret_test';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  });

  const createReq = (body: unknown, signature: string | null = null) => {
    const rawBody = JSON.stringify(body);
    const sig =
      signature ||
      crypto
        .createHmac('sha256', 'webhook_secret_test')
        .update(rawBody)
        .digest('hex');

    return new NextRequest('https://app.test/api/webhooks/razorpay', {
      method: 'POST',
      body: rawBody,
      headers: {
        'x-razorpay-signature': sig,
      },
    });
  };

  it('returns 403 if signature header is missing', async () => {
    const req = new NextRequest('https://app.test/api/webhooks/razorpay', {
      method: 'POST',
      body: JSON.stringify({ event: 'subscription.activated' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden: Missing signature');
  });

  it('returns 403 if signature mismatch', async () => {
    const req = createReq({ event: 'subscription.activated' }, 'invalid-signature');
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden: Invalid signature');
  });

  it('bypasses unknown event types and returns 200', async () => {
    const req = createReq({ event: 'payment.captured' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockFetchSubscription).not.toHaveBeenCalled();
  });

  it('updates organization to active on subscription.activated', async () => {
    const eventBody = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub-123',
          },
        },
      },
    };

    mockFetchSubscription.mockResolvedValue({
      id: 'sub-123',
      notes: {
        organization_id: 'org-123',
        plan_id: 'starter',
      },
    });

    const req = createReq(eventBody);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockFetchSubscription).toHaveBeenCalledWith('sub-123');
    expect(mockFrom).toHaveBeenCalledWith('organizations');
    expect(mockUpdate).toHaveBeenCalledWith({
      subscription_status: 'active',
      razorpay_subscription_id: 'sub-123',
      plan: 'starter',
    });
  });

  it('skips plan update and logs warning if plan_id is missing on subscription.activated', async () => {
    const eventBody = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub-123',
          },
        },
      },
    };

    mockFetchSubscription.mockResolvedValue({
      id: 'sub-123',
      notes: {
        organization_id: 'org-123',
      },
    });

    const req = createReq(eventBody);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({
      subscription_status: 'active',
      razorpay_subscription_id: 'sub-123',
    });
  });

  it('updates organization to past_due on subscription.halted', async () => {
    const eventBody = {
      event: 'subscription.halted',
      payload: {
        subscription: {
          entity: {
            id: 'sub-123',
          },
        },
      },
    };

    mockFetchSubscription.mockResolvedValue({
      id: 'sub-123',
      notes: {
        organization_id: 'org-123',
      },
    });

    const req = createReq(eventBody);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({
      subscription_status: 'past_due',
      razorpay_subscription_id: 'sub-123',
    });
  });

  it('updates organization to canceled on subscription.cancelled', async () => {
    const eventBody = {
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: 'sub-123',
          },
        },
      },
    };

    mockFetchSubscription.mockResolvedValue({
      id: 'sub-123',
      notes: {
        organization_id: 'org-123',
      },
    });

    const req = createReq(eventBody);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({
      subscription_status: 'canceled',
      razorpay_subscription_id: 'sub-123',
    });
  });
});
