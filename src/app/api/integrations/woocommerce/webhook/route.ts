import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { findExistingContact } from '@/lib/contacts/dedupe';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');
    if (!orgId) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = supabaseAdmin();

    // Fetch integration configuration
    const { data: config } = await db
      .from('ecommerce_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!config || !config.abandoned_cart_enabled) {
      return NextResponse.json({ message: 'WooCommerce integration or recovery disabled' }, { status: 200 });
    }

    // WooCommerce webhook mapping. Can have raw phone or nested under billing
    const rawPhone = body.phone || body.billing?.phone || body.billing_address?.phone || body.customer?.phone;
    if (!rawPhone) {
      return NextResponse.json({ message: 'No phone number in WooCommerce payload' }, { status: 200 });
    }
    const phone = normalizePhone(rawPhone);

    const firstName = body.customer?.first_name || body.billing?.first_name || 'there';
    const lastName = body.customer?.last_name || body.billing?.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || 'Customer';

    const checkoutUrl = body.checkout_url || body.cart_url || '';
    const totalPrice = body.total || body.total_price || '0.00';

    // RLS Bypass: finding or creating contact in the tenant
    let contactId = '';
    const existing = await findExistingContact(db, orgId, phone);
    if (existing) {
      contactId = existing.id;
    } else {
      const { data: newContact, error: contactErr } = await db
        .from('contacts')
        .insert({
          organization_id: orgId,
          phone,
          name,
        })
        .select('id')
        .single();
      if (contactErr || !newContact) throw contactErr || new Error('Failed to create contact');
      contactId = newContact.id;
    }

    // Find or create conversation
    let conversationId = '';
    const { data: existingConv } = await db
      .from('conversations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convErr } = await db
        .from('conversations')
        .insert({
          organization_id: orgId,
          account_id: orgId,
          contact_id: contactId,
          status: 'open',
        })
        .select('id')
        .single();
      if (convErr || !newConv) throw convErr || new Error('Failed to create conversation');
      conversationId = newConv.id;
    }

    const messageText = config.abandoned_cart_message
      .replace(/\{\{\s*name\s*\}\}/g, firstName)
      .replace(/\{\{\s*checkout_url\s*\}\}/g, checkoutUrl)
      .replace(/\{\{\s*total_price\s*\}\}/g, totalPrice);

    await sendMessageToConversation(db, orgId, {
      conversationId,
      messageType: 'text',
      contentText: messageText,
    });

    return NextResponse.json({ success: true, message: 'WooCommerce Recovery notification sent' });
  } catch (err: any) {
    console.error('[woocommerce/webhook] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
