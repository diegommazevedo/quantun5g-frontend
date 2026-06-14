/**
 * Filtro de empresas visíveis ao usuário logado (lista e detalhe).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { isLicensingV2 } from '@/lib/licensing/model'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import {
  loadCompanyIdsForContratante,
  loadCompanyIdsForGerente,
} from '@/lib/org/queries'

const EMPTY_ID = '00000000-0000-0000-0000-000000000000'

function useAccountUserFilter(role: UserRole): boolean {
  return role === 'leader' && !isLicensingV2()
}

export async function fetchCompaniesForActor<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  select: string,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  let q = supabase.from('companies').select(select)

  if (role === 'admin') {
    // sem filtro
  } else if (isContratanteRole(role)) {
    const ids = await loadCompanyIdsForContratante(userId)
    q = q.in('id', ids.length ? ids : [EMPTY_ID])
  } else if (isGerenteRole(role)) {
    const ids = await loadCompanyIdsForGerente(userId)
    q = q.in('id', ids.length ? ids : [EMPTY_ID])
  } else if (useAccountUserFilter(role)) {
    q = q.eq('account_user_id', userId)
  } else {
    q = q.eq('consultant_id', userId)
  }

  const res = await q.order('name')
  return res as { data: T[] | null; error: { message: string } | null }
}

export async function fetchCompanyForActor<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  companyId: string,
  select: string,
): Promise<{ data: T | null; error: { message: string } | null }> {
  let q = supabase.from('companies').select(select).eq('id', companyId)

  if (role === 'admin') {
    // sem filtro extra
  } else if (isContratanteRole(role)) {
    const ids = await loadCompanyIdsForContratante(userId)
    if (!ids.includes(companyId)) q = q.eq('id', EMPTY_ID)
  } else if (isGerenteRole(role)) {
    const ids = await loadCompanyIdsForGerente(userId)
    if (!ids.includes(companyId)) q = q.eq('id', EMPTY_ID)
  } else if (useAccountUserFilter(role)) {
    q = q.eq('account_user_id', userId)
  } else {
    q = q.eq('consultant_id', userId)
  }

  const res = await q.maybeSingle()
  return res as { data: T | null; error: { message: string } | null }
}
