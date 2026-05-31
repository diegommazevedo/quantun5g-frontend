/**
 * Limite de empresas (CNPJs) por contrato — plano base = 1 CNPJ.
 * Persistido em metadata de fatura/assinatura; sem coluna extra no banco (80/20).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

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
