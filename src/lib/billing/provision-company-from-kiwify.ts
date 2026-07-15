/**
 * Provisiona empresa (companies) após compra Kiwify — self-service contratante.
 * Fontes (prioridade): metadata subscription → API sale → payload webhook → lead.
 *
 * Falhas são não-bloqueantes: retorna skippedReason sem lançar exceção.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { normalizeCnpj } from '@/lib/companies/normalize'
import { isValidCnpj } from '@/lib/companies/cnpj'
import { assertCanAddOrgCompany, slotsFromMetadata } from '@/lib/licensing/company-cnpj-slots'
import type { KiwifySaleDetails } from '@/lib/billing/kiwify-client'
import type { Subscription } from '@/types/database'

export interface CompanyProvisionHints {
  userId: string
  email: string
  orgAccountId: string | null
  subscription: Subscription
  sale: KiwifySaleDetails | null
  webhookPayload?: Record<string, unknown> | null
}

export interface CompanyProvisionResult {
  companyId: string | null
  skippedReason?: string
}

export interface CompanyProvisionSources {
  subscription?: Subscription | null
  sale?: KiwifySaleDetails | null
  webhookPayload?: Record<string, unknown> | null
}

const PG_UNIQUE_VIOLATION = '23505'

export function extractCnpjFromWebhookPayload(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null
  const order =
    (raw.order as Record<string, unknown> | undefined) ??
    (raw.Order as Record<string, unknown> | undefined) ??
    raw
  const customer =
    (order.customer as Record<string, unknown> | undefined) ??
    (order.Customer as Record<string, unknown> | undefined)
  if (!customer) return null
  const cnpj =
    (typeof customer.cnpj === 'string' ? customer.cnpj : null) ??
    (typeof customer.CNPJ === 'string' ? customer.CNPJ : null)
  if (cnpj?.trim()) return cnpj.trim()
  const cpf = typeof customer.cpf === 'string' ? customer.cpf : null
  if (cpf && normalizeCnpj(cpf).length === 14) return cpf
  return null
}

function extractCnpjFromSale(sale: KiwifySaleDetails | null): string | null {
  const cnpj = sale?.customer?.cnpj?.trim()
  if (cnpj) return cnpj
  const cpf = sale?.customer?.cpf?.trim()
  if (cpf && normalizeCnpj(cpf).length === 14) return cpf
  return null
}

function cnpjFromMetadata(sub: Subscription): string | null {
  const m = sub.metadata
  if (!m || typeof m !== 'object') return null
  const raw = (m as Record<string, unknown>).customer_cnpj
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function companyNameFromMetadata(sub: Subscription): string | null {
  const m = sub.metadata
  if (!m || typeof m !== 'object') return null
  const raw =
    (m as Record<string, unknown>).company_name ??
    (m as Record<string, unknown>).customer_contact_name
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/** Resolve CNPJ de todas as fontes disponíveis (sem validar dígitos). */
export function resolveCustomerCnpj(sources: CompanyProvisionSources): string | null {
  return (
    (sources.subscription ? cnpjFromMetadata(sources.subscription) : null) ??
    extractCnpjFromSale(sources.sale ?? null) ??
    extractCnpjFromWebhookPayload(sources.webhookPayload)
  )
}

async function findLeadByEmail(email: string) {
  if (!email.trim()) return null
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('nr01_leads')
    .select('company_name, collaborators_count')
    .eq('email', email.trim().toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as { company_name: string | null; collaborators_count: number | null } | null
}

async function resolveOrgAccountId(userId: string, orgAccountId: string | null): Promise<string | null> {
  if (orgAccountId) return orgAccountId
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

async function linkSubscriptionToCompany(
  subscriptionId: string,
  companyId: string,
): Promise<void> {
  const admin = createServiceRoleAdmin()
  await admin.from('subscriptions').update({ company_id: companyId }).eq('id', subscriptionId)
}

export async function provisionCompanyFromKiwify(
  hints: CompanyProvisionHints,
): Promise<CompanyProvisionResult> {
  const admin = createServiceRoleAdmin()
  const { userId, email, subscription, sale } = hints

  if (subscription.company_id) {
    return { companyId: subscription.company_id }
  }

  const orgId = await resolveOrgAccountId(userId, hints.orgAccountId)
  if (!orgId) {
    return { companyId: null, skippedReason: 'sem org_account' }
  }

  const { data: existingInOrg } = await admin
    .from('companies')
    .select('id')
    .eq('org_account_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingInOrg?.id) {
    await linkSubscriptionToCompany(subscription.id, existingInOrg.id as string)
    return { companyId: existingInOrg.id as string }
  }

  const cnpjRaw = resolveCustomerCnpj({
    subscription,
    sale,
    webhookPayload: hints.webhookPayload,
  })

  if (!cnpjRaw) {
    return { companyId: null, skippedReason: 'cnpj não disponível' }
  }

  const digits = normalizeCnpj(cnpjRaw)
  if (!isValidCnpj(digits)) {
    return { companyId: null, skippedReason: 'cnpj inválido' }
  }

  const { data: existingByCnpj } = await admin
    .from('companies')
    .select('id, org_account_id, account_user_id')
    .eq('cnpj', digits)
    .maybeSingle()

  if (existingByCnpj?.id) {
    const sameOwner =
      existingByCnpj.account_user_id === userId || existingByCnpj.org_account_id === orgId
    if (sameOwner) {
      await linkSubscriptionToCompany(subscription.id, existingByCnpj.id as string)
      return { companyId: existingByCnpj.id as string }
    }
    return { companyId: null, skippedReason: 'cnpj já cadastrado para outro titular' }
  }

  try {
    const slots = slotsFromMetadata(subscription.metadata)
    await assertCanAddOrgCompany(userId, orgId, { slotsFromCurrentContract: slots })
  } catch (e) {
    return { companyId: null, skippedReason: e instanceof Error ? e.message : 'limite CNPJ' }
  }

  const lead = await findLeadByEmail(email)
  const meta = subscription.metadata as Record<string, unknown> | null
  const companyName =
    lead?.company_name?.trim() ||
    companyNameFromMetadata(subscription) ||
    sale?.customer?.name?.trim() ||
    `Empresa ${digits.slice(0, 8)}`

  const headcount =
    (typeof meta?.headcount_declared === 'number' ? meta.headcount_declared : null) ||
    lead?.collaborators_count ||
    1

  const { data: created, error } = await admin
    .from('companies')
    .insert({
      name: companyName,
      cnpj: digits,
      total_collaborators: Math.max(1, Math.round(headcount)),
      consultant_id: userId,
      org_account_id: orgId,
      account_user_id: userId,
    } as never)
    .select('id')
    .single()

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      const { data: raced } = await admin
        .from('companies')
        .select('id, account_user_id, org_account_id')
        .eq('cnpj', digits)
        .maybeSingle()
      if (
        raced?.id &&
        (raced.account_user_id === userId || raced.org_account_id === orgId)
      ) {
        await linkSubscriptionToCompany(subscription.id, raced.id as string)
        return { companyId: raced.id as string }
      }
      return { companyId: null, skippedReason: 'cnpj já cadastrado (concorrência)' }
    }
    console.error('[provision-company-kiwify] insert failed:', error.message)
    return { companyId: null, skippedReason: error.message ?? 'falha insert' }
  }

  if (!created?.id) {
    return { companyId: null, skippedReason: 'falha insert' }
  }

  await linkSubscriptionToCompany(subscription.id, created.id as string)
  console.info('[provision-company-kiwify] empresa criada', {
    companyId: created.id,
    userId,
    orgId,
  })
  return { companyId: created.id as string }
}
