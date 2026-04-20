'use server'

/**
 * QUANTUM5G — NR-01 · Server Action criar avaliação
 * Cria/reusa empresa + cria avaliação NR-01.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CompanyInsert } from '@/types/database'
import type { Nr01Modality } from '@/types/nr01'

export async function criarAvaliacaoNr01(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const companyId       = (formData.get('company_id') as string)?.trim() || null
  const newCompanyName  = (formData.get('new_company_name') as string)?.trim()
  const newCompanyTotal = parseInt(formData.get('new_company_total') as string) || 0
  const name            = (formData.get('name') as string)?.trim()
  const referencePeriod = (formData.get('reference_period') as string)?.trim() || null
  const modality        = ((formData.get('modality') as string) || 'WEB') as Nr01Modality
  const expectedResp    = parseInt(formData.get('expected_respondents') as string) || 0
  const opensAt         = (formData.get('collection_opens_at') as string) || null
  const closesAt        = (formData.get('collection_closes_at') as string) || null
  const linkedDiagId    = (formData.get('linked_diagnostic_id') as string)?.trim() || null
  const techLeadCrp     = (formData.get('technical_lead_crp') as string)?.trim() || null
  const kAnonymityMin   = parseInt(formData.get('k_anonymity_min') as string) || 5

  if (!name) {
    redirect('/nr01/avaliacao/nova?error=Nome+da+avalia%C3%A7%C3%A3o+%C3%A9+obrigat%C3%B3rio.')
  }

  // 1. Resolver empresa: existente ou nova
  let resolvedCompanyId = companyId
  if (!resolvedCompanyId) {
    if (!newCompanyName || newCompanyTotal <= 0) {
      redirect('/nr01/avaliacao/nova?error=Selecione+empresa+existente+ou+preencha+nome+e+total+da+nova.')
    }
    const empresaInsert: CompanyInsert = {
      name: newCompanyName,
      total_collaborators: newCompanyTotal,
      consultant_id: user.id,
    }
    const { data: empresa, error: errEmp } = await supabase
      .from('companies')
      .insert(empresaInsert as never)
      .select('id')
      .single()
    if (errEmp || !empresa) {
      redirect('/nr01/avaliacao/nova?error=Erro+ao+criar+empresa.')
    }
    resolvedCompanyId = (empresa as { id: string }).id
  }

  // 2. Criar avaliação NR-01
  const { data: assess, error: errAssess } = await supabase
    .from('nr01_assessments')
    .insert({
      company_id: resolvedCompanyId,
      consultant_id: user.id,
      name,
      reference_period: referencePeriod,
      instrument_version: 'v1.1',
      modality,
      expected_respondents: expectedResp,
      k_anonymity_min: kAnonymityMin,
      collection_opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      collection_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      linked_diagnostic_id: linkedDiagId,
      technical_lead_id: user.id,
      technical_lead_crp: techLeadCrp,
      status: 'CRIADO',
    } as never)
    .select('id')
    .single()

  if (errAssess || !assess) {
    redirect(`/nr01/avaliacao/nova?error=${encodeURIComponent('Erro ao criar avaliação: ' + (errAssess?.message ?? ''))}`)
  }

  const assessmentId = (assess as { id: string }).id

  // 3. Trilha de auditoria
  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ASSESSMENT_CREATED',
    payload: { name, modality, expectedResp },
  } as never)

  redirect(`/nr01/avaliacao/${assessmentId}`)
}
