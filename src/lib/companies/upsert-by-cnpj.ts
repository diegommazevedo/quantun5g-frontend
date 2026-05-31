/**
 * Empresa vinculada ao consultor por CNPJ (contratação porta a porta).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { normalizeCnpj } from '@/lib/companies/normalize'
import { isValidCnpj } from '@/lib/companies/cnpj'
import { assertCanAddLeaderCompany } from '@/lib/licensing/company-cnpj-slots'

export async function upsertCompanyByCnpj(params: {
  consultantId: string
  cnpj: string
  legalName?: string | null
  leaderUserId?: string | null
  whatsapp?: string | null
  /** Slots da fatura em emissão (ainda não gravada no banco). */
  companyCnpjSlots?: number
}): Promise<string> {
  const digits = normalizeCnpj(params.cnpj)
  if (!isValidCnpj(digits)) throw new Error('CNPJ inválido')

  const admin = createServiceRoleAdmin()
  const name = params.legalName?.trim() || `Empresa ${digits.slice(0, 8)}`

  const { data: existing } = await admin
    .from('companies')
    .select('id, consultant_id')
    .eq('cnpj', digits)
    .maybeSingle()

  if (existing?.id) {
    if (existing.consultant_id !== params.consultantId) {
      throw new Error('CNPJ já cadastrado para outro consultor')
    }
    const patch: Record<string, unknown> = { name }
    if (params.leaderUserId) patch.account_user_id = params.leaderUserId
    await admin.from('companies').update(patch as never).eq('id', existing.id)
    return existing.id as string
  }

  if (params.leaderUserId) {
    await assertCanAddLeaderCompany(params.leaderUserId, {
      slotsFromCurrentContract: params.companyCnpjSlots,
    })
  }

  const { data: created, error } = await admin
    .from('companies')
    .insert({
      name,
      cnpj: digits,
      consultant_id: params.consultantId,
      account_user_id: params.leaderUserId ?? null,
    } as never)
    .select('id')
    .single()

  if (error || !created?.id) {
    throw new Error(error?.message ?? 'Falha ao cadastrar empresa')
  }

  void params.whatsapp
  return created.id as string
}
