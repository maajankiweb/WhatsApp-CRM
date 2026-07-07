import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@/lib/supabase/server';
import { getPlanById } from '@/lib/billing/plans';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // 2. Parse and validate request parameters
    const body = (await request.json().catch(() => null)) as unknown;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { organizationId, planId } = body as Record<string, string>;
    if (!organizationId || !planId) {
      return NextResponse.json(
        { error: 'Missing required parameters: organizationId, planId' },
        { status: 400 }
      );
    }

    // 3. Verify user membership & owner/admin role in the organization
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

    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only owners and administrators can manage billing.' },
        { status: 403 }
      );
    }

    // 4. Retrieve organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('plan, subscription_status, razorpay_subscription_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('[Change Plan] Organization fetch failed:', orgError);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 4.5. Check if subscription is active and can be modified
    if (!org.razorpay_subscription_id || org.subscription_status === 'canceled') {
      return NextResponse.json(
        { error: 'Bad Request: No active subscription found to modify. Create a new subscription first.' },
        { status: 400 }
      );
    }

    // 5. Retrieve and validate plan configurations
    const plan = getPlanById(planId);
    if (!plan || plan.plan_id === 'free') {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const razorpayPlanId = plan.razorpay_plan_id;
    if (!razorpayPlanId) {
      console.error(`[Change Plan] Razorpay plan ID is not set for plan tier: ${planId}`);
      return NextResponse.json(
        { error: `Plan tier '${planId}' is not configured on this server.` },
        { status: 500 }
      );
    }

    // 6. Verify server keys for Razorpay
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error('[Change Plan] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.');
      return NextResponse.json(
        { error: 'Razorpay integration is not configured on the server.' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 7. Call Razorpay API to update subscription plan
    let updatedSubscription: { id: string };
    try {
      updatedSubscription = (await razorpay.subscriptions.update(
        org.razorpay_subscription_id,
        {
          plan_id: razorpayPlanId,
          schedule_change_at: 'cycle_end',
          notes: {
            organization_id: organizationId,
            plan_id: planId,
          },
        } as unknown as Parameters<typeof razorpay.subscriptions.update>[1]
      )) as unknown as { id: string };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Change Plan] Razorpay subscription update failed:', err);
      return NextResponse.json(
        { error: `Razorpay subscription update failed: ${errMsg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      scheduleChangeAt: 'cycle_end',
    });

  } catch (err) {
    console.error('[Change Plan] Unhandled API error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
