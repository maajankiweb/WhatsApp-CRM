import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

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

// Mock usage.ts helpers
vi.mock('@/lib/billing/usage', () => ({
  getCurrentUsage: () =>
    Promise.resolve({
      messagesSent: 1200,
      totalContacts: 450,
    }),
}));

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

describe('GET /api/billing/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createReq = (orgId: string | null) => {
    const url = orgId
      ? `https://app.test/api/billing/usage?organizationId=${orgId}`
      : 'https://app.test/api/billing/usage';
    return new NextRequest(url, { method: 'GET' });
  };

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = createReq('org-123');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthenticated');
  });

  it('returns 400 if organizationId is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    const req = createReq(null);
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing required query parameter');
  });

  it('returns 403 if user is not a member of the organization', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const req = createReq('org-123');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('returns 200 with usage details on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'agent' }, error: null }) // membership check
      .mockResolvedValueOnce({ data: { plan: 'pro' }, error: null }); // organization plan lookup

    const req = createReq('org-123');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.messagesSent).toBe(1200);
    expect(json.messageLimit).toBe(50000);
    expect(json.totalContacts).toBe(450);
    expect(json.contactLimit).toBe(10000);
    expect(json.planName).toBe('Pro');
    expect(json.unlimited).toBe(false);
  });
});
