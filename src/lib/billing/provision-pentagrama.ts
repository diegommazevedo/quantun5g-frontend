/**
 * Provisionamento pós-pagamento Pentagrama — módulo no perfil + assinatura ativa.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { activateSubscription } from '@/lib/billing/subscription'
import type { PentagramaModality } from '@/lib/billing/pentagrama-catalog'
import type { Subscription } from '@/types/database'

export async function provisionPentagramaSubscription(params: {
  subscription: Subscription
  paidAt: Date
}): Promise<void> {
  const { subscription, paidAt } = params
  const meta =
    typeof subscription.metadata === 'object' && subscription.metadata
      ? (subscription.metadata as Record<string, unknown>)
      : {}

  const modality = (meta.modality as PentagramaModality) ?? 'one_off'
  const diagnosticsPerPeriod =
    typeof meta.diagnostics_per_period === 'number' ? meta.diagnostics_per_period : 1

  const admin = createServiceRoleAdmin()

  await activateSubscription({
    subscriptionId: subscription.id,
    paidAt,
    modality: modality === 'annual' ? 'annual' : 'one_off',
    assessmentsPerPeriod: diagnosticsPerPeriod,
  })

  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      module_pentagrama: true,
      is_active: true,
    } as never)
    .eq('id', subscription.user_id)

  if (profileErr) {
    console.error('[provision-pentagrama] profile update failed:', profileErr.message)
  }

  await admin
    .from('subscriptions')
    .update({
      metadata: {
        ...meta,
        provisioned_at: paidAt.toISOString(),
      },
    } as never)
    .eq('id', subscription.id)
}
