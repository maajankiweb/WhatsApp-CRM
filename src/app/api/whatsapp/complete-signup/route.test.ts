import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Supabase client
const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue({ error: null });

const mockFrom = vi.fn((table: string) => {
  if (table === 'user_organizations') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockSingle,
          }),
        }),
      }),
    };
  }
  if (table === 'waba_connections') {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
      upsert: mockUpsert,
    };
  }
  return {};
});

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(mockSupabaseClient),
}));

// Mock fetch calls for Meta token exchange
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto helper
vi.mock('@/lib/crypto', () => ({
  encrypt: (t: string) => `encrypted:${t}`,
}));

describe('POST /api/whatsapp/complete-signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_META_APP_ID = 'test-app-id';
    process.env.META_APP_SECRET = 'test-app-secret';
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  const createReq = (body: unknown) => {
    return new NextRequest('https://app.test/api/whatsapp/complete-signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(createReq({ code: 'code123', organizationId: 'org123' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthenticated');
  });

  it('returns 400 if required parameters are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user123' } } });

    // Missing organizationId
    const res1 = await POST(createReq({ code: 'code123' }));
    expect(res1.status).toBe(400);

    // Missing code
    const res2 = await POST(createReq({ organizationId: 'org123' }));
    expect(res2.status).toBe(400);
  });

  it('returns 403 if user is not a member of the organization', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user123' } } });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const res = await POST(createReq({ code: 'code123', organizationId: 'org123' }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('You do not belong to this organization');
  });

  it('returns 403 if user role is not admin or owner', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user123' } } });
    // User is an agent (not owner/admin)
    mockSingle.mockResolvedValueOnce({ data: { role: 'agent' }, error: null });

    const res = await POST(createReq({ code: 'code123', organizationId: 'org123' }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Only administrators and owners can connect WhatsApp');
  });

  it('succeeds if user is owner and Meta API exchange succeeds', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user123' } } });
    mockSingle.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });

    // Mock token exchange fetches:
    // 1. Short-lived token
    // 2. Long-lived token
    // 3. WABA accounts list
    // 4. Phone numbers list
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'short_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'long_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'waba_id_123' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'phone_number_id_456' }] }),
      });

    const res = await POST(createReq({ code: 'code123', organizationId: 'org123' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('returns 409 if phone_number_id is already connected to a different organization', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user123' } } });
    mockSingle.mockResolvedValueOnce({ data: { role: 'owner' }, error: null });
    // Phone number is already registered to 'different-org-id'
    mockMaybeSingle.mockResolvedValueOnce({
      data: { organization_id: 'different-org-id' },
      error: null,
    });

    // Mock token exchange fetches:
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'short_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'long_access_token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'waba_id_123' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'phone_number_id_456' }] }),
      });

    const res = await POST(createReq({ code: 'code123', organizationId: 'org123' }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('already connected to a different organization');
  });
});
