/**
 * Carrega IC responses e agrega scores por departamento para o relatório.
 */

import {
  icResponseSelectWithQuestions,
  summarizeIcByDepartment,
  type DepartmentIcSummary,
  type IcResponseRow,
} from '@/lib/pentagrama/ic-department-scores'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadDepartmentIcSummary(
  db: SupabaseClient,
  diagnosticId: string,
): Promise<DepartmentIcSummary | null> {
  const { data, error } = await db
    .from('ic_responses')
    .select(icResponseSelectWithQuestions())
    .eq('diagnostic_id', diagnosticId)

  if (error || !data?.length) return null
  return summarizeIcByDepartment(data as unknown as IcResponseRow[], { minSample: 1 })
}
