import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

async function getMemberRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, organizationId: string) {
  const { data } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single()
  return data?.role ?? null
}

/** GET /api/org/reseller/clients?organizationId=xxx */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId')
  if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })

  const role = await getMemberRole(supabase, user.id, organizationId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin()
    .from('reseller_clients')
    .select(`
      id,
      credit_balance,
      status,
      invited_at,
      accepted_at,
      client_org_id,
      organizations!reseller_clients_client_org_id_fkey (
        id, name, slug, plan, subscription_status
      )
    `)
    .eq('reseller_org_id', organizationId)
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}

/** POST /api/org/reseller/clients — body: { organizationId, client_org_id } */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const { organizationId, client_org_id } = body as { organizationId: string; client_org_id: string }
  if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
  if (!client_org_id) return NextResponse.json({ error: 'client_org_id is required' }, { status: 400 })

  const role = await getMemberRole(supabase, user.id, organizationId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (client_org_id === organizationId) {
    return NextResponse.json({ error: 'Cannot link yourself as a client' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('reseller_clients')
    .insert({
      reseller_org_id: organizationId,
      client_org_id,
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This organization is already a client' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
