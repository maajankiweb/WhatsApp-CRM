import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/business/enquiries — Get client enquiries/leads list
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer')

    // Find the business profile first
    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ enquiries: [] })
    }

    const { data: enquiries, error } = await supabase
      .from('business_enquiries')
      .select(`
        *,
        contact:contacts(name, phone)
      `)
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ enquiries: enquiries ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/business/enquiries — Create an enquiry manually
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { phone, contact_name, enquiry_type, notes, preferred_date, preferred_time } = body

    if (!phone || !enquiry_type) {
      return NextResponse.json({ error: 'Phone and enquiry type are required' }, { status: 400 })
    }

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: 'Configure your Business Profile first.' }, { status: 400 })
    }

    // Find or create contact
    let contactId
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', accountId)
      .eq('phone', phone)
      .maybeSingle()

    if (contact) {
      contactId = contact.id
    } else {
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          organization_id: accountId,
          phone,
          name: contact_name || 'Enquiry Lead',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (contactErr || !newContact) {
        return NextResponse.json({ error: contactErr?.message ?? 'Contact creation failed' }, { status: 500 })
      }
      contactId = newContact.id
    }

    const { data: enquiry, error } = await supabase
      .from('business_enquiries')
      .insert({
        organization_id: accountId,
        business_id: business.id,
        contact_id: contactId,
        contact_name: contact_name || null,
        contact_phone: phone,
        enquiry_type,
        notes: notes || null,
        preferred_date: preferred_date || null,
        preferred_time: preferred_time || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ enquiry })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/business/enquiries — Cancel/Delete an enquiry
 */
export async function DELETE(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Enquiry ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('business_enquiries')
      .delete()
      .eq('id', id)
      .eq('organization_id', accountId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
