import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUsage, checkQuota } from './usage';

// Mock plans.ts
vi.mock('./plans', () => ({
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
      plan_id: 'starter',
      name: 'Starter',
      price: 999,
      message_quota: 5000,
      contact_limit: 1000,
      razorpay_plan_id: 'plan_starter_id',
    };
  },
}));

describe('Billing Usage Helper Functions', () => {
  let mockSupabase: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 42, error: null }),
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockResolvedValue({ count: 1500, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { plan: 'starter' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
  });

  describe('getCurrentUsage', () => {
    it('queries contacts and outbound messages for the organization', async () => {
      const usage = await getCurrentUsage('org-123', mockSupabase as unknown as SupabaseClient);

      expect(usage.totalContacts).toBe(42);
      expect(usage.messagesSent).toBe(1500);

      expect(mockSupabase.from).toHaveBeenCalledWith('contacts');
      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    });
  });

  describe('checkQuota', () => {
    it('allows send_message when quota is not exceeded', async () => {
      const res = await checkQuota('org-123', 'send_message', 50, mockSupabase as unknown as SupabaseClient);

      expect(res.allowed).toBe(true);
      expect(res.current).toBe(1500);
      expect(res.limit).toBe(5000); // Starter quota
      expect(res.reason).toBeUndefined();
    });

    it('rejects send_message when quota is exceeded', async () => {
      // 1500 (current) + 4000 (quantity) = 5500 > 5000 limit
      const res = await checkQuota('org-123', 'send_message', 4000, mockSupabase as unknown as SupabaseClient);

      expect(res.allowed).toBe(false);
      expect(res.current).toBe(1500);
      expect(res.limit).toBe(5000);
      expect(res.reason).toContain('Monthly message quota exceeded');
    });

    it('returns allowed: true with warning for add_contact when contact limit is exceeded (soft limit)', async () => {
      // Setup current contact usage close to limit
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'contacts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 999, error: null }), // limit is 1000
            }),
          };
        }
        if (table === 'messages') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockResolvedValue({ count: 10, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { plan: 'starter' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // 999 (current) + 2 (quantity) = 1001 > 1000 limit
      const res = await checkQuota('org-123', 'add_contact', 2, mockSupabase as unknown as SupabaseClient);

      expect(res.allowed).toBe(true); // allowed is true because it is a soft warning!
      expect(res.warning).toContain('Contact limit reached');
      expect(res.current).toBe(999);
      expect(res.limit).toBe(1000);
    });
  });
});
