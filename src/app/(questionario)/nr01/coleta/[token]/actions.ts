'use server'

/**
 * QUANTUM5G — NR-01 · Submissão pública e anônima
 *
 * Fluxo:
 *  1. Valida o token e a janela de coleta.
 *  2. Carrega questões da versão ativa.
 *  3. Valida que todas as questões obrigatórias foram respondidas (1-5).
 *  4. Cria nr01_responses (com anon_id gerado no servidor) + nr01_response_answers.
 *  5. Audita o evento (com hash do IP).
 *
 * NUNCA armazena identificação pessoal vinculável.
 *
 * IMPORTANTE — client (@/lib/supabase/server) vs service-role:
 *   As LEITURAS de validação (avaliação, throttle) usam o client anon normal,
 *   pois já existem policies RLS públicas para elas.
 *   As ESCRITAS (nr01_responses/nr01_response_answers/throttle/audit) usam o
 *   client service-role: o papel "anon" não tem (e não deve ter) permissão de
 *   SELECT em nr01_responses — expô-la quebraria a confidencialidade das
 *   respostas individuais — e o Postgres exige essa permissão para o
 *   INSERT ... RETURNING usado por `.insert().select()`. Sem isso, o insert
 *   falha com "new row violates row-level security policy" mesmo estando
 *   dentro da janela de coleta. Toda a validação de negócio (token, janela,
 *   throttle, respostas completas) já acontece em código antes da escrita,
 *   então o uso do service-role aqui é seguro — mesmo padrão do IC/IL do
 *   Pentagrama (ver src/app/ic/[token]/actions.ts).
 */

import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { loadInstrument, validateAnswers } from '@/lib/nr01/instrument'
import { hashIp } from '@/lib/nr01/evidence'
import { maybeAutoCompleteOnKThreshold } from '@/lib/nr01/auto-complete-on-k-threshold'

export interface Nr01Contexto {
  setor: string
  funcao: string
  vinculo: string
  tempoCasa: string
  isLeader: boolean
  open1: string
  open2: string
  open3: string
  open4: string
}

export type SubmitNr01Result =
  | { ok: true }
  | { ok: false; error: string }

