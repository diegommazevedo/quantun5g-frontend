/**
 * QUANTUM5G — Módulo NR-01 | Helpers de Instrumento
 *
 * Carrega questões + dimensões da base, agrupa para renderização do formulário
 * e processa a submissão respeitando reverse_scored.
 */

import { createClient } from '@/lib/supabase/server'
import {
  Nr01Dimension,
  Nr01DimensionCode,
  Nr01Question,
  NR01_DIMENSION_CODES,
} from '@/types/nr01'

export interface DimensionWithQuestions {
  dimension: Nr01Dimension
  questions: Nr01Question[]
}

export async function loadInstrument(version = 'v1.0'): Promise<DimensionWithQuestions[]> {
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

// ============================================================
// VALIDAÇÃO DE FORM SUBMISSION
// ============================================================

export interface ParsedAnswerInput {
  question_id: string
  value: number
}

export function parseAnswersFromFormData(
  formData: FormData,
  questions: Nr01Question[],
): { ok: true; answers: ParsedAnswerInput[] } | { ok: false; missing: string[] } {
  const missing: string[] = []
  const answers: ParsedAnswerInput[] = []
  for (const q of questions) {
    const raw = formData.get(`q_${q.id}`)
    if (raw == null || raw === '') {
      missing.push(q.id)
      continue
    }
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      missing.push(q.id)
      continue
    }
    answers.push({ question_id: q.id, value })
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true, answers }
}

// ============================================================
// LIKERT LABELS PADRÃO (pt-BR)
// ============================================================

export const LIKERT_LABELS = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Indiferente' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
] as const
