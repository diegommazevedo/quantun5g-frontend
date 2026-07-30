/**
 * QUANTUM5G — Módulo NR-01 | Helpers de Instrumento (server-only)
 *
 * Carrega questões + dimensões da base (usa o client Supabase de servidor).
 * Tipos/constantes/validação client-safe ficam em instrument-shared.ts —
 * NÃO importe este arquivo a partir de Client Components (traria
 * next/headers para o bundle do browser). Use instrument-shared.ts nesse caso.
 */

import { createClient } from '@/lib/supabase/server'
import {
  Nr01Dimension,
  Nr01DimensionCode,
  Nr01Question,
  NR01_DIMENSION_CODES,
} from '@/types/nr01'
import type { DimensionWithQuestions } from '@/lib/nr01/instrument-shared'

export type { DimensionWithQuestions, ParsedAnswerInput } from '@/lib/nr01/instrument-shared'
export { validateAnswers, LIKERT_LABELS } from '@/lib/nr01/instrument-shared'

export async function loadInstrument(version = 'v1.1'): Promise<DimensionWithQuestions[]> {
  const supabase = await createClient()
  const [{ data: dims, error: dimsErr }, { data: qs, error: qsErr }] = await Promise.all([
    supabase.from('nr01_dimensions').select('*').order('ord'),
    supabase
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', version)
      .eq('is_active', true)
      .order('ord'),
  ])

  if (dimsErr) throw new Error(`Falha ao carregar dimensões: ${dimsErr.message}`)
  if (qsErr) throw new Error(`Falha ao carregar questões: ${qsErr.message}`)

  const dimensions = (dims ?? []) as Nr01Dimension[]
  const questions = (qs ?? []) as Nr01Question[]

  const byCode = new Map<Nr01DimensionCode, Nr01Question[]>()
  for (const code of NR01_DIMENSION_CODES) byCode.set(code, [])
  for (const q of questions) {
    if (byCode.has(q.dimension_code)) byCode.get(q.dimension_code)!.push(q)
  }

  return dimensions
    .filter((d) => NR01_DIMENSION_CODES.includes(d.code))
    .map((d) => ({
      dimension: d,
      questions: (byCode.get(d.code) ?? []).sort((a, b) => a.ord - b.ord),
    }))
}
