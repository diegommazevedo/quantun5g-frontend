/**
 * Filtro de empresas visíveis ao usuário logado (lista e detalhe).
 * Legado: líder vê CNPJs vinculados por account_user_id; staff por consultant_id.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { isPlatformStaff } from '@/lib/auth/roles'
import { isLicensingV2 } from '@/lib/licensing/model'

function useAccountUserFilter(role: UserRole): boolean {
  return role === 'leader' && !isLicensingV2()
}

/** Admin vê todas as empresas (RLS `companies_select`); não filtrar por dono. */
function useOwnershipFilter(role: UserRole): boolean {
  return role !== 'admin'
}

export async function fetchCompaniesForActor<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  select: string,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  let q = supabase.from('companies').select(select)
  if (useOwnershipFilter(role)) {
    if (useAccountUserFilter(role)) {
      q = q.eq('account_user_id', userId)
    } else {
      q = q.eq('consultant_id', userId)
    }
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
  if (useOwnershipFilter(role)) {
    if (useAccountUserFilter(role)) {
      q = q.eq('account_user_id', userId)
    } else {
      q = q.eq('consultant_id', userId)
    }
  }
  const res = await q.maybeSingle()
  return res as { data: T | null; error: { message: string } | null }
}
