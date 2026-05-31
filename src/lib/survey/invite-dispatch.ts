/**
 * Convite por campanha — evita reenvio duplicado (sent/delivered/complained).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SurveyKind, SurveyModule } from '@/lib/survey/dispatch'

const SKIP_RESEND_STATUSES = new Set(['sent', 'delivered', 'complained'])

export interface CampaignInviteRow {
  id: string
  contact_id: string
  token: string
  email_status: string | null
}

export async function loadCampaignInvitesByContact(
  supabase: SupabaseClient,
  input: {
    referenceId: string
    module: SurveyModule
    surveyKind: SurveyKind
  },
): Promise<Map<string, CampaignInviteRow>> {
  const { data } = await supabase
    .from('survey_invites')
    .select('id, contact_id, token, email_status')
    .eq('reference_id', input.referenceId)
    .eq('module', input.module)
    .eq('survey_kind', input.surveyKind)

  const map = new Map<string, CampaignInviteRow>()
  for (const row of (data ?? []) as CampaignInviteRow[]) {
    map.set(row.contact_id, row)
  }
  return map
}

export type InviteDispatchResolution =
  | { action: 'send'; id: string; token: string }
  | { action: 'skip'; reason: string; id?: string }

export async function resolveInviteForDispatch(
  supabase: SupabaseClient,
  input: {
    companyId: string
    contactId: string
    module: SurveyModule
    surveyKind: SurveyKind
    referenceId: string
    surveyUrl: string
  },
  existing?: CampaignInviteRow | null,
): Promise<InviteDispatchResolution> {
  if (existing) {
    const st = existing.email_status ?? 'pending'
    if (SKIP_RESEND_STATUSES.has(st)) {
      const label =
        st === 'complained'
          ? 'Marcado como spam — reative na equipe'
          : 'Já enviado/entregue nesta campanha'
      return { action: 'skip', reason: label, id: existing.id }
    }

    await supabase
      .from('survey_invites')
      .update({
        survey_url: input.surveyUrl,
        email_status: 'pending',
        email_error: null,
      } as never)
      .eq('id', existing.id)

    return { action: 'send', id: existing.id, token: existing.token }
  }

  const { data, error } = await supabase
    .from('survey_invites')
    .insert({
      company_id: input.companyId,
      contact_id: input.contactId,
      module: input.module,
      survey_kind: input.surveyKind,
      reference_id: input.referenceId,
      survey_url: input.surveyUrl,
      email_status: 'pending',
    } as never)
    .select('id, token')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao criar convite')
  }

  const row = data as { id: string; token: string }
  return { action: 'send', id: row.id, token: row.token }
}
