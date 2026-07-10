import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock plans.ts
vi.mock('@/lib/billing/plans', () => ({
  getPlanById: (planId: string) => {
    if (planId === 'pro') {
      return {
        plan_id: 'pro',
        name: 'Pro',
        price: 1999,
        message_quota: 50000,
        contact_limit: 10000,
        razorpay_plan_id: 'plan_pro_id',
      };
    }
    return {
      plan_id: 'free',
      name: 'Free Trial',
      price: 0,
      message_quota: 100,
      contact_limit: 100,
      razorpay_plan_id: undefined,
    };
  },
}));

// Mock Razorpay SDK
const mockUpdateSubscription = vi.fn();

vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      subscriptions = {
        update: mockUpdateSubscription,
      };
    },
  };
});

// Mock Supabase
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: mockSingle,
        }),
        single: mockSingle,
      }),
    }),
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

describe('POST /api/billing/change-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'key_id_test';
    process.env.RAZORPAY_KEY_SECRET = 'key_secret_test';
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/billing/change-plan', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = createReq({ organizationId: 'org-123', planId: 'pro' });
    const res = await POST(req, undefined);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthenticated');
  });

  it('returns 403 if user is not a member of the organization', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } }); // membership lookup fails
    
    const req = createReq({ organizationId: 'org-123', planId: 'pro' });
    const res = await POST(req, undefined);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('returns 403 if user role is not admin or owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle.mockResolvedValueOnce({ data: { role: 'agent' }, error: null }); // role check

    const req = createReq({ organizationId: 'org-123', planId: 'pro' });
    const res = await POST(req, undefined);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 400 if organization has no active subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // role check
      .mockResolvedValueOnce({
        data: {
          plan: 'free',
          subscription_status: 'trialing',
          razorpay_subscription_id: null,
        },
        error: null,
      }); // org check

    const req = createReq({ organizationId: 'org-123', planId: 'pro' });
    const res = await POST(req, undefined);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No active subscription found');
  });

  it('successfully schedules plan update on Razorpay', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // role check
      .mockResolvedValueOnce({
        data: {
          plan: 'starter',
          subscription_status: 'active',
          razorpay_subscription_id: 'sub-active-123',
        },
        error: null,
      }); // org check

    mockUpdateSubscription.mockResolvedValue({ id: 'sub-active-123' });

    const req = createReq({ organizationId: 'org-123', planId: 'pro' });
    const res = await POST(req, undefined);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.subscriptionId).toBe('sub-active-123');
    expect(json.scheduleChangeAt).toBe('cycle_end');

    expect(mockUpdateSubscription).toHaveBeenCalledWith('sub-active-123', {
      plan_id: 'plan_pro_id',
      schedule_change_at: 'cycle_end',
      notes: {
        organization_id: 'org-123',
        plan_id: 'pro',
      },
    });
  });
});
