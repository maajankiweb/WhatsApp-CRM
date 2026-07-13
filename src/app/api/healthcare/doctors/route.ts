import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/healthcare/doctors — Get doctor roster
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
      return NextResponse.json({ doctors: [] })
    }

    const { data: doctors, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ doctors: doctors ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/healthcare/doctors — Create or update doctor details
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { id, doctor_name, specialization, qualification, experience, consultation_fee, languages_spoken } = body

    if (!doctor_name?.trim()) {
      return NextResponse.json({ error: 'Doctor name is required' }, { status: 400 })
    }

    // Find the clinic
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!clinic) {
      return NextResponse.json({ error: 'Configure your Clinic details first.' }, { status: 400 })
    }

    const payload = {
      doctor_name: doctor_name.trim(),
      specialization: specialization?.trim() || null,
      qualification: qualification?.trim() || null,
      experience: experience?.trim() || null,
      consultation_fee: Number(consultation_fee) || 0.00,
      languages_spoken: languages_spoken?.trim() || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (id) {
      // Update
      const { data, error } = await supabase
        .from('doctors')
        .update(payload)
        .eq('id', id)
        .eq('clinic_id', clinic.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      // Insert
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          ...payload,
          organization_id: accountId,
          clinic_id: clinic.id,
          available_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
          available_start_time: '09:00',
          available_end_time: '17:00'
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    }

    return NextResponse.json({ doctor: result })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/healthcare/doctors — Remove doctor from roster
 */
export async function DELETE(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 })
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinic.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
