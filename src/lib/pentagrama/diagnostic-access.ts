/**
 * Server actions — delega ao loader de página (mesmo escopo org).
 */

import type { UserRole } from '@/types/database'
import {
  getDiagnosticPageActor,
  loadDiagnosticForPage,
  type DiagnosticPageContext,
} from '@/lib/pentagrama/require-diagnostic-page'

export {
  loadDiagnosticForPage,
  getDiagnosticPageActor,
  tryLoadDiagnosticForPage,
} from '@/lib/pentagrama/require-diagnostic-page'
export type { DiagnosticPageContext }

export async function ensureDiagnosticAccess<T = Record<string, unknown>>(
  diagnosticId: string,
  select = 'id, consultant_id, company_id, status',
): Promise<DiagnosticPageContext<T>> {
  const ctx = await loadDiagnosticForPage<T>(diagnosticId, select)
  return ctx
}

export async function resolveDiagnosticActorRole(): Promise<UserRole> {
  const { role } = await getDiagnosticPageActor()
  return role
}
