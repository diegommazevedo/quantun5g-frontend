/**
 * Disparo de micro-pulso NR-01 reutilizável (manual + cron).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPulseEmail, sendEmail } from '@/lib/nr01/email'
import { buildPulseUrl, hashEmail, selectQuestionsForWeek } from '@/lib/nr01/pulse'
import type { Nr01PulseConfig, Nr01PulseDispatch, Nr01Question } from '@/types/nr01'

export interface DispatchPulseResult {
  ok: boolean
  skipped?: string
  assessmentId: string
  weekNumber?: number
  sent?: number
  failed?: number
  error?: string
}

export async function dispatchPulseForAssessment(
  supabase: SupabaseClient,
  assessmentId: string,
  opts?: { actorId?: string | null; actorRole?: string },
): Promise<DispatchPulseResult> {
  const { data: assessment } = await supabase
    .from('nr01_assessments')
    .select('id, status, instrument_version, company_id')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!assessment) return { ok: false, assessmentId, error: 'assessment_not_found' }
  if ((assessment as { status: string }).status !== 'CONCLUIDO') {
    return { ok: false, assessmentId, skipped: 'not_concluido' }
  }

  const { data: configData } = await supabase
    .from('nr01_pulse_config')
    .select('*')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!configData) return { ok: false, assessmentId, skipped: 'no_config' }
  const config = configData as Nr01PulseConfig
  if (!config.enabled) return { ok: false, assessmentId, skipped: 'disabled' }
  if (!config.recipient_emails?.length) return { ok: false, assessmentId, skipped: 'no_recipients' }

  const [{ data: qsData }, { data: lastDispatches }] = await Promise.all([
    supabase
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', (assessment as { instrument_version: string }).instrument_version)
      .eq('is_active', true),
    supabase
      .from('nr01_pulse_dispatches')
      .select('question_ids')
      .eq('assessment_id', assessmentId)
      .order('week_number', { ascending: false })
      .limit(2),
  ])

  const questions = (qsData ?? []) as Nr01Question[]
  if (!questions.length) return { ok: false, assessmentId, error: 'no_questions' }

  const recentIds = ((lastDispatches ?? []) as Array<{ question_ids: string[] }>).flatMap(
    (d) => d.question_ids ?? [],
  )
  const picked = selectQuestionsForWeek({
    questions,
    count: config.questions_per_week,
    excludeQuestionIds: recentIds,
  })
  if (!picked.length) return { ok: false, assessmentId, error: 'pick_failed' }

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
    return { ok: false, assessmentId, error: errDispatch?.message ?? 'dispatch_insert' }
  }
  const dispatch = dispatchRow as Pick<Nr01PulseDispatch, 'id'>

  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', (assessment as { company_id: string }).company_id)
    .single()
  const companyName = (companyData as { name: string } | null)?.name ?? 'sua empresa'

  let sentCount = 0
  let failedCount = 0
  for (const email of config.recipient_emails) {
    const eHash = hashEmail(email, assessmentId)
    const { data: invRow, error: errInv } = await supabase
      .from('nr01_pulse_invites')
      .insert({ dispatch_id: dispatch.id, email_hash: eHash } as never)
      .select('token')
      .single()

    if (errInv || !invRow) {
      failedCount += 1
      continue
    }
    const token = (invRow as { token: string }).token
    const result = await sendEmail(
      buildPulseEmail({
        to: email,
        companyName,
        weekNumber,
        totalQuestions: picked.length,
        pulseUrl: buildPulseUrl(token),
        windowHours: config.window_hours,
      }),
    )
    if (result.ok) sentCount += 1
    else failedCount += 1
  }

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
    actor_id: opts?.actorId ?? null,
    actor_role: opts?.actorRole ?? 'system',
    event_type: 'MICRO_PULSE_DISPATCHED',
    payload: {
      dispatch_id: dispatch.id,
      week_number: weekNumber,
      n_questions: picked.length,
      n_invites_sent: sentCount,
      n_failed: failedCount,
      via: opts?.actorId ? 'manual' : 'cron',
    },
  } as never)

  return {
    ok: true,
    assessmentId,
    weekNumber,
    sent: sentCount,
    failed: failedCount,
  }
}

/** ISO day: 1=Mon … 7=Sun (Postgres EXTRACT DOW is 0=Sun). */
export function todayIsoDayOfWeek(d = new Date()): number {
  const js = d.getUTCDay() // 0 Sun
  return js === 0 ? 7 : js
}
