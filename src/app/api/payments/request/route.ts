import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent');

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }

    const { conversation_id: conversationId, amount: rawAmount, description, method } = body;
    const amount = Number(rawAmount);

    if (!conversationId || !amount || amount <= 0 || !method) {
      return NextResponse.json({ error: 'conversation_id, positive amount, and method are required' }, { status: 400 });
    }

    if (method !== 'upi' && method !== 'razorpay') {
      return NextResponse.json({ error: 'Invalid method: must be upi or razorpay' }, { status: 400 });
    }

    // Load conversation with contact details
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversationId)
      .eq('organization_id', accountId)
      .single();

    if (convErr || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Load payment settings
    const { data: paySettings, error: settingsErr } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('organization_id', accountId)
      .maybeSingle();

    if (!paySettings) {
      return NextResponse.json({ error: 'Payment configurations are missing. Setup in Settings → Integrations.' }, { status: 400 });
    }

    if (method === 'upi') {
      const vpa = paySettings.upi_vpa;
      const name = paySettings.upi_name || 'Merchant';
      if (!vpa) {
        return NextResponse.json({ error: 'Merchant UPI VPA is not configured. Setup in Settings → Integrations.' }, { status: 400 });
      }

      // Generate UPI URI
      const upiUri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(description || 'Payment')}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

      // Save request in DB
      const { data: pr, error: prErr } = await supabase
        .from('payment_requests')
        .insert({
          organization_id: accountId,
          conversation_id: conversationId,
          contact_id: conversation.contact_id,
          amount,
          description,
          payment_method: 'upi',
          payment_url: upiUri,
          status: 'pending',
        })
        .select('id')
        .single();

      if (prErr || !pr) throw prErr || new Error('Failed to audit payment request');

      // Send QR Code image message on WhatsApp
      await sendMessageToConversation(supabase, accountId, {
        conversationId,
        messageType: 'image',
        mediaUrl: qrUrl,
        contentText: `Payment Request: ₹${amount.toFixed(2)}\nDescription: ${description || 'Pending invoice'}\n\nScan this UPI QR code using Google Pay, PhonePe, or Paytm to pay directly with zero transaction fees.`,
      });

      return NextResponse.json({ success: true, payment_request_id: pr.id });
    }

    if (method === 'razorpay') {
      const keyId = paySettings.razorpay_key_id;
      const keySecretEnc = paySettings.razorpay_key_secret;
      if (!keyId || !keySecretEnc) {
        return NextResponse.json({ error: 'Razorpay keys are not configured. Setup in Settings → Integrations.' }, { status: 400 });
      }

      let keySecret = '';
      try {
        keySecret = decrypt(keySecretEnc);
      } catch (err) {
        console.error('[payment/request] Decryption failed:', err);
        return NextResponse.json({ error: 'Merchant Razorpay keys decryption failed.' }, { status: 400 });
      }

      // Initialize Razorpay SDK using merchant credentials
      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const phone = conversation.contact?.phone || '';
      const clientName = conversation.contact?.name || 'Customer';

      // Create Razorpay payment link
      const link = await rzp.paymentLink.create({
        amount: Math.round(amount * 100), // in paise
        currency: 'INR',
        accept_partial: false,
        description: description || 'Invoice payment request',
        customer: {
          name: clientName,
          contact: phone,
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          organization_id: accountId,
          conversation_id: conversationId,
          contact_id: conversation.contact_id,
        },
      });

      const { data: pr, error: prErr } = await supabase
        .from('payment_requests')
        .insert({
          organization_id: accountId,
          conversation_id: conversationId,
          contact_id: conversation.contact_id,
          amount,
          description,
          payment_method: 'razorpay',
          payment_link_id: link.id,
          payment_url: link.short_url,
          status: 'pending',
        })
        .select('id')
        .single();

      if (prErr || !pr) throw prErr || new Error('Failed to audit payment request');

      // Send Link text message on WhatsApp
      await sendMessageToConversation(supabase, accountId, {
        conversationId,
        messageType: 'text',
        contentText: `Payment Request: ₹${amount.toFixed(2)}\nDescription: ${description || 'Pending invoice'}\n\nPlease click this link to pay via Razorpay: ${link.short_url}`,
      });

      return NextResponse.json({ success: true, payment_request_id: pr.id });
    }

    return NextResponse.json({ error: 'Unsupported method' }, { status: 400 });
  } catch (err) {
    console.error('[payment/request] error:', err);
    return toErrorResponse(err);
  }
}
