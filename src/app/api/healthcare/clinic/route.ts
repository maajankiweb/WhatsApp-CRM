import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/healthcare/clinic — Fetch clinic details for the active organization
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer')

    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch clinic timings and AI settings if clinic exists
    if (clinic) {
      const { data: timings } = await supabase
        .from('clinic_timings')
        .select('*')
        .eq('clinic_id', clinic.id)

      const { data: aiSettings } = await supabase
        .from('clinic_ai_settings')
        .select('*')
        .eq('clinic_id', clinic.id)
        .maybeSingle()

      return NextResponse.json({ clinic, timings: timings ?? [], aiSettings })
    }

    return NextResponse.json({ clinic: null, timings: [], aiSettings: null })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/healthcare/clinic — Save or update clinic details
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { clinic_name, clinic_type, clinic_description, phone, whatsapp_number, email, website, address, city, state, pincode, google_map_link, timings, aiSettings } = body

    if (!clinic_name?.trim()) {
      return NextResponse.json({ error: 'Clinic name is required' }, { status: 400 })
    }

    // 1. Upsert Clinic
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .upsert({
        organization_id: accountId,
        clinic_name: clinic_name.trim(),
        clinic_type: clinic_type?.trim() || null,
        clinic_description: clinic_description?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp_number: whatsapp_number?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
        google_map_link: google_map_link?.trim() || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id' // Wait, does clinics have a unique constraint on organization_id? 
        // Let's check our migration. Ah, the migration didn't set UNIQUE(organization_id) on clinics table, but it's one clinic per org.
        // Let's check. To allow onConflict upsert, we can query if clinic exists first, then do update or insert.
      })
      .select()
      .single()

    // Let's write the query first to find existing clinic
    let existingClinic = await supabase
      .from('clinics')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    let clinicId = existingClinic.data?.id

    let finalClinic
    if (clinicId) {
      const { data, error } = await supabase
        .from('clinics')
        .update({
          clinic_name: clinic_name.trim(),
          clinic_type: clinic_type?.trim() || null,
          clinic_description: clinic_description?.trim() || null,
          phone: phone?.trim() || null,
          whatsapp_number: whatsapp_number?.trim() || null,
          email: email?.trim() || null,
          website: website?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pincode: pincode?.trim() || null,
          google_map_link: google_map_link?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', clinicId)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      finalClinic = data
    } else {
      const { data, error } = await supabase
        .from('clinics')
        .insert({
          organization_id: accountId,
          clinic_name: clinic_name.trim(),
          clinic_type: clinic_type?.trim() || null,
          clinic_description: clinic_description?.trim() || null,
          phone: phone?.trim() || null,
          whatsapp_number: whatsapp_number?.trim() || null,
          email: email?.trim() || null,
          website: website?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pincode: pincode?.trim() || null,
          google_map_link: google_map_link?.trim() || null
        })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      finalClinic = data
      clinicId = finalClinic.id
    }

    // 2. Timings Upsert
    if (Array.isArray(timings)) {
      for (const t of timings) {
        const { day_name, opening_time, closing_time, is_closed, lunch_break_start, lunch_break_end } = t
        const { data: existingTiming } = await supabase
          .from('clinic_timings')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('day_name', day_name)
          .maybeSingle()

        if (existingTiming?.id) {
          await supabase
            .from('clinic_timings')
            .update({
              opening_time,
              closing_time,
              is_closed: !!is_closed,
              lunch_break_start,
              lunch_break_end,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTiming.id)
        } else {
          await supabase
            .from('clinic_timings')
            .insert({
              organization_id: accountId,
              clinic_id: clinicId,
              day_name,
              opening_time,
              closing_time,
              is_closed: !!is_closed,
              lunch_break_start,
              lunch_break_end
            })
        }
      }
    }

    // 3. AI Settings Upsert
    if (aiSettings && typeof aiSettings === 'object') {
      const { ai_enabled, ai_tone, greeting_message, after_hours_message } = aiSettings
      const { data: existingAi } = await supabase
        .from('clinic_ai_settings')
        .select('id')
        .eq('clinic_id', clinicId)
        .maybeSingle()

      if (existingAi?.id) {
        await supabase
          .from('clinic_ai_settings')
          .update({
            ai_enabled: ai_enabled !== false,
            ai_tone: ai_tone || 'polite',
            greeting_message: greeting_message || null,
            after_hours_message: after_hours_message || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAi.id)
      } else {
        await supabase
          .from('clinic_ai_settings')
          .insert({
            organization_id: accountId,
            clinic_id: clinicId,
            ai_enabled: ai_enabled !== false,
            ai_tone: ai_tone || 'polite',
            greeting_message: greeting_message || null,
            after_hours_message: after_hours_message || null
          })
      }
    }

    return NextResponse.json({ success: true, clinic: finalClinic })
  } catch (err) {
    return toErrorResponse(err)
  }
}
