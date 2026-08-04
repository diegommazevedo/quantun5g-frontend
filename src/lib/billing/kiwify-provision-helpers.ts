/**
 * Helpers compartilhados do fluxo de provisionamento Kiwify.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { kiwifyRequest, type KiwifySaleDetails } from '@/lib/billing/kiwify-client'
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

export async function fetchKiwifySale(
  orderId: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<KiwifySaleDetails | null> {
  const maxAttempts = options?.maxAttempts ?? 5
  const delayMs = options?.delayMs ?? 1500

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await kiwifyRequest<KiwifySaleDetails>('GET', `/sales/${encodeURIComponent(orderId)}`)
    } catch (e) {
      const isLast = attempt === maxAttempts
      console.error(
        `[kiwify-provision] fetch sale attempt ${attempt}/${maxAttempts} failed:`,
        e,
      )
      if (isLast) return null
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }
  return null
}
