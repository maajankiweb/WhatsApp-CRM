import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

/** GET /api/org/account-type?organizationId=xxx */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId')
  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
  }

  // Verify membership
  const { data: member } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: org, error } = await supabaseAdmin()
    .from('organizations')
    .select('account_type')
    .eq('id', organizationId)
    .single()

  if (error || !org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ account_type: org.account_type ?? 'user' })
}

/** PATCH /api/org/account-type — body: { organizationId, account_type } */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const { organizationId, account_type } = body as { organizationId: string; account_type: string }

  if (!organizationId) return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
  if (!['user', 'reseller'].includes(account_type)) {
    return NextResponse.json({ error: 'Invalid account_type. Must be "user" or "reseller".' }, { status: 400 })
  }

  // Only owners can change account type
  const { data: member } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (member.role !== 'owner') {
    return NextResponse.json({ error: 'Only the account owner can change account type' }, { status: 403 })
  }

  const { error } = await supabaseAdmin()
    .from('organizations')
    .update({ account_type })
    .eq('id', organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed reseller_settings row if upgrading
  if (account_type === 'reseller') {
    await supabaseAdmin()
      .from('reseller_settings')
      .upsert({ organization_id: organizationId }, { onConflict: 'organization_id', ignoreDuplicates: true })
  }

  return NextResponse.json({ account_type })
}
