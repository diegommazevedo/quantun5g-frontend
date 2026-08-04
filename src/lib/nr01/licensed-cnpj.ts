/**
 * CNPJ vinculado à licença paga — definido no checkout Kiwify, imutável após confirmação.
 * Nunca aceitar CNPJ digitado manualmente no onboarding (auditoria / anti-extravio).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { normalizeCnpj } from '@/lib/companies/normalize'
import { isValidCnpj } from '@/lib/companies/cnpj'
import {
  provisionCompanyFromKiwify,
  resolveCustomerCnpj,
} from '@/lib/billing/provision-company-from-kiwify'
import { fetchKiwifySale } from '@/lib/billing/kiwify-provision-helpers'
import { loadOrgAccountIdForUser } from '@/lib/billing/kiwify-provision-helpers'
import type { Subscription } from '@/types/database'

export const LICENSED_CNPJ_META_KEY = 'customer_cnpj' as const

export function licensedCnpjFromMetadata(
  metadata: Subscription['metadata'] | Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const raw = (metadata as Record<string, unknown>)[LICENSED_CNPJ_META_KEY]
  if (typeof raw !== 'string' || !raw.trim()) return null
  const digits = normalizeCnpj(raw)
  return isValidCnpj(digits) ? digits : null
}

/** Primeira gravação vence — nunca sobrescreve CNPJ já vinculado à licença. */
export function mergeLicensedCnpjMetadata(
  existing: Record<string, unknown> | null | undefined,
  candidateRaw: string | null | undefined,
): { metadata: Record<string, unknown>; licensedCnpj: string | null; newlyLocked: boolean } {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  const locked = licensedCnpjFromMetadata(base)
  if (locked) {
    base[LICENSED_CNPJ_META_KEY] = locked
    return { metadata: base, licensedCnpj: locked, newlyLocked: false }
  }
  if (!candidateRaw?.trim()) {
    return { metadata: base, licensedCnpj: null, newlyLocked: false }
  }
  const digits = normalizeCnpj(candidateRaw)
  if (!isValidCnpj(digits)) {
    return { metadata: base, licensedCnpj: null, newlyLocked: false }
  }
  base[LICENSED_CNPJ_META_KEY] = digits
  return { metadata: base, licensedCnpj: digits, newlyLocked: true }
}

export async function loadActiveNr01Subscription(userId: string): Promise<Subscription | null> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? (data as Subscription) : null
}

/** Tenta indexar CNPJ da venda Kiwify na licença (somente se ainda não travado). */
export async function syncLicensedCnpjFromKiwifySale(
  subscription: Subscription,
): Promise<Subscription> {
  const locked = licensedCnpjFromMetadata(subscription.metadata)
  if (locked) return subscription

  const meta =
    subscription.metadata && typeof subscription.metadata === 'object'
      ? (subscription.metadata as Record<string, unknown>)
      : {}
  const orderId =
    typeof meta.kiwify_order_id === 'string' ? meta.kiwify_order_id.trim() : null
  if (!orderId) return subscription

  const sale = await fetchKiwifySale(orderId, { maxAttempts: 2, delayMs: 800 })
  const fromSale = resolveCustomerCnpj({ sale, subscription })
  const { metadata, licensedCnpj, newlyLocked } = mergeLicensedCnpjMetadata(meta, fromSale)
  if (!newlyLocked || !licensedCnpj) return subscription

  const admin = createServiceRoleAdmin()
  await admin
    .from('subscriptions')
    .update({ metadata } as never)
    .eq('id', subscription.id)

  const { data: refreshed } = await admin
    .from('subscriptions')
    .select('*')
    .eq('id', subscription.id)
    .maybeSingle()
  return refreshed ? (refreshed as Subscription) : subscription
}

export interface EnsureLicensedCompanyResult {
  companyId: string | null
  licensedCnpj: string | null
  skippedReason?: string
}

/** Cria empresa apenas com CNPJ já vinculado à licença (checkout). */
export async function ensureCompanyFromLicensedCnpj(
  userId: string,
  opts?: { companyName?: string | null; email?: string | null },
): Promise<EnsureLicensedCompanyResult> {
  let subscription = await loadActiveNr01Subscription(userId)
  if (!subscription) {
    return { companyId: null, licensedCnpj: null, skippedReason: 'licença NR-01 não encontrada' }
  }

  subscription = await syncLicensedCnpjFromKiwifySale(subscription)
  const licensedCnpj = licensedCnpjFromMetadata(subscription.metadata)
  if (!licensedCnpj) {
    return {
      companyId: null,
      licensedCnpj: null,
      skippedReason: 'cnpj_ausente_checkout',
    }
  }

  const admin = createServiceRoleAdmin()
  const orgAccountId = await loadOrgAccountIdForUser(admin, userId)

  const result = await provisionCompanyFromKiwify({
    userId,
    email: opts?.email?.trim() ?? '',
    orgAccountId,
    subscription,
    sale: null,
    webhookPayload: null,
  })

  if (result.companyId && opts?.companyName?.trim()) {
    await admin
      .from('companies')
      .update({ name: opts.companyName.trim() } as never)
      .eq('id', result.companyId)
      .eq('account_user_id', userId)
  }

  if (result.companyId) {
    const meta =
      subscription.metadata && typeof subscription.metadata === 'object'
        ? (subscription.metadata as Record<string, unknown>)
        : {}
    await admin
      .from('subscriptions')
      .update({
        company_id: result.companyId,
        metadata: {
          ...meta,
          needs_company_onboarding: false,
          company_skip_reason: null,
        },
      } as never)
      .eq('id', subscription.id)
  }

  return {
    companyId: result.companyId,
    licensedCnpj,
    skippedReason: result.skippedReason,
  }
}
