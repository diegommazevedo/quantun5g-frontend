/**
 * QUANTUM5G — Módulo NR-01 | Helpers de Instrumento (client-safe)
 *
 * Só tipos/constantes/funções puras — sem imports server-only (next/headers,
 * supabase server client). Pode ser importado tanto por Server Components/
 * Server Actions quanto por Client Components (ex: ColetaFormClient,
 * PulsoFormClient).
 */

import type { Nr01Dimension, Nr01Question } from '@/types/nr01'

export interface DimensionWithQuestions {
  dimension: Nr01Dimension
  questions: Nr01Question[]
}

export interface ParsedAnswerInput {
  question_id: string
  value: number
}

export function validateAnswers(
  respostas: Record<string, number>,
  questions: Nr01Question[],
): { ok: true; answers: ParsedAnswerInput[] } | { ok: false; missing: string[] } {
  const missing: string[] = []
  const answers: ParsedAnswerInput[] = []
  for (const q of questions) {
    const value = respostas[q.id]
    if (value == null || !Number.isInteger(value) || value < 1 || value > 5) {
      missing.push(q.id)
      continue
    }
    answers.push({ question_id: q.id, value })
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true, answers }
}

// ============================================================
// LIKERT LABELS — literais do NR01_GRO.docx, linhas 17-25.
// Patch 005 (2026-04-19): atualizado para texto oficial do doc.
// ============================================================

export const LIKERT_LABELS = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo parcialmente' },
  { value: 3, label: 'Nem concordo, nem discordo' },
  { value: 4, label: 'Concordo parcialmente' },
  { value: 5, label: 'Concordo totalmente' },
] as const
