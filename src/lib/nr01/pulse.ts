/**
 * QUANTUM5G — Helpers de micro-pulsos
 *
 * - selectQuestionsForWeek: escolhe N questões com constraint de não repetir
 *   dimensão na mesma semana (default 3).
 * - hashEmail: HMAC pseudonimização por-avaliação (mesmo padrão do hashIp).
 * - buildPulseUrl: constrói o link absoluto de coleta a partir do token.
 * - normalizeEmails: parse/dedup/lower/sanity de uma lista bruta.
 */

import { createHash } from 'crypto'
import type { Nr01DimensionCode, Nr01Question } from '@/types/nr01'

// ============================================================
// Seleção de questões
// ============================================================

export interface SelectQuestionsArgs {
  questions: Nr01Question[]
  count?: number              // default 3
  excludeQuestionIds?: string[]  // para evitar repetição imediata
  rng?: () => number           // injetável para testes (default Math.random)
}

export function selectQuestionsForWeek(args: SelectQuestionsArgs): Nr01Question[] {
  const count = args.count ?? 3
  const exclude = new Set(args.excludeQuestionIds ?? [])
  const rng = args.rng ?? Math.random

  // Pool ativo, sem questões recentemente usadas
  const pool = args.questions.filter((q) => q.is_active && !exclude.has(q.id))
  if (pool.length === 0) return []

  // Agrupa por dimensão
  const byDim = new Map<Nr01DimensionCode, Nr01Question[]>()
  for (const q of pool) {
    if (!byDim.has(q.dimension_code)) byDim.set(q.dimension_code, [])
    byDim.get(q.dimension_code)!.push(q)
  }

  // Embaralha as dimensões e pega 1 questão de cada até atingir count
  const dimensions = [...byDim.keys()].sort(() => rng() - 0.5)
  const picked: Nr01Question[] = []

  for (const dim of dimensions) {
    if (picked.length >= count) break
    const arr = byDim.get(dim)!
    const choice = arr[Math.floor(rng() * arr.length)]
    picked.push(choice)
  }

  // Se o pool de dimensões for menor que count, completa com extras
  // permitindo segunda dim apenas como fallback (raro: 10 dims, count tipicamente 3-5)
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((p) => p.id))
    const remaining = pool.filter((q) => !pickedIds.has(q.id))
    while (picked.length < count && remaining.length > 0) {
      const i = Math.floor(rng() * remaining.length)
      picked.push(remaining[i])
      remaining.splice(i, 1)
    }
  }

  return picked
}

// ============================================================
// Hash de email — sal por avaliação
// ============================================================

export function hashEmail(email: string, assessmentId: string): string {
  const normalized = email.trim().toLowerCase()
  const salt = `${assessmentId}|nr01-quantum5g-pulse`
  return createHash('sha256').update(`${normalized}|${salt}`, 'utf-8').digest('hex')
}

// ============================================================
// Normalização de lista de emails
// ============================================================

export interface NormalizedEmails {
  valid: string[]
  invalid: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmails(raw: string): NormalizedEmails {
  // Aceita separadores: vírgula, ponto-e-vírgula, espaço, quebra de linha
  const tokens = raw.split(/[\s,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const t of tokens) {
    if (seen.has(t)) continue
    seen.add(t)
    if (EMAIL_RE.test(t)) valid.push(t)
    else invalid.push(t)
  }
  return { valid, invalid }
}

// ============================================================
// URL de pulso (link público)
// ============================================================

export function buildPulseUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/nr01/pulso/${token}`
}
