import { createClient } from './server'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'

export interface OrganizationContext {
  id: string
  name: string
  plan: string
  subscription_status: string
}

/**
 * Server-side helper to query organization details by slug.
 * Returns organization details or triggers notFound/redirect.
 */
export const getTenantContext = cache(async (orgSlug: string): Promise<OrganizationContext> => {
  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, plan, subscription_status')
    .eq('slug', orgSlug)
    .single()

  if (error || !org) {
    notFound()
  }

  if (org.subscription_status === 'canceled') {
    // Redirect canceled subscriptions to landing page
    redirect('/')
  }

  return {
    id: org.id,
    name: org.name,
    plan: org.plan,
    subscription_status: org.subscription_status
  }
})


