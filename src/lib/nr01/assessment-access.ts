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

const EMPTY_SCOPED_ID = '00000000-0000-0000-0000-000000000000'

export async function resolveActorRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRole> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .returns<{ role: UserRole }[]>()
    .maybeSingle()
  return profile?.role ?? 'consultant'
}

export async function fetchNr01AssessmentForActor<T = Record<string, unknown>>(
  userClient: SupabaseClient,
  userId: string,
  role: UserRole,
  assessmentId: string,
  select: string,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const db = supabaseForActorRole(role, userClient)
  let q = db.from('nr01_assessments').select(select).eq('id', assessmentId)

  if (role === 'admin' || role === 'leader') {
    // sem filtro extra
  } else if (isContratanteRole(role)) {
    const ids = await loadCompanyIdsForContratante(userId)
    q = q.in('company_id', ids.length ? ids : [EMPTY_SCOPED_ID])
  } else if (isGerenteRole(role)) {
    const ids = await loadCompanyIdsForGerente(userId)
    q = q.in('company_id', ids.length ? ids : [EMPTY_SCOPED_ID])
  } else {
    q = q.eq('consultant_id', userId)
  }

  const res = await q.maybeSingle()
  return res as { data: T | null; error: { message: string } | null }
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
  if (error || !assessment) redirect('/nr01/dashboard')

  const db = supabaseForActorRole(role, userClient)
  return { db, userClient, user, role, assessment }
}
