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
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { loadInstrument, parseAnswersFromFormData } from '@/lib/nr01/instrument'
import { hashIp } from '@/lib/nr01/evidence'

export async function submeterRespostaNr01(formData: FormData) {
  const token = formData.get('token') as string
  const supabase = await createClient()

  const { data: assess } = await supabase
    .from('nr01_assessments')
    .select('id, status, instrument_version, collection_opens_at, collection_closes_at')
    .eq('collection_token', token)
    .maybeSingle()

  if (!assess) redirect(`/nr01/coleta/${token}?error=Token+inv%C3%A1lido`)
  const a = assess as {
    id: string
    status: string
    instrument_version: string
    collection_opens_at: string | null
    collection_closes_at: string | null
  }

  const now = new Date()
  if (a.status !== 'COLETANDO') {
    redirect(`/nr01/coleta/${token}?error=Coleta+encerrada`)
  }
  if (a.collection_opens_at && new Date(a.collection_opens_at) > now) {
    redirect(`/nr01/coleta/${token}?error=Coleta+ainda+n%C3%A3o+iniciada`)
  }
  if (a.collection_closes_at && new Date(a.collection_closes_at) < now) {
    redirect(`/nr01/coleta/${token}?error=Janela+de+coleta+expirada`)
  }

  // Captura headers ANTES de qualquer trabalho (necessário para throttle)
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
        await supabase
          .from('nr01_collection_throttle')
          .update({
            submission_count: e.submission_count + 1,
            blocked_until: newBlock.toISOString(),
          } as never)
          .eq('assessment_id', a.id)
          .eq('ip_hash', ipHash)
        redirect(`/nr01/coleta/${token}?error=Limite+de+respostas+por+dispositivo+atingido.`)
      }

      if (hoursSinceLast < 24) {
        // Primeira tentativa duplicada — aplica bloqueio
        const blockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        await supabase
          .from('nr01_collection_throttle')
          .update({
            submission_count: e.submission_count + 1,
            blocked_until: blockUntil.toISOString(),
          } as never)
          .eq('assessment_id', a.id)
          .eq('ip_hash', ipHash)
        redirect(`/nr01/coleta/${token}?error=Voc%C3%AA+j%C3%A1+respondeu+esta+avalia%C3%A7%C3%A3o+nas+%C3%BAltimas+24h.`)
      }
    }
  }

  // Carrega instrumento e parseia respostas
  const groups = await loadInstrument(a.instrument_version)
  const allQuestions = groups.flatMap((g) => g.questions)
  const parsed = parseAnswersFromFormData(formData, allQuestions)
  if (!parsed.ok) {
    redirect(`/nr01/coleta/${token}?error=Responda+todas+as+quest%C3%B5es+(1-5).`)
  }

  // Inserts
  const anonId = randomUUID()
  const setor       = (formData.get('setor') as string)?.trim() || null
  const funcao      = (formData.get('funcao') as string)?.trim() || null
  const vinculo     = (formData.get('vinculo') as string)?.trim() || null
  const tempoCasa   = (formData.get('tempo_casa') as string)?.trim() || null
  const isLeaderRaw = formData.get('is_leader') as string | null
  const isLeader    = isLeaderRaw === 'true' || isLeaderRaw === 'on'
  const open1       = (formData.get('open_q1') as string)?.trim() || null
  const open2       = (formData.get('open_q2') as string)?.trim() || null
  const open3       = (formData.get('open_q3') as string)?.trim() || null
  const open4       = (formData.get('open_q4') as string)?.trim() || null
  const open5       = (formData.get('open_q5') as string)?.trim() || null

  const { data: respRow, error: errResp } = await supabase
    .from('nr01_responses')
    .insert({
      assessment_id: a.id,
      anon_id: anonId,
      setor,
      funcao,
      vinculo,
      tempo_casa: tempoCasa,
      is_leader: isLeader,
      open_q1: open1,
      open_q2: open2,
      open_q3: open3,
      open_q4: open4,
      open_q5: open5,
      instrument_version: a.instrument_version,
    } as never)
    .select('id')
    .single()

  if (errResp || !respRow) {
    redirect(`/nr01/coleta/${token}?error=${encodeURIComponent('Erro ao registrar: ' + (errResp?.message ?? ''))}`)
  }

  const responseId = (respRow as { id: string }).id

  // Insere as 80 respostas item-a-item em um único batch
  const answersInsert = parsed.answers.map((a) => ({
    response_id: responseId,
    question_id: a.question_id,
    value: a.value,
  }))
  const { error: errAns } = await supabase
    .from('nr01_response_answers')
    .insert(answersInsert as never)

  if (errAns) {
    // melhor esforço: rollback manual da response
    await supabase.from('nr01_responses').delete().eq('id', responseId)
    redirect(`/nr01/coleta/${token}?error=${encodeURIComponent('Erro ao registrar respostas: ' + errAns.message)}`)
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
      await supabase
        .from('nr01_collection_throttle')
        .update({
          last_submission_at: now.toISOString(),
          submission_count: (t as { submission_count: number }).submission_count + 1,
        } as never)
        .eq('assessment_id', a.id)
        .eq('ip_hash', ipHash)
    } else {
      await supabase.from('nr01_collection_throttle').insert({
        assessment_id: a.id,
        ip_hash: ipHash,
        first_seen_at: now.toISOString(),
        last_submission_at: now.toISOString(),
        submission_count: 1,
      } as never)
    }
  }

  // Audit (sem PII — apenas hash do IP por-avaliação)
  await supabase.from('nr01_audit_log').insert({
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

  redirect(`/nr01/coleta/${token}?status=ok`)
}
