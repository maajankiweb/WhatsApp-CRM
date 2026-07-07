import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// Lazy-initialized admin Supabase client to bypass RLS for webhook updates
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: ReturnType<typeof createClient<any>> | null = null;
function getAdminClient() {
  if (!_adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase webhook configuration (URL/Service Role Key)');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _adminClient = createClient<any>(supabaseUrl, serviceRoleKey);
  }
  return _adminClient;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw body and signature header BEFORE parsing JSON
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on the server.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      console.warn('[Razorpay Webhook] Rejected: missing signature header.');
      return NextResponse.json({ error: 'Forbidden: Missing signature' }, { status: 403 });
    }

    // 2. Validate webhook signature via HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('[Razorpay Webhook] Rejected: signature mismatch.');
      return NextResponse.json({ error: 'Forbidden: Invalid signature' }, { status: 403 });
    }

    // 3. Parse validated JSON body
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const event = body.event as string;

    // Handle only subscription events
    if (!event || !event.startsWith('subscription.')) {
      return NextResponse.json({ received: true });
    }

    const payload = body.payload as Record<string, Record<string, Record<string, unknown>>> | undefined;
    const subscriptionEntity = payload?.subscription?.entity;
    if (!subscriptionEntity || !subscriptionEntity.id) {
      return NextResponse.json({ error: 'Bad request: Invalid subscription payload structure' }, { status: 400 });
    }

    const subscriptionId = subscriptionEntity.id as string;

    // 4. Verify Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error('[Razorpay Webhook] Razorpay keys not configured.');
      return NextResponse.json({ error: 'Internal server error: keys missing' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    let subscription: { id: string; notes?: Record<string, string> };
    try {
      subscription = (await razorpay.subscriptions.fetch(subscriptionId)) as { id: string; notes?: Record<string, string> };
    } catch (err) {
      console.error(`[Razorpay Webhook] Failed to fetch subscription ${subscriptionId} from Razorpay API:`, err);
      return NextResponse.json({ error: 'Subscription not found on Razorpay' }, { status: 404 });
    }

    const notes = subscription.notes;
    const orgId = notes?.organization_id;
    const planId = notes?.plan_id;

    if (!orgId) {
      console.error(`[Razorpay Webhook] No organization_id found in notes of subscription ${subscriptionId}`);
      return NextResponse.json({ error: 'Invalid subscription context: missing organization_id' }, { status: 400 });
    }

    // 6. Initialize Supabase Admin client
    let admin;
    try {
      admin = getAdminClient();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Razorpay Webhook] Admin Supabase init failed:', errMsg);
      return NextResponse.json({ error: 'Server initialization error' }, { status: 500 });
    }

    // 7. Update organization status depending on the subscription event
    console.log(`[Razorpay Webhook] Processing event '${event}' for organization ${orgId}, plan: ${planId}`);

    if (event === 'subscription.activated' || event === 'subscription.charged') {
      const updatePayload: Record<string, string> = {
        subscription_status: 'active',
        razorpay_subscription_id: subscriptionId,
      };

      if (planId) {
        updatePayload.plan = planId;
      } else {
        console.warn(`[Razorpay Webhook] Missing plan_id in notes for subscription ${subscriptionId}. Skipping plan update.`);
      }

      const { error } = await admin.from('organizations')
        .update(updatePayload)
        .eq('id', orgId);

      if (error) {
        console.error(`[Razorpay Webhook] Database update failed for org ${orgId} (active):`, error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    } else if (event === 'subscription.halted') {
      const { error } = await admin.from('organizations')
        .update({
          subscription_status: 'past_due',
          razorpay_subscription_id: subscriptionId,
        })
        .eq('id', orgId);

      if (error) {
        console.error(`[Razorpay Webhook] Database update failed for org ${orgId} (past_due):`, error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    } else if (event === 'subscription.cancelled' || event === 'subscription.canceled') {
      const { error } = await admin.from('organizations')
        .update({
          subscription_status: 'canceled',
          razorpay_subscription_id: subscriptionId,
        })
        .eq('id', orgId);

      if (error) {
        console.error(`[Razorpay Webhook] Database update failed for org ${orgId} (canceled):`, error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('[Razorpay Webhook] Uncaught webhook handler error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
