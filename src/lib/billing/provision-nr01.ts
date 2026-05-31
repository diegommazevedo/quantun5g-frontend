/**
 * Provisionamento pós-pagamento NR-01 — entitlements + módulos no perfil.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { activateSubscription } from '@/lib/billing/subscription'
import type { Nr01Entitlement, Nr01SubscriptionMetadata } from '@/lib/billing/nr01-catalog'
import type { Subscription } from '@/types/database'

function parseMetadata(raw: unknown): Nr01SubscriptionMetadata | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (m.product !== 'quantum5g_nr01' && !m.tier_id) return null
  return m as unknown as Nr01SubscriptionMetadata
}

export async function provisionNr01Subscription(params: {
  subscription: Subscription
  paidAt: Date
}): Promise<void> {
  const { subscription, paidAt } = params
  const meta = parseMetadata(subscription.metadata)

  const admin = createServiceRoleAdmin()

  await activateSubscription({
    subscriptionId: subscription.id,
    paidAt,
    modality: 'annual',
    assessmentsPerPeriod: 99,
  })

  const includesPentagrama = meta?.includes_pentagrama === true
  const entitlements: Nr01Entitlement[] = meta?.entitlements?.length
    ? meta.entitlements
    : ['core_nr01', 'email_broadcast', 'pdca', 'evidence_pack', 'support_email']

  const profileUpdate: Record<string, unknown> = {
    module_nr01: entitlements.includes('core_nr01'),
    is_active: true,
  }
  if (includesPentagrama || entitlements.includes('pentagrama_ginger')) {
    profileUpdate.module_pentagrama = true
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', subscription.user_id)

  if (profileErr) {
    console.error('[provision-nr01] profile update failed:', profileErr.message)
  }

  const mergedMeta = {
    ...(typeof subscription.metadata === 'object' && subscription.metadata ? subscription.metadata : {}),
    provisioned_at: paidAt.toISOString(),
    entitlements,
  }

  await admin.from('subscriptions').update({ metadata: mergedMeta }).eq('id', subscription.id)
}
