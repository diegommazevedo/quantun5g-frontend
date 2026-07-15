'use server'

/**
 * QUANTUM5G — NR-01 · Actions da página de avaliação
 * Abrir/encerrar coleta, processar resultados, gerar pacote de evidências.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import { processAssessmentResultsCore } from '@/lib/nr01/process-assessment-results-core'
import { generateEvidencePackCore } from '@/lib/nr01/generate-evidence-pack-core'

async function ensureOwnership(assessmentId: string) {
  const { db, user, role, assessment } = await ensureNr01AssessmentAccess(assessmentId)
  return { supabase: db, user, role, assessment }
}

// ============================================================
// ABRIR COLETA
// ============================================================
export async function abrirColeta(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(id)

  await supabase
    .from('nr01_assessments')
    .update({ status: 'COLETANDO' } as never)
    .eq('id', id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: role,
    event_type: 'COLLECTION_OPENED',
    payload: {},
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// ENCERRAR COLETA
// ============================================================
export async function encerrarColeta(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(id)

  await supabase
    .from('nr01_assessments')
    .update({ status: 'COLETA_ENCERRADA' } as never)
    .eq('id', id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: role,
    event_type: 'COLLECTION_CLOSED',
    payload: {},
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// PROCESSAR RESULTADOS
// ============================================================
export async function processarResultados(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(id)

  const result = await processAssessmentResultsCore(supabase, {
    assessmentId: id,
    actorId: user.id,
    actorRole: role,
  })

  if (!result.ok) {
    const { data: assessment } = await supabase
      .from('nr01_assessments')
      .select('company_id')
      .eq('id', id)
      .maybeSingle()
    const companyId = (assessment as { company_id: string } | null)?.company_id
    if (result.error === 'rt_ausente' && companyId) {
      redirect(
        `/empresas/${companyId}?error=${encodeURIComponent('Cadastre o responsável técnico assinante (RT) na empresa antes de processar.')}&retorno=/nr01/avaliacao/${id}`,
      )
    }
    redirect(
      `/nr01/avaliacao/${id}?error=${encodeURIComponent(result.error ?? 'Falha ao processar resultados')}`,
    )
  }

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// GERAR PACOTE DE EVIDÊNCIAS
// ============================================================
export async function gerarPacoteEvidencias(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user, role } = await ensureOwnership(id)

  const result = await generateEvidencePackCore(supabase, {
    assessmentId: id,
    actorId: user.id,
    actorRole: role,
  })

  if (!result.ok) {
    redirect(
      `/nr01/avaliacao/${id}?error=${encodeURIComponent(result.error ?? 'Falha ao gerar pacote de evidências')}`,
    )
  }

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}
