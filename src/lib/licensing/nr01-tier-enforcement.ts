/**
 * Enforcement de faixa NR-01 (worker_min / worker_max) a partir da subscription ativa.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { getNr01LicenseForUser } from '@/lib/billing/nr01-license'
import type { Nr01SubscriptionMetadata } from '@/lib/billing/nr01-catalog'
import { getTier, type Nr01TierId } from '@/lib/billing/nr01-catalog'
import type { UserRole } from '@/types/database'
import { isPlatformStaff } from '@/lib/auth/roles'

export interface Nr01TierLimits {
  tierId: Nr01TierId | null
  workerMin: number
  workerMax: number | null
  headcountDeclared: number | null
}

function parseSubscriptionMetadata(raw: unknown): Nr01SubscriptionMetadata | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (m.product !== 'quantum5g_nr01' && !m.tier_id) return null
  return m as unknown as Nr01SubscriptionMetadata
}

/** Limites da faixa contratada pelo usuário pagante (subscription ou fatura ativa). */
export async function getNr01TierLimitsForUser(userId: string): Promise<Nr01TierLimits | null> {
  const license = await getNr01LicenseForUser(userId)
  if (!license.licensed) return null

  const admin = createServiceRoleAdmin()
  let metadata: unknown = null

  if (license.subscriptionId) {
    const { data } = await admin
      .from('subscriptions')
      .select('metadata')
      .eq('id', license.subscriptionId)
      .maybeSingle()
    metadata = data?.metadata
  } else if (license.invoiceId) {
    const { data } = await admin
      .from('commercial_invoices')
      .select('metadata')
      .eq('id', license.invoiceId)
      .maybeSingle()
    metadata = data?.metadata
  }

  const parsed = parseSubscriptionMetadata(metadata)
  if (parsed?.tier_id) {
    return {
      tierId: parsed.tier_id,
      workerMin: parsed.worker_min,
      workerMax: parsed.worker_max,
      headcountDeclared: parsed.headcount_declared,
    }
  }

  if (parsed?.worker_min != null) {
    return {
      tierId: null,
      workerMin: parsed.worker_min,
      workerMax: parsed.worker_max ?? null,
      headcountDeclared: parsed.headcount_declared ?? null,
    }
  }

  // Fallback: última subscription NR-01 (ex.: module_flag sem active_subscriptions view)
  const { data: latestSub } = await admin
    .from('subscriptions')
    .select('metadata')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fallback = parseSubscriptionMetadata(latestSub?.metadata)
  if (fallback?.tier_id) {
    return {
      tierId: fallback.tier_id,
      workerMin: fallback.worker_min,
      workerMax: fallback.worker_max,
      headcountDeclared: fallback.headcount_declared,
    }
  }

  return null
}

/** Resolve o usuário pagante vinculado à empresa (org owner ou account_user_id legado). */
export async function resolveBillingUserIdForCompany(companyId: string): Promise<string | null> {
  const admin = createServiceRoleAdmin()
  const { data: co } = await admin
    .from('companies')
    .select('org_account_id, account_user_id')
    .eq('id', companyId)
    .maybeSingle()

  if (!co) return null

  if (co.org_account_id) {
    const { data: org } = await admin
      .from('org_accounts')
      .select('owner_user_id')
      .eq('id', co.org_account_id as string)
      .maybeSingle()
    return (org?.owner_user_id as string | undefined) ?? null
  }

  return (co.account_user_id as string | null) ?? null
}

export function formatTierRange(limits: Nr01TierLimits): string {
  if (limits.workerMax != null) {
    return `${limits.workerMin}–${limits.workerMax} trabalhadores`
  }
  return `${limits.workerMin}+ trabalhadores`
}

export function assertCountWithinTierLimits(
  limits: Nr01TierLimits,
  count: number,
  fieldLabel: string,
): void {
  if (count <= 0) return
  if (count < limits.workerMin) {
    throw new Error(
      `${fieldLabel} (${count}) está abaixo do mínimo da faixa contratada (${formatTierRange(limits)}).`,
    )
  }
  if (limits.workerMax != null && count > limits.workerMax) {
    throw new Error(
      `${fieldLabel} (${count}) excede a faixa do seu plano (${formatTierRange(limits)}). ` +
        'Atualize seu plano em Contratação ou ajuste o número informado.',
    )
  }
}

/** Valida headcount contra a licença do pagante. Staff sem pagante vinculado: ignora. */
export async function assertHeadcountWithinLicense(params: {
  actorUserId: string
  actorRole: UserRole
  count: number
  fieldLabel: string
  companyId?: string
}): Promise<void> {
  if (params.actorRole === 'admin') return

  let billingUserId = params.actorUserId
  if (isPlatformStaff(params.actorRole) && params.companyId) {
    const resolved = await resolveBillingUserIdForCompany(params.companyId)
    if (!resolved) return
    billingUserId = resolved
  } else if (isPlatformStaff(params.actorRole)) {
    return
  }

  const limits = await getNr01TierLimitsForUser(billingUserId)
  if (!limits) return

  assertCountWithinTierLimits(limits, params.count, params.fieldLabel)
}

/** Tier label para exibição (ex.: "11–15 trabalhadores"). */
export function tierLabelFromLimits(limits: Nr01TierLimits): string {
  if (limits.tierId) {
    try {
      return getTier(limits.tierId).label
    } catch {
      return formatTierRange(limits)
    }
  }
  return formatTierRange(limits)
}
