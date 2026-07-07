import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsage } from '@/lib/billing/usage';
import { getPlanById } from '@/lib/billing/plans';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // 2. Parse organization ID from query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: organizationId' },
        { status: 400 }
      );
    }

    // 3. Verify user is a member of the organization (any role is allowed to view usage)
    const { data: member, error: memberError } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Forbidden: You do not belong to this organization.' },
        { status: 403 }
      );
    }

    // 4. Fetch usage counts
    const usage = await getCurrentUsage(organizationId, supabase);

    // 5. Fetch organization plan details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('[Usage API] Organization lookup failed:', orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const planId = org.plan || 'free';
    const plan = getPlanById(planId);

    // 6. Return response
    return NextResponse.json({
      messagesSent: usage.messagesSent,
      messageLimit: plan.message_quota,
      totalContacts: usage.totalContacts,
      contactLimit: plan.contact_limit,
      planName: plan.name,
      unlimited: plan.unlimited || false,
    });

  } catch (err) {
    console.error('[Usage API] Unhandled error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
