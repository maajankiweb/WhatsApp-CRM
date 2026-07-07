import { createClient as createServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getPlanById } from './plans';

export interface UsageReport {
  messagesSent: number;
  totalContacts: number;
}

/**
 * Calculates current outbound message usage and contact count for an organization.
 * Counts messages sent during the current calendar month that did not fail.
 */
export async function getCurrentUsage(
  organizationId: string,
  supabaseClient?: SupabaseClient
): Promise<UsageReport> {
  // Use passed client (e.g. admin client) or default to the authenticated server client
  const supabase = supabaseClient || (await createServerClient());

  // 1. Count contacts in the organization
  const { count: contactsCount, error: contactsError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (contactsError) {
    console.error('[getCurrentUsage] Contacts fetch error:', contactsError);
  }

  // 2. Count outbound messages this calendar month (excluding failed)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count: messagesCount, error: messagesError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('sender_type', ['agent', 'bot'])
    .neq('status', 'failed')
    .gte('created_at', startOfMonth);

  if (messagesError) {
    console.error('[getCurrentUsage] Messages fetch error:', messagesError);
  }

  return {
    messagesSent: messagesCount || 0,
    totalContacts: contactsCount || 0,
  };
}

/**
 * Checks if an action is allowed based on the organization's plan limits.
 * Outbound message sends are hard-blocked at the limit.
 * Contact additions return allowed=true with a warning string (soft warning).
 *
 * NOTE: This function uses a check-then-act pattern (TOCTOU) and is prone
 * to race conditions if concurrent requests are initiated simultaneously.
 * For v1 this is an acceptable trade-off (allowing minor overshoots), but 
 * for strict transactional enforcement, consider Postgres advisory locking 
 * or an atomic counter update strategy.
 */
export async function checkQuota(
  organizationId: string,
  action: 'send_message' | 'add_contact',
  quantity = 1,
  supabaseClient?: SupabaseClient
): Promise<{
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  warning?: string;
}> {
  const supabase = supabaseClient || (await createServerClient());
  const usage = await getCurrentUsage(organizationId, supabase);

  // Fetch organization plan tier
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    console.error('[checkQuota] Organization lookup failed:', orgError);
    throw new Error('Organization not found');
  }

  const planId = org.plan || 'free';
  const plan = getPlanById(planId);

  if (action === 'send_message') {
    const current = usage.messagesSent;
    const limit = plan.message_quota;
    if (current + quantity > limit) {
      return {
        allowed: false,
        reason: `Monthly message quota exceeded. Your current usage is ${current}/${limit} and this action requires sending ${quantity} messages. Please upgrade your plan.`,
        current,
        limit,
      };
    }
    return { allowed: true, current, limit };
  } else {
    // add_contact
    const current = usage.totalContacts;
    const limit = plan.contact_limit;
    if (current + quantity > limit) {
      return {
        allowed: true, // soft warning
        warning: `Contact limit reached (${current}/${limit}). Storing new contacts will continue to work, but please upgrade your plan to stay fully compliant.`,
        current,
        limit,
      };
    }
    return { allowed: true, current, limit };
  }
}
