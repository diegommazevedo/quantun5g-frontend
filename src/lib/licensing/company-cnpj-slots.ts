/**
 * Limite de empresas (CNPJs) por contrato — plano base = 1 CNPJ.
 * Persistido em metadata de fatura/assinatura; sem coluna extra no banco (80/20).
 *
 * V2: limite e contagem pelo consultor licenciado (`consultant_id`).
 * Legado: contagem por `account_user_id` (líder pagante).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isLicensingV2 } from '@/lib/licensing/model'

export const COMPANY_CNPJ_SLOTS_META_KEY = 'company_cnpj_slots' as const
export const COMPANY_CNPJ_SLOTS_DEFAULT = 1
export const COMPANY_CNPJ_SLOTS_MAX = 50

export function parseCompanyCnpjSlots(raw: unknown): number {
  const n =
    typeof raw === 'number'
      ? Math.round(raw)
      : parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 1) return COMPANY_CNPJ_SLOTS_DEFAULT
  return Math.min(n, COMPANY_CNPJ_SLOTS_MAX)
}

export function slotsFromMetadata(meta: unknown): number {
  if (!meta || typeof meta !== 'object') return COMPANY_CNPJ_SLOTS_DEFAULT
  return parseCompanyCnpjSlots((meta as Record<string, unknown>)[COMPANY_CNPJ_SLOTS_META_KEY])
}

export function formatCompanyCnpjSlotsShort(slots: number): string {
  const n = parseCompanyCnpjSlots(slots)
  return n === 1 ? '1 CNPJ' : `${n} CNPJs`
}

function maxSlots(...values: number[]): number {
  return values.length ? Math.max(...values) : COMPANY_CNPJ_SLOTS_DEFAULT
}

/** Limite vigente para o usuário líder (fatura ativa ou assinatura). */
export async function getCompanyCnpjSlotsLimitForUser(userId: string): Promise<number> {
  const admin = createServiceRoleAdmin()
  let limit = COMPANY_CNPJ_SLOTS_DEFAULT

  const { data: inv } = await admin
    .from('commercial_invoices')
    .select('metadata, status')
    .eq('user_id', userId)
    .neq('status', 'cancelada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inv?.metadata) {
    limit = maxSlots(limit, slotsFromMetadata(inv.metadata))
  }

  const { data: subs } = await admin
    .from('subscriptions')
    .select('metadata, status')
    .eq('user_id', userId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5)

  for (const sub of subs ?? []) {
    if (sub?.metadata) limit = maxSlots(limit, slotsFromMetadata(sub.metadata))
  }

  return limit
}

export async function countLeaderCompanies(leaderUserId: string): Promise<number> {
  const admin = createServiceRoleAdmin()
  const { count, error } = await admin
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('account_user_id', leaderUserId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function countConsultantCompanies(consultantUserId: string): Promise<number> {
  const admin = createServiceRoleAdmin()
  const { count, error } = await admin
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_id', consultantUserId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export interface CompanyCnpjSlotsUsage {
  limit: number
  used: number
  remaining: number
}

export async function getCompanyCnpjSlotsUsage(leaderUserId: string): Promise<CompanyCnpjSlotsUsage> {
  const limit = await getCompanyCnpjSlotsLimitForUser(leaderUserId)
  const used = await countLeaderCompanies(leaderUserId)
  return { limit, used, remaining: Math.max(0, limit - used) }
}

export async function getCompanyCnpjSlotsUsageForConsultant(
  consultantUserId: string,
): Promise<CompanyCnpjSlotsUsage> {
  const limit = await getCompanyCnpjSlotsLimitForUser(consultantUserId)
  const used = await countConsultantCompanies(consultantUserId)
  return { limit, used, remaining: Math.max(0, limit - used) }
}

/** Uso vigente conforme flag V2 (consultor) ou legado (líder pagante). */
export async function getCompanyCnpjSlotsUsageForActor(
  userId: string,
): Promise<CompanyCnpjSlotsUsage> {
  if (isLicensingV2()) return getCompanyCnpjSlotsUsageForConsultant(userId)
  return getCompanyCnpjSlotsUsage(userId)
}

/** Bloqueia novo CNPJ quando o líder já atingiu o limite contratado. */
export async function assertCanAddLeaderCompany(
  leaderUserId: string,
  opts?: { slotsFromCurrentContract?: number },
): Promise<void> {
  const resolved = await getCompanyCnpjSlotsLimitForUser(leaderUserId)
  const limit = opts?.slotsFromCurrentContract
    ? Math.max(resolved, parseCompanyCnpjSlots(opts.slotsFromCurrentContract))
    : resolved
  const count = await countLeaderCompanies(leaderUserId)
  if (count >= limit) {
    throw new Error(
      `Limite de ${formatCompanyCnpjSlotsShort(limit)} atingido para este cliente. ` +
        'Emita nova fatura com quantidade maior ou cadastre outro CNPJ em contrato com slots disponíveis.',
    )
  }
}

/** V2 — bloqueia novo CNPJ quando o consultor licenciado atingiu o limite. */
export async function assertCanAddConsultantCompany(
  consultantUserId: string,
  opts?: { slotsFromCurrentContract?: number },
): Promise<void> {
  const resolved = await getCompanyCnpjSlotsLimitForUser(consultantUserId)
  const limit = opts?.slotsFromCurrentContract
    ? Math.max(resolved, parseCompanyCnpjSlots(opts.slotsFromCurrentContract))
    : resolved
  const count = await countConsultantCompanies(consultantUserId)
  if (count >= limit) {
    throw new Error(
      `Limite de ${formatCompanyCnpjSlotsShort(limit)} atingido na sua licença. ` +
        'Emita nova fatura em Contratação (plano B2B para grupos multi-CNPJ).',
    )
  }
}

/** Conta CNPJs cadastrados na org do contratante self-serve. */
async function countOrgCompanies(orgAccountId: string): Promise<number> {
  const admin = createServiceRoleAdmin()
  const { count, error } = await admin
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('org_account_id', orgAccountId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Self-serve — bloqueia novo CNPJ quando o contratante atingiu o limite do plano contratado.
 *  Limite lido da fatura/assinatura do `ownerUserId` (auth.uid() do contratante). */
export async function assertCanAddOrgCompany(
  ownerUserId: string,
  orgAccountId: string,
  opts?: { slotsFromCurrentContract?: number },
): Promise<void> {
  const resolved = await getCompanyCnpjSlotsLimitForUser(ownerUserId)
  const limit = opts?.slotsFromCurrentContract
    ? Math.max(resolved, parseCompanyCnpjSlots(opts.slotsFromCurrentContract))
    : resolved
  const count = await countOrgCompanies(orgAccountId)
  if (count >= limit) {
    throw new Error(
      `Limite de ${formatCompanyCnpjSlotsShort(limit)} atingido no seu plano. ` +
        'Para adicionar mais CNPJs, atualize seu plano em Contratação.',
    )
  }
}

/** Retorna uso de slots para uma org de contratante. */
export async function getCompanyCnpjSlotsUsageForOrg(
  ownerUserId: string,
  orgAccountId: string,
): Promise<CompanyCnpjSlotsUsage> {
  const limit = await getCompanyCnpjSlotsLimitForUser(ownerUserId)
  const used = await countOrgCompanies(orgAccountId)
  return { limit, used, remaining: Math.max(0, limit - used) }
}
