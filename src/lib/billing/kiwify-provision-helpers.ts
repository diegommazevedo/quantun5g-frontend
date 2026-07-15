/**
 * Helpers compartilhados do fluxo de provisionamento Kiwify.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Subscription } from '@/types/database'

export async function loadSubscriptionById(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<Subscription | null> {
  const { data } = await admin.from('subscriptions').select('*').eq('id', subscriptionId).maybeSingle()
  return data ? (data as Subscription) : null
}

export async function loadOrgAccountIdForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}
