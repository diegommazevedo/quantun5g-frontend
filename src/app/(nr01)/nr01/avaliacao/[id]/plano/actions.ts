'use server'

/**
 * QUANTUM5G — NR-01 · Server Actions do Plano de Ação (PDCA)
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  Nr01ActionItem,
  Nr01ActionPriority,
  Nr01ActionStatus,
  Nr01DimensionScore,
  Nr01Intervention,
} from '@/types/nr01'
import { suggestActionsFromScores } from '@/lib/nr01/plan-suggestions'

async function ensureOwnership(assessmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data, error } = await supabase
    .from('nr01_assessments')
    .select('id, consultant_id')
    .eq('id', assessmentId)
    .single()
  if (error || !data) redirect('/nr01/dashboard')
  return { supabase, user, assessment: data as { id: string; consultant_id: string } }
}

async function getOrCreatePlan(assessmentId: string) {
  const { supabase, user } = await ensureOwnership(assessmentId)
  const { data: existing } = await supabase
    .from('nr01_action_plans')
    .select('id, status')
    .eq('assessment_id', assessmentId)
    .maybeSingle()
  if (existing) return { supabase, user, plan: existing as { id: string; status: string } }

  const { data: created, error } = await supabase
    .from('nr01_action_plans')
    .insert({ assessment_id: assessmentId, status: 'rascunho' } as never)
    .select('id, status')
    .single()
  if (error || !created) {
    redirect(`/nr01/avaliacao/${assessmentId}/plano?error=${encodeURIComponent('Erro ao criar plano: ' + (error?.message ?? ''))}`)
  }

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_PLAN_CREATED',
    payload: {},
  } as never)

  return { supabase, user, plan: created as { id: string; status: string } }
}

// ============================================================
// ADICIONAR ITEM AVULSO
// ============================================================
export async function adicionarItemPlano(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, plan } = await getOrCreatePlan(assessmentId)

  const dimensionCode = (formData.get('dimension_code') as string)?.trim()
  const title         = (formData.get('title') as string)?.trim()
  const description   = (formData.get('description') as string)?.trim() || null
  const ownerName     = (formData.get('owner_name') as string)?.trim()
  const ownerEmail    = (formData.get('owner_email') as string)?.trim() || null
  const kpi           = (formData.get('kpi') as string)?.trim() || null
  const dueDate       = (formData.get('due_date') as string)?.trim()
  const priority      = ((formData.get('priority') as string) || 'P2') as Nr01ActionPriority
  const costRaw       = (formData.get('estimated_cost_brl') as string)?.trim()
  const interventionId = (formData.get('intervention_id') as string)?.trim() || null

  if (!dimensionCode || !title || !ownerName || !dueDate) {
    redirect(`/nr01/avaliacao/${assessmentId}/plano?error=Preencha+dimens%C3%A3o,+t%C3%ADtulo,+respons%C3%A1vel+e+prazo.`)
  }

  await supabase.from('nr01_action_items').insert({
    action_plan_id: plan.id,
    dimension_code: dimensionCode,
    intervention_id: interventionId,
    owner_name: ownerName,
    owner_email: ownerEmail,
    title,
    description,
    kpi,
    due_date: dueDate,
    priority,
    estimated_cost_brl: costRaw ? Number(costRaw) : null,
    status: 'pendente',
  } as never)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_ITEM_ADDED',
    payload: { dimension_code: dimensionCode, title, priority },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/plano`)
}

// ============================================================
// SUGERIR AÇÕES AUTO (a partir das dimensões em risco)
// Cria itens em lote — todos como pendente, prioridade calculada.
// ============================================================
export async function sugerirAcoesAuto(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, plan } = await getOrCreatePlan(assessmentId)

  const [{ data: scoresData }, { data: libData }] = await Promise.all([
    supabase.from('nr01_dimension_scores').select('*').eq('assessment_id', assessmentId),
    supabase.from('nr01_intervention_library').select('*').eq('is_active', true),
  ])
  const scores = (scoresData ?? []) as Nr01DimensionScore[]
  const library = (libData ?? []) as Nr01Intervention[]

  if (scores.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/plano?error=Processe+os+resultados+antes+de+sugerir+a%C3%A7%C3%B5es.`)
  }

  const suggestions = suggestActionsFromScores(scores, library)
  if (suggestions.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/plano?error=Nenhuma+dimens%C3%A3o+em+risco+atencao+ou+superior.`)
  }

  // Não duplica intervenção já no plano
  const { data: existingItems } = await supabase
    .from('nr01_action_items')
    .select('intervention_id')
    .eq('action_plan_id', plan.id)
  const existingIds = new Set(
    ((existingItems ?? []) as Array<{ intervention_id: string | null }>).map((i) => i.intervention_id).filter(Boolean),
  )

  const today = new Date()
  const toInsert = suggestions
    .filter((s) => !existingIds.has(s.intervention_id))
    .map((s) => {
      const due = new Date(today)
      due.setDate(due.getDate() + s.due_in_days)
      return {
        action_plan_id: plan.id,
        dimension_code: s.dimension_code,
        intervention_id: s.intervention_id,
        owner_name: 'A definir',
        title: s.title,
        description: s.description,
        kpi: s.kpi,
        due_date: due.toISOString().split('T')[0],
        priority: s.priority,
        estimated_cost_brl: s.estimated_cost_brl,
        status: 'pendente' as Nr01ActionStatus,
      }
    })

  if (toInsert.length === 0) {
    redirect(`/nr01/avaliacao/${assessmentId}/plano?error=Todas+as+sugest%C3%B5es+j%C3%A1+est%C3%A3o+no+plano.`)
  }

  await supabase.from('nr01_action_items').insert(toInsert as never)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_ITEMS_AUTO_SUGGESTED',
    payload: { n_added: toInsert.length },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/plano`)
}

// ============================================================
// ATUALIZAR STATUS DE ITEM
// ============================================================
export async function atualizarStatusItem(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const itemId       = formData.get('item_id') as string
  const status       = (formData.get('status') as string) as Nr01ActionStatus
  const notes        = (formData.get('completion_notes') as string)?.trim() || null

  const { supabase, user } = await ensureOwnership(assessmentId)

  const update: Partial<Nr01ActionItem> = { status }
  if (status === 'concluido') {
    update.completed_at = new Date().toISOString()
    update.completion_notes = notes
  }

  await supabase
    .from('nr01_action_items')
    .update(update as never)
    .eq('id', itemId)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_ITEM_STATUS_CHANGED',
    payload: { item_id: itemId, status },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/plano`)
}

// ============================================================
// MARCAR CHECKPOINT (30/60/90)
// ============================================================
export async function marcarCheckpoint(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const itemId       = formData.get('item_id') as string
  const checkpoint   = formData.get('checkpoint') as '30' | '60' | '90'

  const { supabase, user } = await ensureOwnership(assessmentId)

  const field =
    checkpoint === '30' ? 'check_30d_at'
    : checkpoint === '60' ? 'check_60d_at'
    : 'check_90d_at'

  await supabase
    .from('nr01_action_items')
    .update({ [field]: new Date().toISOString() } as never)
    .eq('id', itemId)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_ITEM_CHECKPOINT',
    payload: { item_id: itemId, checkpoint },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/plano`)
}

// ============================================================
// APROVAR PLANO
// ============================================================
export async function aprovarPlano(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, plan } = await getOrCreatePlan(assessmentId)

  const reviewIn = new Date()
  reviewIn.setDate(reviewIn.getDate() + 90)   // próximo review em 90 dias

  await supabase
    .from('nr01_action_plans')
    .update({
      status: 'aprovado',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      next_review_at: reviewIn.toISOString().split('T')[0],
    } as never)
    .eq('id', plan.id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ACTION_PLAN_APPROVED',
    payload: { plan_id: plan.id, next_review_at: reviewIn.toISOString().split('T')[0] },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/plano`)
}
