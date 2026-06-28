'use server'

/**
 * QUANTUM5G — NR-01 · Server Actions de monitoramento contínuo
 *
 * - ativarMonitoramento: cria/atualiza pulse_config (emails, frequência)
 * - dispararPulsoSemanal: seleciona 3 questões (sem repetir dimensão), gera
 *   tokens individuais, envia emails (Resend ou console), persiste dispatch.
 * - desativarMonitoramento: enabled=false (não apaga histórico).
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import { buildPulseEmail, sendEmail } from '@/lib/nr01/email'
import { buildPulseUrl, hashEmail, normalizeEmails, selectQuestionsForWeek } from '@/lib/nr01/pulse'
import type {
  Nr01Assessment,
  Nr01PulseConfig,
  Nr01PulseDispatch,
  Nr01Question,
} from '@/types/nr01'

async function ensureOwnership(assessmentId: string) {
  const { db, user, role, assessment } = await ensureNr01AssessmentAccess<Nr01Assessment>(
    assessmentId,
    'id, consultant_id, status, instrument_version, company_id',
  )
  return { supabase: db, user, role, assessment }
}

// ============================================================
// ATIVAR / ATUALIZAR CONFIG
// ============================================================
export async function ativarMonitoramento(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role, assessment } = await ensureOwnership(assessmentId)

  if (assessment.status !== 'CONCLUIDO') {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Conclua+a+avalia%C3%A7%C3%A3o+antes+de+ativar+pulsos.`)
  }

  const emailsRaw = (formData.get('emails') as string) ?? ''
  const dayOfWeek = Math.max(1, Math.min(7, parseInt(formData.get('day_of_week') as string) || 1))
  const questionsPerWeek = Math.max(1, Math.min(5, parseInt(formData.get('questions_per_week') as string) || 3))
  const windowHours = Math.max(24, Math.min(720, parseInt(formData.get('window_hours') as string) || 168))

  const { valid, invalid } = normalizeEmails(emailsRaw)
  if (valid.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Cole+ao+menos+1+email+v%C3%A1lido.`)
  }

  await supabase
    .from('nr01_pulse_config')
    .upsert(
      {
        assessment_id: assessmentId,
        enabled: true,
        day_of_week: dayOfWeek,
        recipient_emails: valid,
        questions_per_week: questionsPerWeek,
        window_hours: windowHours,
      } as never,
      { onConflict: 'assessment_id' },
    )

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'PULSE_MONITORING_ACTIVATED',
    payload: {
      n_emails: valid.length,
      n_invalid: invalid.length,
      day_of_week: dayOfWeek,
      questions_per_week: questionsPerWeek,
    },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/monitoramento`)
  redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?status=ativado`)
}

// ============================================================
// DESATIVAR (não apaga histórico)
// ============================================================
export async function desativarMonitoramento(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(assessmentId)

  await supabase
    .from('nr01_pulse_config')
    .update({ enabled: false } as never)
    .eq('assessment_id', assessmentId)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'PULSE_MONITORING_DEACTIVATED',
    payload: {},
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/monitoramento`)
  redirect(`/nr01/avaliacao/${assessmentId}/monitoramento`)
}

// ============================================================
// DISPARAR PULSO DA SEMANA (manual nos primeiros 14 dias)
// ============================================================
export async function dispararPulsoSemanal(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role, assessment } = await ensureOwnership(assessmentId)

  // 1. Carrega config
  const { data: configData } = await supabase
    .from('nr01_pulse_config')
    .select('*')
    .eq('assessment_id', assessmentId)
    .maybeSingle()
  if (!configData) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Ative+o+monitoramento+antes+de+disparar.`)
  }
  const config = configData as Nr01PulseConfig
  if (!config.enabled) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Monitoramento+desativado.`)
  }
  if (!config.recipient_emails || config.recipient_emails.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Sem+destinat%C3%A1rios+cadastrados.`)
  }

  // 2. Carrega questões + últimos dispatches (para evitar repetição imediata)
  const [{ data: qsData }, { data: lastDispatches }] = await Promise.all([
    supabase
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', assessment.instrument_version)
      .eq('is_active', true),
    supabase
      .from('nr01_pulse_dispatches')
      .select('question_ids')
      .eq('assessment_id', assessmentId)
      .order('week_number', { ascending: false })
      .limit(2),
  ])
  const questions = (qsData ?? []) as Nr01Question[]
  if (questions.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Sem+quest%C3%B5es+ativas.`)
  }

  const recentIds = ((lastDispatches ?? []) as Array<{ question_ids: string[] }>)
    .flatMap((d) => d.question_ids ?? [])

  // 3. Seleciona N questões
  const picked = selectQuestionsForWeek({
    questions,
    count: config.questions_per_week,
    excludeQuestionIds: recentIds,
  })
  if (picked.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=Falha+na+sele%C3%A7%C3%A3o+de+quest%C3%B5es.`)
  }

  // 4. Cria dispatch
  const weekNumber = (config.weeks_dispatched ?? 0) + 1
  const dispatchedAt = new Date()
  const closesAt = new Date(dispatchedAt.getTime() + config.window_hours * 3600 * 1000)

  const { data: dispatchRow, error: errDispatch } = await supabase
    .from('nr01_pulse_dispatches')
    .insert({
      assessment_id: assessmentId,
      week_number: weekNumber,
      dispatched_at: dispatchedAt.toISOString(),
      question_ids: picked.map((q) => q.id),
      window_closes_at: closesAt.toISOString(),
    } as never)
    .select('id')
    .single()
  if (errDispatch || !dispatchRow) {
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=${encodeURIComponent('Erro ao criar dispatch: ' + (errDispatch?.message ?? ''))}`)
  }
  const dispatch = dispatchRow as Pick<Nr01PulseDispatch, 'id'>

  // 5. Para cada email: cria invite + envia email
  let sentCount = 0
  let failedCount = 0
  // Carrega nome da empresa para o email (não é PII do colab)
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', assessment.company_id)
    .single()
  const companyName = (companyData as { name: string } | null)?.name ?? 'sua empresa'

  for (const email of config.recipient_emails) {
    const eHash = hashEmail(email, assessmentId)

    const { data: invRow, error: errInv } = await supabase
      .from('nr01_pulse_invites')
      .insert({
        dispatch_id: dispatch.id,
        email_hash: eHash,
      } as never)
      .select('token')
      .single()

    if (errInv || !invRow) {
      failedCount += 1
      continue
    }
    const token = (invRow as { token: string }).token
    const url = buildPulseUrl(token)

    const result = await sendEmail(
      buildPulseEmail({
        to: email,
        companyName,
        weekNumber,
        totalQuestions: picked.length,
        pulseUrl: url,
        windowHours: config.window_hours,
      }),
    )
    if (result.ok) sentCount += 1
    else failedCount += 1
  }

  // 6. Atualiza dispatch com counts + config com weeks_dispatched
  await supabase
    .from('nr01_pulse_dispatches')
    .update({ invites_sent_count: sentCount } as never)
    .eq('id', dispatch.id)

  await supabase
    .from('nr01_pulse_config')
    .update({
      last_dispatched_at: dispatchedAt.toISOString(),
      weeks_dispatched: weekNumber,
    } as never)
    .eq('assessment_id', assessmentId)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'MICRO_PULSE_DISPATCHED',
    payload: {
      dispatch_id: dispatch.id,
      week_number: weekNumber,
      n_questions: picked.length,
      n_invites_sent: sentCount,
      n_failed: failedCount,
    },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/monitoramento`)
  redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?status=disparado&sent=${sentCount}&failed=${failedCount}`)
}
