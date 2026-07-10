import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

/** GET /api/org/reseller/settings?organizationId=xxx */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId')
  if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })

  const { data: member } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin()
    .from('reseller_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? {
    organization_id: organizationId,
    brand_name: null,
    brand_logo_url: null,
    accent_color: '#25D366',
    support_email: null,
    support_phone: null,
    custom_domain: null,
    manager_name: null,
    manager_email: null,
    credit_margin_pct: 0,
    wallet_balance: 0,
  })
}

/** PUT /api/org/reseller/settings — body: { organizationId, ...fields } */
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const { organizationId, ...rest } = body as { organizationId: string } & Record<string, unknown>
  if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })

  const { data: member } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const allowed = ['brand_name', 'brand_logo_url', 'accent_color', 'support_email',
    'support_phone', 'custom_domain', 'credit_margin_pct']
  const updates: Record<string, unknown> = {
    organization_id: organizationId,
    updated_at: new Date().toISOString(),
  }
  for (const key of allowed) {
    if (key in rest) updates[key] = rest[key]
  }

  const { data, error } = await supabaseAdmin()
    .from('reseller_settings')
    .upsert(updates, { onConflict: 'organization_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
