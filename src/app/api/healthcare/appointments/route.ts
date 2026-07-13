import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/healthcare/appointments — Fetch appointments list
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer')

    // Find the clinic first
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!clinic) {
      return NextResponse.json({ appointments: [] })
    }

    // Join with doctor and contact
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(doctor_name, specialization),
        contact:contacts(name, phone)
      `)
      .eq('clinic_id', clinic.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointments: appointments ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/healthcare/appointments — Create appointment
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { doctor_id, phone, name, appointment_date, appointment_time, patient_name, patient_age, reason_for_visit } = body

    if (!phone || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Phone, date, and time are required' }, { status: 400 })
    }

    // Find the clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
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
          name: name || patient_name || 'Patient',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (contactErr || !newContact) {
        return NextResponse.json({ error: contactErr?.message ?? 'Contact creation failed' }, { status: 500 })
      }
      contactId = newContact.id
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        organization_id: accountId,
        clinic_id: clinic.id,
        contact_id: contactId,
        doctor_id: doctor_id || null,
        appointment_date,
        appointment_time,
        patient_name: patient_name || name || 'Patient',
        patient_age: patient_age || null,
        reason_for_visit: reason_for_visit || null,
        status: 'scheduled'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ appointment })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/healthcare/appointments — Cancel appointment
 */
export async function DELETE(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('agent')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 })
    }

    // Update status to cancelled instead of deleting (standard clinic best practice)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
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
