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

    const topic = request.headers.get('x-shopify-topic') || '';
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

    if (!config) {
      return NextResponse.json({ message: 'No integration configured' }, { status: 200 });
    }

    // Resolve customer phone number
    const rawPhone = body.phone || body.customer?.phone || body.billing_address?.phone;
    if (!rawPhone) {
      return NextResponse.json({ message: 'No phone number in payload' }, { status: 200 });
    }
    const phone = normalizePhone(rawPhone);

    const name = [body.customer?.first_name, body.customer?.last_name]
      .filter(Boolean)
      .join(' ') || 'Customer';

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
          account_id: orgId, // account_id is equivalent in RLS
          contact_id: contactId,
          status: 'open',
        })
        .select('id')
        .single();
      if (convErr || !newConv) throw convErr || new Error('Failed to create conversation');
      conversationId = newConv.id;
    }

    // 1. Abandoned Checkout Recovery
    if (
      (topic === 'checkouts/create' || topic === 'checkouts/update' || topic === 'checkouts/abandon') &&
      config.abandoned_cart_enabled
    ) {
      // If completed_at is set, it means the checkout was completed, so do not trigger recovery!
      if (body.completed_at) {
        return NextResponse.json({ message: 'Checkout already completed' }, { status: 200 });
      }

      const checkoutUrl = body.abandoned_checkout_url || '';
      const totalPrice = body.total_price || '0.00';

      const messageText = config.abandoned_cart_message
        .replace(/\{\{\s*name\s*\}\}/g, body.customer?.first_name || 'there')
        .replace(/\{\{\s*checkout_url\s*\}\}/g, checkoutUrl)
        .replace(/\{\{\s*total_price\s*\}\}/g, totalPrice);

      await sendMessageToConversation(db, orgId, {
        conversationId,
        messageType: 'text',
        contentText: messageText,
      });

      return NextResponse.json({ success: true, message: 'Recovery notification sent' });
    }

    // 2. Order Fulfillment Alert (Tracking alerts)
    if (topic === 'orders/fulfilled' && config.tracking_alerts_enabled) {
      const fulfillment = body.fulfillments?.[0];
      const trackingNumber = fulfillment?.tracking_number || '';
      const carrier = fulfillment?.tracking_company || '';

      const messageText = config.tracking_message
        .replace(/\{\{\s*name\s*\}\}/g, body.customer?.first_name || 'there')
        .replace(/\{\{\s*tracking_number\s*\}\}/g, trackingNumber)
        .replace(/\{\{\s*carrier\s*\}\}/g, carrier);

      await sendMessageToConversation(db, orgId, {
        conversationId,
        messageType: 'text',
        contentText: messageText,
      });

      return NextResponse.json({ success: true, message: 'Fulfillment notification sent' });
    }

    return NextResponse.json({ message: 'Event ignored or not enabled' }, { status: 200 });
  } catch (err: any) {
    console.error('[shopify/webhook] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
