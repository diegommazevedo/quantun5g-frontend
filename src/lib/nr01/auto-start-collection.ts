/**
 * Abre coleta NR-01 (COLETANDO) e dispara convites da lista de transmissão — self-service.
 * Idempotente: não reabre coleta já encerrada; reutiliza status COLETANDO.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import {
  buildNr01ColetaUrl,
  dispatchSurveyInvites,
  filterContactsForDispatch,
  type DispatchTarget,
} from '@/lib/survey/dispatch'
import type { CompanyContact } from '@/types/database'

export interface AutoStartCollectionResult {
  opened: boolean
  alreadyOpen: boolean
  skippedReason?: string
  invites: {
    dispatched: boolean
    sent: number
    failed: number
    skipped: number
  }
}

export async function autoStartNr01Collection(params: {
  assessmentId: string
  userId: string
}): Promise<AutoStartCollectionResult> {
  const emptyInvites = { dispatched: false, sent: 0, failed: 0, skipped: 0 }
  const admin = createServiceRoleAdmin()

  const { data: assessRaw } = await admin
    .from('nr01_assessments')
    .select(
      `
      id, name, status, collection_token, collection_closes_at, consultant_id, company_id,
      companies:companies!nr01_assessments_company_id_fkey ( id, name )
    `,
    )
    .eq('id', params.assessmentId)
    .maybeSingle()

  if (!assessRaw) {
    return { opened: false, alreadyOpen: false, skippedReason: 'avaliacao_nao_encontrada', invites: emptyInvites }
  }

  const assess = assessRaw as unknown as {
    id: string
    name: string
    status: string
    collection_token: string
    collection_closes_at: string | null
    consultant_id: string
    company_id: string
    companies: { id: string; name: string } | { id: string; name: string }[] | null
  }

  const companyRow = Array.isArray(assess.companies) ? assess.companies[0] ?? null : assess.companies
  const companyId = companyRow?.id ?? assess.company_id
  if (!companyId || !assess.collection_token) {
    return { opened: false, alreadyOpen: false, skippedReason: 'dados_incompletos', invites: emptyInvites }
  }

  if (!['CRIADO', 'COLETANDO'].includes(assess.status)) {
    return {
      opened: false,
      alreadyOpen: assess.status === 'COLETANDO',
      skippedReason: `status_${assess.status}`,
      invites: emptyInvites,
    }
  }

  let opened = false
  let alreadyOpen = assess.status === 'COLETANDO'

  if (assess.status === 'CRIADO') {
    const { error } = await admin
      .from('nr01_assessments')
      .update({ status: 'COLETANDO' } as never)
      .eq('id', params.assessmentId)

    if (error) {
      console.error('[auto-start-collection] open failed:', error.message)
      return { opened: false, alreadyOpen: false, skippedReason: error.message, invites: emptyInvites }
    }

    await admin.from('nr01_audit_log').insert({
      assessment_id: params.assessmentId,
      actor_id: params.userId,
      actor_role: 'contratante',
      event_type: 'COLLECTION_OPENED',
      payload: { auto_provisioned: true },
    } as never)

    opened = true
    alreadyOpen = false
  }

  const { data: contactsRaw } = await admin
    .from('company_contacts')
    .select('*')
    .eq('company_id', companyId)

  const contacts = filterContactsForDispatch(
    (contactsRaw ?? []) as CompanyContact[],
    'nr01',
    'nr01_coleta',
  )

  if (contacts.length === 0) {
    return { opened, alreadyOpen, invites: emptyInvites }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('name')
    .eq('id', params.userId)
    .maybeSingle()

  const targets: DispatchTarget[] = contacts.map((c) => ({
    contact: c,
    surveyUrl: buildNr01ColetaUrl(assess.collection_token),
  }))

  try {
    const result = await dispatchSurveyInvites({
      companyId,
      consultantId: assess.consultant_id ?? params.userId,
      module: 'nr01',
      surveyKind: 'nr01_coleta',
      referenceId: params.assessmentId,
      companyName: companyRow?.name ?? 'Empresa',
      surveyLabel: `Coleta NR-01 — ${assess.name}`,
      moduleLabel: 'NR-01',
      targets,
      deadline: assess.collection_closes_at
        ? new Date(assess.collection_closes_at).toLocaleDateString('pt-BR')
        : null,
      consultantName: (profile as { name: string | null } | null)?.name,
    })

    console.info('[auto-start-collection] convites disparados', {
      assessmentId: params.assessmentId,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    })

    return {
      opened,
      alreadyOpen,
      invites: {
        dispatched: true,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
    }
  } catch (e) {
    console.error('[auto-start-collection] dispatch failed:', e)
    return {
      opened,
      alreadyOpen,
      skippedReason: e instanceof Error ? e.message : 'falha_disparo',
      invites: emptyInvites,
    }
  }
}
