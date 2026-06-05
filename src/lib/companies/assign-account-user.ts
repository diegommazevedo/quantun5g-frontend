/**
 * Vincula empresa ao usuário pagante (account_user_id) com checagem de slots.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { assertCanAddLeaderCompany } from '@/lib/licensing/company-cnpj-slots'
import { isLicensingV2 } from '@/lib/licensing/model'

export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@')) return null
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

/** Atribui account_user_id se ainda não vinculado a outro líder; valida limite de CNPJs. */
export async function assignCompanyAccountUser(
  companyId: string,
  leaderUserId: string,
): Promise<void> {
  const admin = createServiceRoleAdmin()
  const { data: row } = await admin
    .from('companies')
    .select('id, account_user_id')
    .eq('id', companyId)
    .single()

  if (!row) throw new Error('Empresa não encontrada')
  const current = (row as { account_user_id: string | null }).account_user_id
  if (current && current !== leaderUserId) {
    throw new Error('Empresa já vinculada a outro usuário responsável.')
  }
  if (current === leaderUserId) return

  // V2: slots pelo consultor; account_user_id é legado (admin / Pasola).
  if (!isLicensingV2()) {
    await assertCanAddLeaderCompany(leaderUserId)
  }
  const { error } = await admin
    .from('companies')
    .update({ account_user_id: leaderUserId } as never)
    .eq('id', companyId)
  if (error) throw new Error(error.message)
}
