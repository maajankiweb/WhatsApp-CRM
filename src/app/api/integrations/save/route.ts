import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { encrypt } from '@/lib/whatsapp/encryption';

/**
 * POST /api/integrations/save
 *
 * Saves ecommerce or payment settings securely. Encrypts sensitive credentials
 * on the server before writing to the database.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin');

    const body = await request.json().catch(() => null);
    if (!body || !body.type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    const { type, data } = body;

    if (type === 'ecommerce') {
      // Load current integration to see if we should skip overwriting access token
      const { data: current } = await supabase
        .from('ecommerce_integrations')
        .select('shopify_access_token, woocommerce_consumer_secret')
        .eq('organization_id', accountId)
        .maybeSingle();

      let shopifyToken = data.shopify_access_token;
      if (shopifyToken === '••••••••••••') {
        shopifyToken = current?.shopify_access_token || '';
      } else if (shopifyToken) {
        shopifyToken = encrypt(shopifyToken);
      }

      let wooSecret = data.woocommerce_consumer_secret;
      if (wooSecret === '••••••••••••') {
        wooSecret = current?.woocommerce_consumer_secret || '';
      } else if (wooSecret) {
        wooSecret = encrypt(wooSecret);
      }

      const { error } = await supabase.from('ecommerce_integrations').upsert({
        organization_id: accountId,
        shopify_shop_url: data.shopify_shop_url || null,
        shopify_access_token: shopifyToken || null,
        woocommerce_store_url: data.woocommerce_store_url || null,
        woocommerce_consumer_key: data.woocommerce_consumer_key || null,
        woocommerce_consumer_secret: wooSecret || null,
        abandoned_cart_enabled: !!data.abandoned_cart_enabled,
        abandoned_cart_message: data.abandoned_cart_message || 'Hi {{name}}, we noticed you left items in your cart. Complete your purchase here: {{checkout_url}}',
        tracking_alerts_enabled: !!data.tracking_alerts_enabled,
        tracking_message: data.tracking_message || 'Hi {{name}}, your order has been shipped! Tracking number: {{tracking_number}}',
      }, { onConflict: 'organization_id' });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (type === 'payment') {
      // Load current settings to check secret key
      const { data: current } = await supabase
        .from('payment_settings')
        .select('razorpay_key_secret')
        .eq('organization_id', accountId)
        .maybeSingle();

      let rzpSecret = data.razorpay_key_secret;
      if (rzpSecret === '••••••••••••') {
        rzpSecret = current?.razorpay_key_secret || '';
      } else if (rzpSecret) {
        rzpSecret = encrypt(rzpSecret);
      }

      const { error } = await supabase.from('payment_settings').upsert({
        organization_id: accountId,
        razorpay_key_id: data.razorpay_key_id || null,
        razorpay_key_secret: rzpSecret || null,
        upi_vpa: data.upi_vpa || null,
        upi_name: data.upi_name || null,
      }, { onConflict: 'organization_id' });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 });
  } catch (err) {
    console.error('[integrations/save] error:', err);
    return toErrorResponse(err);
  }
}
