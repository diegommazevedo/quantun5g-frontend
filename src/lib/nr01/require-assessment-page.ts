/**
 * Loader único das páginas /nr01/avaliacao/[id]/* — espelha o painel NR-01 (company_id IN).
 * Nunca usa notFound(): redireciona ao painel se fora do escopo.
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'
import { isPlatformStaff } from '@/lib/auth/roles'
import { getPageActor } from '@/lib/org/page-actor'
import { loadOrgActorContext } from '@/lib/org/access'
import { loadCompanyIdsForContratante, loadCompanyIdsForGerente } from '@/lib/org/queries'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'

const ASSESSMENT_MISS = '/nr01/dashboard?error=avaliacao-nao-encontrada'

export interface Nr01PageContext<T = Record<string, unknown>> {
  user: { id: string; email?: string | null }
  role: UserRole
  userClient: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
  db: ReturnType<typeof createServiceRoleAdmin>
  assessment: T
}

export const getNr01PageActor = cache(async () => getPageActor())

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

    const companyIds = await loadCompanyIdsForContratante(user.id)
    if (!companyIds.length) redirect(ASSESSMENT_MISS)

    const admin = createServiceRoleAdmin()
    const { data, error } = await admin
      .from('nr01_assessments')
      .select(select)
      .eq('id', assessmentId)
      .in('company_id', companyIds)
      .maybeSingle()

    if (error) console.error('[loadNr01AssessmentForPage:contratante]', error.message, { assessmentId, orgId: ctx.org.id })
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
