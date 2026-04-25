/**
 * QUANTUM5G — Helpers de micro-pulsos
 *
 * - selectQuestionsForWeek: escolhe N questões com constraint de não repetir
 *   dimensão na mesma semana (default 3).
 * - hashEmail: HMAC pseudonimização por-avaliação (mesmo padrão do hashIp).
 * - buildPulseUrl: constrói o link absoluto de coleta a partir do token.
 * - normalizeEmails: parse/dedup/lower/sanity de uma lista bruta.
 */

import { createHmac } from 'crypto'
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
// Hash de email — pseudonimização forte HMAC-SHA256
// ============================================================

/**
 * Hash de email para tabela de convites de pulse (anti-deduplicação) com
 * pseudonimização forte HMAC-SHA256.
 *
 * Mesmo princípio do hashIp: chave NR01_EMAIL_HASH_SALT em env var Sensitive
 * de produção, fora do código. assessmentId compõe o escopo, evitando
 * correlação cross-assessment.
 *
 * @throws Error se NR01_EMAIL_HASH_SALT ausente ou < 64 chars hex (32 bytes).
 */
export function hashEmail(email: string, assessmentId: string): string {
  const key = process.env.NR01_EMAIL_HASH_SALT
  if (!key) {
    throw new Error(
      'NR01_EMAIL_HASH_SALT não configurado. ' +
      'Pseudonimização de email exige chave HMAC em variável de ambiente. ' +
      'Gerar com `openssl rand -hex 32` e adicionar em Vercel (Production, Sensitive).',
    )
  }
  if (key.length < 64) {
    throw new Error(
      'NR01_EMAIL_HASH_SALT muito curto. Esperado: ≥64 caracteres hex (32 bytes). ' +
      'Gerar novo salt com `openssl rand -hex 32`.',
    )
  }

  const normalized = email.trim().toLowerCase()
  return createHmac('sha256', key)
    .update(`${normalized}|${assessmentId}`, 'utf-8')
    .digest('hex')
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
