/**
 * Server actions — delega ao loader de página (mesmo escopo org).
 */

import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'
import {
  getNr01PageActor,
  loadNr01AssessmentForPage,
  type Nr01PageContext,
} from '@/lib/nr01/require-assessment-page'

export { loadNr01AssessmentForPage, getNr01PageActor, tryLoadNr01Assessment } from '@/lib/nr01/require-assessment-page'
export type { Nr01PageContext }

export async function resolveActorRole(): Promise<UserRole> {
  const { role } = await getNr01PageActor()
  return role
}

export interface Nr01AssessmentAccessContext<T = Record<string, unknown>> {
  db: Nr01PageContext['db']
  userClient: Nr01PageContext['userClient']
  user: Nr01PageContext['user']
  role: UserRole
  assessment: T
}

export async function ensureNr01AssessmentAccess<T = Record<string, unknown>>(
  assessmentId: string,
  select = 'id, consultant_id, company_id, status',
): Promise<Nr01AssessmentAccessContext<T>> {
  const ctx = await loadNr01AssessmentForPage<T>(assessmentId, select)
  return {
    db: ctx.db,
    userClient: ctx.userClient,
    user: ctx.user,
    role: ctx.role,
    assessment: ctx.assessment,
  }
}
