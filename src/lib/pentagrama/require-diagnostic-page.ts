/**
 * Loader único das páginas /diagnostico/[id]/* — espelha empresas e NR-01 (org + service role).
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

const DIAG_MISS = '/dashboard?error=diagnostico-nao-encontrado'

export interface DiagnosticPageContext<T = Record<string, unknown>> {
  user: { id: string; email?: string | null }
  role: UserRole
  userClient: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
  db: ReturnType<typeof createServiceRoleAdmin>
  diagnostic: T
}

export const getDiagnosticPageActor = cache(async () => getPageActor())

export const loadDiagnosticForPage = cache(async <T = Record<string, unknown>>(
  diagnosticId: string,
  select: string,
): Promise<DiagnosticPageContext<T>> => {
  const { user, role, userClient, db } = await getDiagnosticPageActor()

  if (role === 'admin') {
    const { data, error } = await db.from('diagnostics').select(select).eq('id', diagnosticId).maybeSingle()
    if (error) console.error('[loadDiagnosticForPage:admin]', error.message)
    if (error || !data) redirect(DIAG_MISS)
    return { user, role, userClient, db, diagnostic: data as T }
  }

  if (isContratanteRole(role)) {
    const ctx = await loadOrgActorContext(user.id, role)
    if (!ctx.org) redirect('/dashboard?error=organizacao-nao-configurada')

    const companyIds = await loadCompanyIdsForContratante(user.id)
    if (!companyIds.length) redirect(DIAG_MISS)

    const admin = createServiceRoleAdmin()
    const { data, error } = await admin
      .from('diagnostics')
      .select(select)
      .eq('id', diagnosticId)
      .in('company_id', companyIds)
      .maybeSingle()

    if (error) console.error('[loadDiagnosticForPage:contratante]', error.message)
    if (error || !data) redirect(DIAG_MISS)
    return { user, role, userClient, db: admin, diagnostic: data as T }
  }

  if (isGerenteRole(role)) {
    const companyIds = await loadCompanyIdsForGerente(user.id)
    if (!companyIds.length) redirect(DIAG_MISS)

    const { data, error } = await db
      .from('diagnostics')
      .select(select)
      .eq('id', diagnosticId)
      .in('company_id', companyIds)
      .maybeSingle()

    if (error) console.error('[loadDiagnosticForPage:gerente]', error.message)
    if (error || !data) redirect(DIAG_MISS)
    return { user, role, userClient, db, diagnostic: data as T }
  }

  if (isPlatformStaff(role)) {
    const { data, error } = await db
      .from('diagnostics')
      .select(select)
      .eq('id', diagnosticId)
      .eq('consultant_id', user.id)
      .maybeSingle()
    if (error) console.error('[loadDiagnosticForPage:consultant]', error.message)
    if (error || !data) redirect(DIAG_MISS)
    return { user, role, userClient, db, diagnostic: data as T }
  }

  redirect(DIAG_MISS)
})

export async function tryLoadDiagnosticForPage<T = Record<string, unknown>>(
  diagnosticId: string,
  select: string,
): Promise<DiagnosticPageContext<T> | null> {
  try {
    return await loadDiagnosticForPage<T>(diagnosticId, select)
  } catch (e) {
    const err = e as { digest?: string }
    if (typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) throw e
    return null
  }
}