export async function submeterRespostaNr01(
  token: string,
  contexto: Nr01Contexto,
  respostas: Record<string, number>,
): Promise<SubmitNr01Result> {
  const supabase = await createClient()

  const { data: assess } = await supabase
    .from('nr01_assessments')
    .select('id, status, instrument_version, collection_opens_at, collection_closes_at')
    .eq('collection_token', token)
    .maybeSingle()

  if (!assess) return { ok: false, error: 'Link inválido ou expirado.' }
  const a = assess as {
    id: string
    status: string
    instrument_version: string
    collection_opens_at: string | null
    collection_closes_at: string | null
  }

  const now = new Date()
  if (a.status !== 'COLETANDO') {
    return { ok: false, error: 'Esta coleta foi encerrada.' }
  }
  if (a.collection_opens_at && new Date(a.collection_opens_at) > now) {
    return { ok: false, error: 'Coleta ainda não iniciada.' }
  }
  if (a.collection_closes_at && new Date(a.collection_closes_at) < now) {
    return { ok: false, error: 'A janela de coleta expirou.' }
  }

  // Valida respostas ANTES de qualquer escrita (evita registro parcial)
  const groups = await loadInstrument(a.instrument_version)
  const allQuestions = groups.flatMap((g) => g.questions)
  const parsed = validateAnswers(respostas, allQuestions)
  if (!parsed.ok) {
    return { ok: false, error: `Responda todas as questões (faltam ${parsed.missing.length}).` }
  }

  // Captura headers para o throttle anti-poisoning
  const headerStore = await headers()
  const fwd = headerStore.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? null
  const ua = headerStore.get('user-agent') ?? null
  const ipHash = hashIp(ip, a.id)

  // ============================================================
  // RATE-LIMIT (anti-poisoning)
  // Regra: 1 submissão por (assessment_id, ip_hash) a cada 24h.
  // Bloqueio é temporário; tentativas durante o bloqueio incrementam o counter
  // e atualizam blocked_until — comportamento sticky para coibir scripts.
  // ============================================================
  const admin = createServiceRoleClient()

  if (ipHash) {
    const { data: existing } = await supabase
      .from('nr01_collection_throttle')
      .select('submission_count, last_submission_at, blocked_until')
      .eq('assessment_id', a.id)
      .eq('ip_hash', ipHash)
      .maybeSingle()

    if (existing) {
      const e = existing as { submission_count: number; last_submission_at: string; blocked_until: string | null }
      const blockedUntil = e.blocked_until ? new Date(e.blocked_until) : null
      const last = new Date(e.last_submission_at)
      const hoursSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60)

      if (blockedUntil && blockedUntil > now) {
        // Sticky: cada tentativa estende o bloqueio em mais 24h
        const newBlock = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        await admin
          .from('nr01_collection_throttle')
          .update({
            submission_count: e.submission_count + 1,
            blocked_until: newBlock.toISOString(),
          } as never)
          .eq('assessment_id', a.id)
          .eq('ip_hash', ipHash)
        return { ok: false, error: 'Limite de respostas por dispositivo atingido.' }
      }

      if (hoursSinceLast < 24) {
        // Primeira tentativa duplicada — aplica bloqueio
        const blockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        await admin
          .from('nr01_collection_throttle')
          .update({
            submission_count: e.submission_count + 1,
            blocked_until: blockUntil.toISOString(),
          } as never)
          .eq('assessment_id', a.id)
          .eq('ip_hash', ipHash)
        return { ok: false, error: 'Você já respondeu esta avaliação nas últimas 24h.' }
      }
    }
  }

  // ============================================================
  // Inserts (service-role — ver nota no topo do arquivo)
  // ============================================================
  const responseId = randomUUID()
  const anonId = randomUUID()

  const { error: errResp } = await admin
    .from('nr01_responses')
    .insert({
      id: responseId,
      assessment_id: a.id,
      anon_id: anonId,
      setor: contexto.setor.trim() || null,
      funcao: contexto.funcao.trim() || null,
      vinculo: contexto.vinculo.trim() || null,
      tempo_casa: contexto.tempoCasa.trim() || null,
      is_leader: contexto.isLeader,
      open_q1: contexto.open1.trim() || null,
      open_q2: contexto.open2.trim() || null,
      open_q3: contexto.open3.trim() || null,
      open_q4: contexto.open4.trim() || null,
      instrument_version: a.instrument_version,
    } as never)

  if (errResp) {
    console.error('[nr01/coleta] falha ao registrar resposta:', errResp.message, { assessmentId: a.id })
    return { ok: false, error: 'Não foi possível registrar sua resposta. Tente novamente em instantes.' }
  }

  // Insere as respostas item-a-item em um único batch
  const answersInsert = parsed.answers.map((ans) => ({
    response_id: responseId,
    question_id: ans.question_id,
    value: ans.value,
  }))
  const { error: errAns } = await admin
    .from('nr01_response_answers')
    .insert(answersInsert as never)

  if (errAns) {
    console.error('[nr01/coleta] falha ao registrar respostas item-a-item:', errAns.message, { assessmentId: a.id, responseId })
    // melhor esforço: rollback manual da response
    await admin.from('nr01_responses').delete().eq('id', responseId)
    return { ok: false, error: 'Não foi possível registrar suas respostas. Tente novamente em instantes.' }
  }

  // Registra/atualiza throttle (UPSERT manual: insere se não existir, senão atualiza)
  if (ipHash) {
    const { data: t } = await supabase
      .from('nr01_collection_throttle')
      .select('submission_count')
      .eq('assessment_id', a.id)
      .eq('ip_hash', ipHash)
      .maybeSingle()
    if (t) {
      await admin
        .from('nr01_collection_throttle')
        .update({
          last_submission_at: now.toISOString(),
          submission_count: (t as { submission_count: number }).submission_count + 1,
        } as never)
        .eq('assessment_id', a.id)
        .eq('ip_hash', ipHash)
    } else {
      await admin.from('nr01_collection_throttle').insert({
        assessment_id: a.id,
        ip_hash: ipHash,
        first_seen_at: now.toISOString(),
        last_submission_at: now.toISOString(),
        submission_count: 1,
      } as never)
    }
  }

  // Audit (sem PII — apenas hash do IP por-avaliação)
  await admin.from('nr01_audit_log').insert({
    assessment_id: a.id,
    actor_id: null,
    actor_role: 'collaborator',
    event_type: 'RESPONSE_SUBMITTED',
    payload: {
      response_id: responseId,
      n_answers: parsed.answers.length,
    },
    ip_hash: ipHash,
    user_agent: ua,
  } as never)

  try {
    await maybeAutoCompleteOnKThreshold(a.id)
  } catch (e) {
    console.error('[coleta] auto-complete pós-k falhou:', e)
  }

  return { ok: true }
}
