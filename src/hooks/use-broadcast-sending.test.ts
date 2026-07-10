import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useBroadcastSending } from './use-broadcast-sending';
import { createClient } from '@/lib/supabase/client';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn().mockReturnValue({ accountId: 'org-123' }),
}));

// Mock React's useState to avoid @testing-library/react dependency
vi.mock('react', () => ({
  useState: (initial: any) => [initial, vi.fn()],
}));

const makeChainableMock = (data: any) => {
  const chain: any = {
    select: vi.fn().mockImplementation(() => chain),
    in: vi.fn().mockImplementation(() => chain),
    eq: vi.fn().mockImplementation(() => chain),
    neq: vi.fn().mockImplementation(() => chain),
    gte: vi.fn().mockImplementation(() => chain),
    lt: vi.fn().mockImplementation(() => chain),
    order: vi.fn().mockImplementation(() => chain),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    insert: vi.fn().mockImplementation(() => chain),
  };
  chain.then = (onfulfilled: any) => Promise.resolve({ data, error: null }).then(onfulfilled);
  return chain;
};

describe('useBroadcastSending - Dynamic Segment Resolution', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-777' } } },
        error: null,
      }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  it('resolves contacts filtered by active deal stage', async () => {
    const mockDeals = [{ contact_id: 'contact-abc' }];
    const mockContacts = [{ id: 'contact-abc', name: 'John Doe', phone: '+919999999999' }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'deals') {
        return makeChainableMock(mockDeals);
      }
      if (table === 'contacts') {
        return makeChainableMock(mockContacts);
      }
      return makeChainableMock([]);
    });

    const result = useBroadcastSending();
    const mockTemplate = { name: 'test_template', language: 'en_US' };
    const payload = {
      name: 'Test Segment Campaign',
      template: mockTemplate as any,
      audience: {
        type: 'segment' as const,
        segment: {
          pipelineStageId: 'stage-lead-uuid',
        },
      },
      variables: {},
    };

    await expect(result.createAndSendBroadcast(payload)).rejects.toThrow();

    expect(mockSupabase.from).toHaveBeenCalledWith('deals');
    expect(mockSupabase.from).toHaveBeenCalledWith('contacts');
  });

  it('resolves contacts filtered by idle duration', async () => {
    const mockActiveConvs = [{ contact_id: 'contact-recent' }];
    const mockContactsList = [{ id: 'contact-idle' }, { id: 'contact-recent' }];
    const mockContactsMatch = [{ id: 'contact-idle', name: 'Idle Contact', phone: '+918888888888' }];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'conversations') {
        return makeChainableMock(mockActiveConvs);
      }
      if (table === 'contacts') {
        const isFirstCall = mockSupabase.from.mock.calls.filter(([t]) => t === 'contacts').length === 1;
        return makeChainableMock(isFirstCall ? mockContactsList : mockContactsMatch);
      }
      return makeChainableMock([]);
    });

    const result = useBroadcastSending();
    const payload = {
      name: 'Test Idle Segment Campaign',
      template: { name: 'test_template', language: 'en' } as any,
      audience: {
        type: 'segment' as const,
        segment: {
          idleDays: 7,
        },
      },
      variables: {},
    };

    await expect(result.createAndSendBroadcast(payload)).rejects.toThrow();

    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    expect(mockSupabase.from).toHaveBeenCalledWith('contacts');
  });
});
