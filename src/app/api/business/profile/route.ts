import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/business/profile — Fetch business profile details
 */
export async function GET() {
  try {
    const { supabase, accountId } = await requireRole('viewer')

    const { data: profile, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('organization_id', accountId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (profile) {
      const { data: services } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', profile.id)

      const { data: staff } = await supabase
        .from('business_staff')
        .select('*')
        .eq('business_id', profile.id)

      return NextResponse.json({ profile, services: services ?? [], staff: staff ?? [] })
    }

    return NextResponse.json({ profile: null, services: [], staff: [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/business/profile — Upsert business profile details
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId } = await requireRole('admin')
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { business_name, business_type, phone, whatsapp_number, email, website, address, city, state, pincode, description, institution_type, property_type } = body

    if (!business_name?.trim() || !business_type?.trim()) {
      return NextResponse.json({ error: 'Business name and type are required' }, { status: 400 })
    }

    // Check if profile exists
    const { data: existing } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('organization_id', accountId)
      .maybeSingle()

    const payload = {
      business_name: business_name.trim(),
      business_type: business_type.trim(),
      phone: phone?.trim() || null,
      whatsapp_number: whatsapp_number?.trim() || null,
      email: email?.trim() || null,
      website: website?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      pincode: pincode?.trim() || null,
      description: description?.trim() || null,
      institution_type: institution_type?.trim() || null,
      property_type: property_type?.trim() || null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_profiles')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    } else {
      const { data, error } = await supabase
        .from('business_profiles')
        .insert({
          ...payload,
          organization_id: accountId
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      result = data
    }

    return NextResponse.json({ profile: result })
  } catch (err) {
    return toErrorResponse(err)
  }
}
