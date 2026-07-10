import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');
    if (!orgId) {
      return NextResponse.json({ error: 'org_id is required' }, { status: 400 });
    }

    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature' }, { status: 400 });
    }

    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    const db = supabaseAdmin();

    // Fetch integration configuration to get the key secret (used as webhook secret)
    const { data: paySettings } = await db
      .from('payment_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!paySettings || !paySettings.razorpay_key_secret) {
      return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 400 });
    }

    let keySecret = '';
    try {
      keySecret = decrypt(paySettings.razorpay_key_secret);
    } catch (err) {
      console.error('[payment/webhook] Decryption failed:', err);
      return NextResponse.json({ error: 'Failed to decrypt keys' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyText)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[payment/webhook] Signature mismatch');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = body.event;
    console.log('[payment/webhook] Received Razorpay event:', event);

    if (event === 'payment_link.paid' || event === 'payment.captured') {
      const entity = event === 'payment_link.paid'
        ? body.payload?.payment_link?.entity
        : body.payload?.payment?.entity;

      if (!entity) {
        return NextResponse.json({ error: 'Invalid payload entity' }, { status: 400 });
      }

      const paymentLinkId = entity.id; // or payment link ID in case of link.paid
      const notes = entity.notes || {};
      const conversationId = notes.conversation_id;
      const contactId = notes.contact_id;
      const amount = entity.amount ? entity.amount / 100 : 0; // in rupees
      const description = entity.description || 'Invoice Payment';

      if (!conversationId || !contactId) {
        return NextResponse.json({ message: 'Ignore: Notes do not map to CRM conversation' }, { status: 200 });
      }

      // Update payment requests
      let requestQuery = db.from('payment_requests').update({ status: 'paid' });
      if (event === 'payment_link.paid') {
        requestQuery = requestQuery.eq('payment_link_id', paymentLinkId);
      } else {
        requestQuery = requestQuery
          .eq('conversation_id', conversationId)
          .eq('amount', amount)
          .eq('status', 'pending');
      }
      await requestQuery;

      const settledText = `💳 Payment settled successfully!\nAmount: ₹${amount.toFixed(2)}\nDescription: ${description}\nStatus: Settled`;

      // Insert confirmation system message to the chat
      const { data: newMsg, error: msgErr } = await db
        .from('messages')
        .insert({
          organization_id: orgId,
          conversation_id: conversationId,
          contact_id: contactId,
          direction: 'outbound',
          message_type: 'text',
          content_text: settledText,
          status: 'sent',
        })
        .select('id')
        .single();

      if (msgErr) {
        console.error('[payment/webhook] Error logging settled message:', msgErr);
      }

      // Update conversation last message text
      await db
        .from('conversations')
        .update({
          last_message_text: settledText,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      return NextResponse.json({ success: true, message: 'Payment recorded and settled' });
    }

    return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
  } catch (err: any) {
    console.error('[payment/webhook] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
