/**
 * Filtro de empresas visíveis ao usuário logado (lista e detalhe).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { isLicensingV2 } from '@/lib/licensing/model'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import {
  loadGerenteCompaniesWithSelect,
  loadOrgCompaniesWithSelect,
} from '@/lib/org/queries'
import { loadContratanteOrgScope } from '@/lib/org/contratante-scope'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { supabaseForActorRole } from '@/lib/org/scoped-db'

function useAccountUserFilter(role: UserRole): boolean {
  return role === 'leader' && !isLicensingV2()
}

export async function fetchCompaniesForActor<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole,
  select: string,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  if (isContratanteRole(role)) {
    const scope = await loadContratanteOrgScope(userId)
    if (scope.org) {
      const { data, error } = await loadOrgCompaniesWithSelect<T>(scope.org.id, select)
      return { data, error: error ? { message: error } : null }
    }
    if (scope.companyIds.length) {
      const admin = createServiceRoleAdmin()
      const { data, error } = await admin
        .from('companies')
        .select(select)
        .in('id', scope.companyIds)
        .order('name')
      return { data: (data ?? []) as T[], error: error ? { message: error.message } : null }
    }
    return { data: [], error: null }
  }

  if (isGerenteRole(role)) {
    const { data, error } = await loadGerenteCompaniesWithSelect<T>(userId, select)
    return { data, error: error ? { message: error } : null }
  }

  const db = supabaseForActorRole(role, supabase)
  let q = db.from('companies').select(select)

  if (role === 'admin') {
    // sem filtro
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
  if (isContratanteRole(role)) {
    const scope = await loadContratanteOrgScope(userId)
    if (scope.org) {
      const { data } = await loadOrgCompaniesWithSelect<T>(scope.org.id, select)
      const row = data.find((c) => (c as { id?: string }).id === companyId) ?? null
      return { data: row, error: null }
    }
    if (scope.companyIds.includes(companyId)) {
      const admin = createServiceRoleAdmin()
      const { data, error } = await admin
        .from('companies')
        .select(select)
        .eq('id', companyId)
        .maybeSingle()
      return { data: (data as T | null) ?? null, error: error ? { message: error.message } : null }
    }
    return { data: null, error: null }
  }

  if (isGerenteRole(role)) {
    const { data } = await loadGerenteCompaniesWithSelect<T>(userId, select)
    const row = data.find((c) => (c as { id?: string }).id === companyId) ?? null
    return { data: row, error: null }
  }

  const db = supabaseForActorRole(role, supabase)
  let q = db.from('companies').select(select).eq('id', companyId)

  if (role === 'admin') {
    // sem filtro extra
  } else if (useAccountUserFilter(role)) {
    q = q.eq('account_user_id', userId)
  } else {
    q = q.eq('consultant_id', userId)
  }

  const res = await q.maybeSingle()
  return res as { data: T | null; error: { message: string } | null }
}
