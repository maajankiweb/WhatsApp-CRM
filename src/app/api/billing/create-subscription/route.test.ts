import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock plans.ts
vi.mock('@/lib/billing/plans', () => ({
  getPlanById: (planId: string) => {
    if (planId === 'starter') {
      return {
        plan_id: 'starter',
        name: 'Starter',
        price: 999,
        message_quota: 5000,
        contact_limit: 1000,
        razorpay_plan_id: 'plan_starter_id',
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
const mockCreateCustomer = vi.fn();
const mockCreateSubscription = vi.fn();

vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      customers = {
        create: mockCreateCustomer,
      };
      subscriptions = {
        create: mockCreateSubscription,
      };
    },
  };
});

// Mock Supabase
const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

const mockFrom = vi.fn((_table: string) => {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: mockSingle,
        }),
        single: mockSingle,
      }),
    }),
    update: mockUpdate,
  };
});

mockUpdate.mockImplementation(() => ({
  eq: mockEq,
}));

mockEq.mockImplementation(() => Promise.resolve({ error: null }));

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

describe('POST /api/billing/create-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'key_id_test';
    process.env.RAZORPAY_KEY_SECRET = 'key_secret_test';
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/billing/create-subscription', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = createReq({ organizationId: 'org-123', planId: 'starter' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthenticated');
  });

  it('returns 403 if user is not a member of the organization', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } }); // membership lookup fails
    
    const req = createReq({ organizationId: 'org-123', planId: 'starter' });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Forbidden');
  });

  it('returns 403 if user role is not admin or owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle.mockResolvedValueOnce({ data: { role: 'agent' }, error: null }); // role check

    const req = createReq({ organizationId: 'org-123', planId: 'starter' });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 409 if organization already has a subscription ID configured', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // role check
      .mockResolvedValueOnce({
        data: {
          name: 'Acme Corp',
          razorpay_customer_id: 'cust-123',
          razorpay_subscription_id: 'sub-existing',
        },
        error: null,
      }); // org check

    const req = createReq({ organizationId: 'org-123', planId: 'starter' });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Conflict');
  });

  it('successfully creates customer and subscription', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'user@example.com' } } });
    mockSingle
      .mockResolvedValueOnce({ data: { role: 'owner' }, error: null }) // role check
      .mockResolvedValueOnce({
        data: {
          name: 'Acme Corp',
          razorpay_customer_id: null,
          razorpay_subscription_id: null,
        },
        error: null,
      }); // org check

    mockCreateCustomer.mockResolvedValue({ id: 'cust-new' });
    mockCreateSubscription.mockResolvedValue({ id: 'sub-new', short_url: 'https://rzp.io/i/sub-new' });

    const req = createReq({ organizationId: 'org-123', planId: 'starter' });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.subscriptionId).toBe('sub-new');
    expect(json.shortUrl).toBe('https://rzp.io/i/sub-new');
    expect(json.customerId).toBe('cust-new');

    expect(mockCreateCustomer).toHaveBeenCalledWith({
      name: 'Acme Corp',
      email: 'user@example.com',
    });
    expect(mockCreateSubscription).toHaveBeenCalledWith({
      plan_id: 'plan_starter_id',
      customer_id: 'cust-new',
      total_count: 120,
      quantity: 1,
      notes: {
        organization_id: 'org-123',
        plan_id: 'starter',
      },
    });
    // Check update DB calls
    expect(mockUpdate).toHaveBeenCalledWith({
      razorpay_customer_id: 'cust-new',
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      razorpay_subscription_id: 'sub-new',
    });
  });
});
