import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

// Meta API config constants
const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(request: NextRequest) {
  try {
    // 1. Initialize Supabase client and authenticate session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    // 2. Parse request payload
    const { code, organizationId } = await request.json();

    if (!code || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters: code, organizationId' },
        { status: 400 }
      );
    }

    // 3. Server-side verification: Recheck user membership and role in organization
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
        { error: 'Unauthorized: Only administrators and owners can connect WhatsApp.' },
        { status: 403 }
      );
    }

    // 4. Resolve Meta App credentials
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      console.error('[Complete Signup] Meta App configurations (ID/Secret) are missing on the server.');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 5. Exchange code for short-lived access token
    const tokenUrl = `${META_API_BASE}/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code: code,
    });

    const tokenRes = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
      method: 'POST',
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Complete Signup] Short-lived token exchange failed:', tokenData.error);
      return NextResponse.json(
        { error: tokenData.error?.message || 'Failed to exchange Meta OAuth code.' },
        { status: 502 }
      );
    }

    const shortToken = tokenData.access_token;

    // 6. Exchange short-lived token for long-lived access token
    const longTokenParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    });

    const longTokenRes = await fetch(`${tokenUrl}?${longTokenParams.toString()}`, {
      method: 'GET',
    });
    const longTokenData = await longTokenRes.json();

    if (!longTokenRes.ok || !longTokenData.access_token) {
      console.error('[Complete Signup] Long-lived token exchange failed:', longTokenData.error);
      return NextResponse.json(
        { error: longTokenData.error?.message || 'Failed to obtain long-lived access token.' },
        { status: 502 }
      );
    }

    const longToken = longTokenData.access_token;

    // 7. Query shared WABA Account details (takes the first account shared in embedded signup)
    const wabaUrl = `${META_API_BASE}/me/whatsapp_business_accounts`;
    const wabaRes = await fetch(wabaUrl, {
      headers: { Authorization: `Bearer ${longToken}` },
    });
    const wabaData = await wabaRes.json();

    if (!wabaRes.ok || !wabaData.data || wabaData.data.length === 0) {
      console.error('[Complete Signup] WABA details fetch failed or returned empty:', wabaData.error || wabaData);
      return NextResponse.json(
        { error: 'No WhatsApp Business Accounts found under this user session.' },
        { status: 502 }
      );
    }

    const wabaId = wabaData.data[0].id;

    // 8. Query WABA Phone Numbers (takes the first phone number)
    const phoneUrl = `${META_API_BASE}/${wabaId}/phone_numbers`;
    const phoneRes = await fetch(phoneUrl, {
      headers: { Authorization: `Bearer ${longToken}` },
    });
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok || !phoneData.data || phoneData.data.length === 0) {
      console.error('[Complete Signup] Phone numbers fetch failed or returned empty:', phoneData.error || phoneData);
      return NextResponse.json(
        { error: 'No phone numbers registered for this WhatsApp Business Account.' },
        { status: 502 }
      );
    }

    const phoneNumberId = phoneData.data[0].id;

    // 8.5. Prevent connection hijacking: check if the phone number is already connected to another organization
    const { data: existingWaba, error: checkError } = await supabase
      .from('waba_connections')
      .select('organization_id')
      .eq('phone_number_id', phoneNumberId)
      .maybeSingle();

    if (checkError) {
      console.error('[Complete Signup] Failed to check existing phone number connection:', checkError);
      return NextResponse.json(
        { error: 'Database check failed' },
        { status: 500 }
      );
    }

    if (existingWaba && existingWaba.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'This WhatsApp number is already connected to a different organization.' },
        { status: 409 }
      );
    }

    // 9. Encrypt token using AES-256-GCM
    const encryptedToken = encrypt(longToken);

    // 10. Upsert connection record in waba_connections
    // (phone_number_id is UNIQUE, so we upsert based on conflict on phone_number_id)
    const { error: upsertError } = await supabase
      .from('waba_connections')
      .upsert(
        {
          organization_id: organizationId,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          access_token_encrypted: encryptedToken,
          status: 'connected',
        },
        {
          onConflict: 'phone_number_id',
        }
      );

    if (upsertError) {
      console.error('[Complete Signup] waba_connections upsert failed:', upsertError);
      return NextResponse.json(
        { error: 'Failed to record connection details in the database.' },
        { status: 500 }
      );
    }

    // Return success boolean only — never return the token
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Complete Signup] Uncaught route handler error:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
