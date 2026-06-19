/**
 * Leitura/escrita de avaliações NR-01 com escopo por papel.
 * Contratante/gerente: service role após validar company_id do grupo.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { loadCompanyIdsForContratante, loadCompanyIdsForGerente } from '@/lib/org/queries'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { supabaseForActorRole } from '@/lib/org/scoped-db'

export async function resolveActorRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRole> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .returns<{ role: UserRole }[]>()
    .single()

  if (error) {
    console.error('[resolveActorRole]', userId, error.message)
  }
  return profile?.role ?? 'consultant'
}

async function isAssessmentInActorScope(
  userId: string,
  role: UserRole,
  row: { company_id?: string; consultant_id?: string },
): Promise<boolean> {
  if (role === 'admin' || role === 'leader') return true

  if (isContratanteRole(role)) {
    const allowed = await loadCompanyIdsForContratante(userId)
    return Boolean(row.company_id && allowed.includes(row.company_id))
  }

  if (isGerenteRole(role)) {
    const allowed = await loadCompanyIdsForGerente(userId)
    return Boolean(row.company_id && allowed.includes(row.company_id))
  }

  return row.consultant_id === userId
}

export async function fetchNr01AssessmentForActor<T = Record<string, unknown>>(
  userClient: SupabaseClient,
  userId: string,
  role: UserRole,
  assessmentId: string,
  select: string,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const db = supabaseForActorRole(role, userClient)
  const res = await db.from('nr01_assessments').select(select).eq('id', assessmentId).maybeSingle()

  if (res.error) {
    console.error('[fetchNr01AssessmentForActor]', assessmentId, res.error.message)
    return { data: null, error: { message: res.error.message } }
  }
  if (!res.data) return { data: null, error: null }

  const row = res.data as { company_id?: string; consultant_id?: string }
  const inScope = await isAssessmentInActorScope(userId, role, row)
  if (!inScope) {
    console.warn('[fetchNr01AssessmentForActor] fora do escopo', { assessmentId, userId, role })
    return { data: null, error: null }
  }

  return { data: res.data as T, error: null }
}

export interface Nr01AssessmentAccessContext<T = Record<string, unknown>> {
  db: SupabaseClient
  userClient: SupabaseClient
  user: { id: string; email?: string | null }
  role: UserRole
  assessment: T
}

/** Server actions e rotas autenticadas — redireciona se fora do escopo. */
export async function ensureNr01AssessmentAccess<T = Record<string, unknown>>(
  assessmentId: string,
  select = 'id, consultant_id, company_id, status',
): Promise<Nr01AssessmentAccessContext<T>> {
  const userClient = await createClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const role = await resolveActorRole(userClient, user.id)
  const { data: assessment, error } = await fetchNr01AssessmentForActor<T>(
    userClient,
    user.id,
    role,
    assessmentId,
    select,
  )
  if (error || !assessment) redirect('/nr01/dashboard?error=avaliacao-nao-encontrada')

  const db = supabaseForActorRole(role, userClient)
  return { db, userClient, user, role, assessment }
}
