/**
 * Dados do painel Pentagrama — queries otimizadas por perfil.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { loadCompanyIdsForContratante, loadCompanyIdsForGerente } from '@/lib/org/queries'

export type PentagramaDashboardDiagRow = {
  id: string
  name: string
  status: string
  created_at: string
  leader_name: string | null
  companies: { name: string } | null
}

const DIAG_SELECT = 'id, name, status, created_at, leader_name, companies(name)'

/** Admin: service role (sem overhead RLS). Demais: client scoped do actor. */
function dbForPentagramaDashboard(role: UserRole, actorDb: SupabaseClient): SupabaseClient {
  if (role === 'admin') return createServiceRoleAdmin()
  return actorDb
}

export async function loadPentagramaDashboardDiagnostics(
  role: UserRole,
  userId: string,
  actorDb: SupabaseClient,
): Promise<PentagramaDashboardDiagRow[]> {
  const db = dbForPentagramaDashboard(role, actorDb)
  const isAdmin = role === 'admin'
  const isLeader = role === 'leader'
  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)

  const query = db
    .from('diagnostics')
    .select(DIAG_SELECT)
    .order('created_at', { ascending: false })

  if (!isAdmin && !isLeader && !isContratante && !isGerente) {
    query.eq('consultant_id', userId)
  } else if (isContratante) {
    const ids = await loadCompanyIdsForContratante(userId)
    if (ids.length) query.in('company_id', ids)
    else query.eq('company_id', '00000000-0000-0000-0000-000000000000')
  } else if (isGerente) {
    const ids = await loadCompanyIdsForGerente(userId)
    if (ids.length) query.in('company_id', ids)
    else query.eq('company_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await query
  if (error) {
    console.error('[loadPentagramaDashboardDiagnostics]', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    const companies = row.companies as { name: string } | { name: string }[] | null
    const company = Array.isArray(companies) ? (companies[0] ?? null) : companies
    return {
      id: row.id as string,
      name: row.name as string,
      status: row.status as string,
      created_at: row.created_at as string,
      leader_name: (row.leader_name as string | null) ?? null,
      companies: company,
    }
  })
}

/** Contagem DISTINCT de respondentes IC — RPC se disponível, fallback em memória. */
export async function loadIcRespondentCounts(
  role: UserRole,
  actorDb: SupabaseClient,
  diagnosticIds: string[],
): Promise<Record<string, number>> {
  if (!diagnosticIds.length) return {}

  const db = dbForPentagramaDashboard(role, actorDb)

  const { data: rpcData, error: rpcError } = await db.rpc('internal_ic_respondent_counts', {
    p_diagnostic_ids: diagnosticIds,
  })

  if (!rpcError && rpcData) {
    const out: Record<string, number> = {}
    for (const row of rpcData as { diagnostic_id: string; n_respondents: number }[]) {
      out[row.diagnostic_id] = row.n_respondents ?? 0
    }
    return out
  }

  if (rpcError) {
    console.warn('[loadIcRespondentCounts] rpc fallback:', rpcError.message)
  }

  const { data: icRows } = await db
    .from('ic_responses')
    .select('diagnostic_id, respondente_anonimo_id')
    .in('diagnostic_id', diagnosticIds)

  const seen = new Set<string>()
  const out: Record<string, number> = {}
  for (const row of icRows ?? []) {
    const r = row as { diagnostic_id: string; respondente_anonimo_id: string }
    const key = `${r.diagnostic_id}:${r.respondente_anonimo_id}`
    if (!seen.has(key)) {
      seen.add(key)
      out[r.diagnostic_id] = (out[r.diagnostic_id] ?? 0) + 1
    }
  }
  return out
}
