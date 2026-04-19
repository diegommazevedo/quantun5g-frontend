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
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { hashIp } from '@/lib/nr01/evidence'
import type { Nr01PulseDispatch, Nr01PulseInvite } from '@/types/nr01'

export async function submeterPulso(formData: FormData) {
  const token = formData.get('token') as string
  const supabase = await createClient()

  const { data: inviteData } = await supabase
    .from('nr01_pulse_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (!inviteData) redirect(`/nr01/pulso/${token}?error=Token+inv%C3%A1lido`)
  const invite = inviteData as Nr01PulseInvite
  if (invite.used_at) {
    redirect(`/nr01/pulso/${token}?error=Pulso+j%C3%A1+respondido`)
  }

  const { data: dispatchData } = await supabase
    .from('nr01_pulse_dispatches')
    .select('*')
    .eq('id', invite.dispatch_id)
    .single()
  if (!dispatchData) redirect(`/nr01/pulso/${token}?error=Dispatch+n%C3%A3o+encontrado`)
  const dispatch = dispatchData as Nr01PulseDispatch

  if (new Date() > new Date(dispatch.window_closes_at)) {
    redirect(`/nr01/pulso/${token}?error=Janela+encerrada`)
  }

  // Carrega questões
  const { data: qsData } = await supabase
    .from('nr01_questions')
    .select('id')
    .in('id', dispatch.question_ids)
  const questionIds = (qsData ?? []).map((q) => (q as { id: string }).id)
  if (questionIds.length === 0) {
    redirect(`/nr01/pulso/${token}?error=Quest%C3%B5es+n%C3%A3o+encontradas`)
  }

  // Parse + valida valores
  const answers: Array<{ question_id: string; value: number }> = []
  for (const qid of questionIds) {
    const raw = formData.get(`q_${qid}`)
    if (raw == null || raw === '') {
      redirect(`/nr01/pulso/${token}?error=Responda+as+${questionIds.length}+perguntas+(1-5).`)
    }
    const v = Number(raw)
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      redirect(`/nr01/pulso/${token}?error=Valor+inv%C3%A1lido+em+alguma+pergunta.`)
    }
    answers.push({ question_id: qid, value: v })
  }

  // Insere respostas com mesmo anon_id (gerado agora, não rastreável a invite)
  const anonId = randomUUID()
  const rows = answers.map((a) => ({
    dispatch_id: dispatch.id,
    question_id: a.question_id,
    anon_id: anonId,
    value: a.value,
  }))
  const { error: errResp } = await supabase
    .from('nr01_pulse_responses')
    .insert(rows as never)
  if (errResp) {
    redirect(`/nr01/pulso/${token}?error=${encodeURIComponent('Erro ao registrar: ' + errResp.message)}`)
  }

  // Marca invite usado (em call separado para reduzir correlação no log)
  await supabase
    .from('nr01_pulse_invites')
    .update({ used_at: new Date().toISOString() } as never)
    .eq('id', invite.id)

  // Audit (sem PII — apenas hash do IP por-avaliação)
  const headerStore = await headers()
  const fwd = headerStore.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? null
  const ua = headerStore.get('user-agent') ?? null

  await supabase.from('nr01_audit_log').insert({
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

  redirect(`/nr01/pulso/${token}?status=ok`)
}
