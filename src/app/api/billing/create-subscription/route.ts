import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@/lib/supabase/server';
import { getPlanById } from '@/lib/billing/plans';
import { withErrorHandler } from '@/lib/api/error-handler';

export const POST = withErrorHandler(async (request: Request) => {
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

  // 4. Retrieve organization details (including subscription status and ID)
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('name, razorpay_customer_id, razorpay_subscription_id')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    console.error('[Create Subscription] Organization fetch failed:', orgError);
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // 4.5. Prevent duplicate subscriptions
  if (org.razorpay_subscription_id) {
    return NextResponse.json(
      { error: 'Conflict: This organization already has an active or pending subscription.' },
      { status: 409 }
    );
  }

  // 5. Retrieve and validate plan configurations
  const plan = getPlanById(planId);
  if (!plan || plan.plan_id === 'free') {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
  }

  const razorpayPlanId = plan.razorpay_plan_id;
  if (!razorpayPlanId) {
    console.error(`[Create Subscription] Razorpay plan ID is not set for plan tier: ${planId}`);
    return NextResponse.json(
      { error: `Plan tier '${planId}' is not configured on this server.` },
      { status: 500 }
    );
  }

  // 6. Verify server keys for Razorpay
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error('[Create Subscription] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.');
    return NextResponse.json(
      { error: 'Razorpay integration is not configured on the server.' },
      { status: 500 }
    );
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // 7. Create or reuse Razorpay Customer
  let customerId = org.razorpay_customer_id;
  if (!customerId) {
    try {
      const customer = (await razorpay.customers.create({
        name: org.name,
        email: user.email || undefined,
      } as unknown as Parameters<typeof razorpay.customers.create>[0])) as unknown as { id: string };
      customerId = customer.id;

      // Save customer ID immediately to prevent duplicates on subsequent retries
      const { error: customerUpdateError } = await supabase
        .from('organizations')
        .update({ razorpay_customer_id: customerId })
        .eq('id', organizationId);

      if (customerUpdateError) {
        console.error('[Create Subscription] Failed to save customer ID in database:', customerUpdateError);
        return NextResponse.json(
          { error: 'Failed to update organization customer billing context.' },
          { status: 500 }
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Create Subscription] Razorpay customer creation failed:', err);
      return NextResponse.json(
        { error: `Razorpay customer creation failed: ${errMsg}` },
        { status: 500 }
      );
    }
  }

  // 8. Create Razorpay Subscription with metadata mapping
  let subscription: { id: string; short_url: string };
  try {
    subscription = (await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_id: customerId,
      total_count: 120, // 10 years of monthly billing cycles
      quantity: 1,
      notes: {
        organization_id: organizationId,
        plan_id: planId,
      },
    } as unknown as Parameters<typeof razorpay.subscriptions.create>[0])) as unknown as { id: string; short_url: string };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Create Subscription] Razorpay subscription creation failed:', err);
    return NextResponse.json(
      { error: `Razorpay subscription creation failed: ${errMsg}` },
      { status: 500 }
    );
  }

  // 8.5. Save subscription ID back to the organization table
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      razorpay_subscription_id: subscription.id,
    })
    .eq('id', organizationId);

  if (updateError) {
    console.error('[Create Subscription] Failed to save subscription ID in database:', updateError);
    return NextResponse.json(
      { error: 'Failed to update organization billing context.' },
      { status: 500 }
    );
  }

  // 9. Return subscription and checkout settings
  return NextResponse.json({
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url,
    keyId,
    customerId,
  });
});
