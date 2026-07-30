'use server'

/**
 * QUANTUM5G — NR-01 · Submissão pública de pulso semanal
 *
 * Fluxo:
 *  1. Valida token → invite → dispatch
 *  2. Verifica janela aberta + invite não usado
 *  3. Carrega questões esperadas; valida que todas vieram (1-5)
 *  4. Insere nr01_pulse_responses com anon_id NOVO (sem FK ao invite)
 *  5. Marca invite.used_at = now()
 *  6. Audita evento
 *
 * Anonimato: anon_id é gerado AQUI no servidor; o invite é marcado usado
 * em transação separada para minimizar correlação temporal email→resposta.
 *
 * Recebe as respostas diretamente (sem <form action> nativo) para que o
 * componente cliente mantenha o estado em memória: se a submissão falhar
 * por qualquer motivo, o usuário nunca perde o que já respondeu (ver
 * PulsoFormClient.tsx e o mesmo padrão em nr01/coleta/[token]).
 */

import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { hashIp } from '@/lib/nr01/evidence'
import type { Nr01PulseDispatch, Nr01PulseInvite } from '@/types/nr01'

export type SubmitPulsoResult =
  | { ok: true }
  | { ok: false; error: string }

export async function submeterPulso(
  token: string,
  respostas: Record<string, number>,
): Promise<SubmitPulsoResult> {
  const supabase = await createClient()

  const { data: inviteData } = await supabase
    .from('nr01_pulse_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (!inviteData) return { ok: false, error: 'Token inválido.' }
  const invite = inviteData as Nr01PulseInvite
  if (invite.used_at) {
    return { ok: false, error: 'Este pulso já foi respondido.' }
  }

  const { data: dispatchData } = await supabase
    .from('nr01_pulse_dispatches')
    .select('*')
    .eq('id', invite.dispatch_id)
    .single()
  if (!dispatchData) return { ok: false, error: 'Dispatch não encontrado.' }
  const dispatch = dispatchData as Nr01PulseDispatch

  if (new Date() > new Date(dispatch.window_closes_at)) {
    return { ok: false, error: 'A janela deste pulso encerrou.' }
  }

  // Carrega questões esperadas
  const { data: qsData } = await supabase
    .from('nr01_questions')
    .select('id')
    .in('id', dispatch.question_ids)
  const questionIds = (qsData ?? []).map((q) => (q as { id: string }).id)
  if (questionIds.length === 0) {
    return { ok: false, error: 'Questões não encontradas.' }
  }

  // Valida respostas ANTES de qualquer escrita
  const answers: Array<{ question_id: string; value: number }> = []
  for (const qid of questionIds) {
    const v = respostas[qid]
    if (v == null || !Number.isInteger(v) || v < 1 || v > 5) {
      return { ok: false, error: `Responda as ${questionIds.length} perguntas (1-5).` }
    }
    answers.push({ question_id: qid, value: v })
  }

  // Escritas via service-role: mesmo motivo do fluxo de coleta principal —
  // a validação de negócio já ocorreu acima, e "anon" não deve ter SELECT
  // sobre estas tabelas para preservar o anonimato das respostas.
  const admin = createServiceRoleClient()

  const anonId = randomUUID()
  const rows = answers.map((a) => ({
    dispatch_id: dispatch.id,
    question_id: a.question_id,
    anon_id: anonId,
    value: a.value,
  }))
  const { error: errResp } = await admin
    .from('nr01_pulse_responses')
    .insert(rows as never)
  if (errResp) {
    console.error('[nr01/pulso] falha ao registrar pulso:', errResp.message, { dispatchId: dispatch.id })
    return { ok: false, error: 'Não foi possível registrar seu pulso. Tente novamente em instantes.' }
  }

  // Marca invite usado (em call separado para reduzir correlação no log)
  await admin
    .from('nr01_pulse_invites')
    .update({ used_at: new Date().toISOString() } as never)
    .eq('id', invite.id)

  // Audit (sem PII — apenas hash do IP por-avaliação)
  const headerStore = await headers()
  const fwd = headerStore.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? null
  const ua = headerStore.get('user-agent') ?? null

  await admin.from('nr01_audit_log').insert({
    assessment_id: dispatch.assessment_id,
    actor_id: null,
    actor_role: 'collaborator',
    event_type: 'MICRO_PULSE_RESPONDED',
    payload: {
      dispatch_id: dispatch.id,
      week_number: dispatch.week_number,
      n_answers: rows.length,
    },
    ip_hash: hashIp(ip, dispatch.assessment_id),
    user_agent: ua,
  } as never)

  return { ok: true }
}
