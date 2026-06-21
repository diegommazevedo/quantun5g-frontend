/**
 * Loader único das páginas /nr01/avaliacao/[id]/* — espelha Equipe e filiais (org + service role).
 * Nunca usa notFound(): redireciona ao painel se fora do escopo.
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'
import { isPlatformStaff } from '@/lib/auth/roles'
import { loadOrgActorContext } from '@/lib/org/access'
import { loadCompanyIdsForGerente } from '@/lib/org/queries'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { supabaseForActorRole } from '@/lib/org/scoped-db'

const ASSESSMENT_MISS = '/nr01/dashboard?error=avaliacao-nao-encontrada'

export interface Nr01PageContext<T = Record<string, unknown>> {
  user: { id: string; email?: string | null }
  role: UserRole
  userClient: Awaited<ReturnType<typeof createClient>>
  db: ReturnType<typeof createServiceRoleAdmin>
  assessment: T
}

function withCompanyInnerJoin(select: string): string {
  if (select.includes('!inner')) return select
  if (select.includes('companies:companies!nr01_assessments_company_id_fkey (')) {
    return select.replace(
      'companies:companies!nr01_assessments_company_id_fkey (',
      'companies:companies!nr01_assessments_company_id_fkey!inner (',
    )
  }
  if (select.includes('companies!nr01_assessments_company_id_fkey (')) {
    return select.replace(
      'companies!nr01_assessments_company_id_fkey (',
      'companies!nr01_assessments_company_id_fkey!inner (',
    )
  }
  if (/companies\s*\(/.test(select) && !select.includes('companies!')) {
    return select.replace(
      /companies\s*\(/,
      'companies:companies!nr01_assessments_company_id_fkey!inner (',
    )
  }
  return `${select}, companies:companies!nr01_assessments_company_id_fkey!inner(org_account_id)`
}

export const getNr01PageActor = cache(async () => {
  const userClient = await createClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()

  const role = (profile?.role ?? 'consultant') as UserRole
  const db = supabaseForActorRole(role, userClient)

  return { user, role, userClient, db }
})

/** Carrega avaliação com escopo validado — uma chamada por request (React cache). */
export const loadNr01AssessmentForPage = cache(async <T = Record<string, unknown>>(
  assessmentId: string,
  select: string,
): Promise<Nr01PageContext<T>> => {
  const { user, role, userClient, db } = await getNr01PageActor()

  if (role === 'admin') {
    const { data, error } = await db.from('nr01_assessments').select(select).eq('id', assessmentId).maybeSingle()
    if (error) console.error('[loadNr01AssessmentForPage:admin]', error.message)
    if (error || !data) redirect(ASSESSMENT_MISS)
    return { user, role, userClient, db, assessment: data as T }
  }

  if (isContratanteRole(role)) {
    const ctx = await loadOrgActorContext(user.id, role)
    if (!ctx.org) redirect('/nr01/dashboard?error=organizacao-nao-configurada')

    const admin = createServiceRoleAdmin()
    const scopedSelect = withCompanyInnerJoin(select)
    const { data, error } = await admin
      .from('nr01_assessments')
      .select(scopedSelect)
      .eq('id', assessmentId)
      .eq('companies.org_account_id', ctx.org.id)
      .maybeSingle()

    if (error) console.error('[loadNr01AssessmentForPage:contratante]', error.message)
    if (error || !data) redirect(ASSESSMENT_MISS)
    return { user, role, userClient, db: admin, assessment: data as T }
  }

  if (isGerenteRole(role)) {
    const companyIds = await loadCompanyIdsForGerente(user.id)
    if (!companyIds.length) redirect(ASSESSMENT_MISS)

    const { data, error } = await db
      .from('nr01_assessments')
      .select(select)
      .eq('id', assessmentId)
      .in('company_id', companyIds)
      .maybeSingle()

    if (error) console.error('[loadNr01AssessmentForPage:gerente]', error.message)
    if (error || !data) redirect(ASSESSMENT_MISS)
    return { user, role, userClient, db, assessment: data as T }
  }

  if (isPlatformStaff(role)) {
    const { data, error } = await db
      .from('nr01_assessments')
      .select(select)
      .eq('id', assessmentId)
      .eq('consultant_id', user.id)
      .maybeSingle()
    if (error) console.error('[loadNr01AssessmentForPage:consultant]', error.message)
    if (error || !data) redirect(ASSESSMENT_MISS)
    return { user, role, userClient, db, assessment: data as T }
  }

  redirect(ASSESSMENT_MISS)
})

/** API routes — retorna null em vez de redirect. */
export async function tryLoadNr01Assessment<T = Record<string, unknown>>(
  assessmentId: string,
  select: string,
): Promise<Nr01PageContext<T> | null> {
  try {
    return await loadNr01AssessmentForPage<T>(assessmentId, select)
  } catch (e) {
    const err = e as { digest?: string }
    if (typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) throw e
    return null
  }
}
