'use server'

/**
 * QUANTUM5G — NR-01 · Server Actions de monitoramento contínuo
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import { normalizeEmails } from '@/lib/nr01/pulse'
import { dispatchPulseForAssessment } from '@/lib/nr01/dispatch-pulse'
import type { Nr01Assessment } from '@/types/nr01'

async function ensureOwnership(assessmentId: string) {
  const { db, user, role, assessment } = await ensureNr01AssessmentAccess<Nr01Assessment>(
    assessmentId,
    'id, consultant_id, status, instrument_version, company_id',
  )
  return { supabase: db, user, role, assessment }
}

export async function ativarMonitoramento(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role, assessment } = await ensureOwnership(assessmentId)

  if (assessment.status !== 'CONCLUIDO') {
    redirect(
      `/nr01/avaliacao/${assessmentId}/monitoramento?error=Conclua+a+avalia%C3%A7%C3%A3o+antes+de+ativar+pulsos.`,
    )
  }

  const emailsRaw = (formData.get('emails') as string) ?? ''
  const dayOfWeek = Math.max(1, Math.min(7, parseInt(formData.get('day_of_week') as string) || 1))
  const questionsPerWeek = Math.max(
    1,
    Math.min(5, parseInt(formData.get('questions_per_week') as string) || 3),
  )
  const windowHours = Math.max(
    24,
    Math.min(720, parseInt(formData.get('window_hours') as string) || 168),
  )

  const { valid, invalid } = normalizeEmails(emailsRaw)
  if (valid.length === 0) {
    redirect(
      `/nr01/avaliacao/${assessmentId}/monitoramento?error=Cole+ao+menos+1+email+v%C3%A1lido.`,
    )
  }

  await supabase.from('nr01_pulse_config').upsert(
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

export async function dispararPulsoSemanal(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(assessmentId)

  const result = await dispatchPulseForAssessment(supabase, assessmentId, {
    actorId: user.id,
    actorRole: role,
  })

  if (!result.ok) {
    const msg = encodeURIComponent(result.error ?? result.skipped ?? 'falha')
    redirect(`/nr01/avaliacao/${assessmentId}/monitoramento?error=${msg}`)
  }

  revalidatePath(`/nr01/avaliacao/${assessmentId}/monitoramento`)
  redirect(
    `/nr01/avaliacao/${assessmentId}/monitoramento?status=disparado&sent=${result.sent ?? 0}&failed=${result.failed ?? 0}`,
  )
}
