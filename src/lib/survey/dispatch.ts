/**

 * Disparo de convites de questionário — lista de transmissão tokenizada.

 */



import { createClient } from '@/lib/supabase/server'

import { sendEmail, platformEmailFrom, buildSurveyInviteEmail } from '@/lib/email/platform'

import { loadSuppressedEmailSet, normalizeEmail } from '@/lib/email/suppression'

import {

  loadCampaignInvitesByContact,

  resolveInviteForDispatch,

} from '@/lib/survey/invite-dispatch'

import type { CompanyContact } from '@/types/database'



export type SurveyModule = 'pentagrama' | 'nr01'

export type SurveyKind = 'il' | 'ic' | 'nr01_coleta'



export interface DispatchTarget {

  contact: Pick<CompanyContact, 'id' | 'full_name' | 'email' | 'contact_role'>

  surveyUrl: string

}



export interface DispatchResult {

  batchId: string

  sent: number

  failed: number

  skipped: number

}



function appBaseUrl(): string {

  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

}



export function buildPentagramaIlUrl(diagnosticIlToken: string, inviteToken?: string): string {

  const base = `${appBaseUrl()}/il/${diagnosticIlToken}`

  return inviteToken ? `${base}?invite=${inviteToken}` : base

}



export function buildPentagramaIcUrl(icToken: string, inviteToken?: string): string {

  const base = `${appBaseUrl()}/ic/${icToken}`

  return inviteToken ? `${base}?invite=${inviteToken}` : base

}



export function buildNr01ColetaUrl(collectionToken: string, inviteToken?: string): string {

  const base = `${appBaseUrl()}/nr01/coleta/${collectionToken}`

  return inviteToken ? `${base}?invite=${inviteToken}` : base

}



/** Pentagrama: líderes para IL, colaboradores para IC. NR-01: todos os ativos (papéis ignorados). */

export function filterContactsForDispatch(

  contacts: CompanyContact[],

  module: SurveyModule,

  kind: SurveyKind,

): CompanyContact[] {

  const active = contacts.filter((c) => c.is_active && c.email?.trim())

  if (module === 'nr01' || kind === 'nr01_coleta') {

    return active

  }

  if (kind === 'il') {

    return active.filter((c) => c.contact_role === 'leader')

  }

  return active.filter((c) => c.contact_role === 'collaborator')

}



/** @deprecated Use resolveInviteForDispatch dentro do fluxo de disparo. */

export async function upsertSurveyInvite(input: {

  companyId: string

  contactId: string

  module: SurveyModule

  surveyKind: SurveyKind

  referenceId: string

  surveyUrl: string

}): Promise<{ id: string; token: string }> {

  const supabase = await createClient()

  const resolved = await resolveInviteForDispatch(

    supabase,

    input,

    null,

  )

  if (resolved.action === 'skip') {

    throw new Error(resolved.reason)

  }

  return { id: resolved.id, token: resolved.token }

}



export async function dispatchSurveyInvites(input: {

  companyId: string

  consultantId: string

  module: SurveyModule

  surveyKind: SurveyKind

  referenceId: string

  companyName: string

  surveyLabel: string

  moduleLabel: string

  targets: DispatchTarget[]

  deadline?: string | null

  consultantName?: string | null

}): Promise<DispatchResult> {

  const supabase = await createClient()



  const { data: batch, error: batchErr } = await supabase

    .from('email_dispatch_batches')

    .insert({

      company_id: input.companyId,

      consultant_id: input.consultantId,

      module: input.module,

      survey_kind: input.surveyKind,

      reference_id: input.referenceId,

      subject: `${input.moduleLabel} — ${input.surveyLabel}`,

      total_targets: input.targets.length,

    } as never)

    .select('id')

    .single()



  if (batchErr || !batch) throw new Error(batchErr?.message ?? 'Falha ao registrar lote')

  const batchId = (batch as { id: string }).id



  let sent = 0

  let failed = 0

  let skipped = 0

  const from = platformEmailFrom(input.module)



  const suppressed = await loadSuppressedEmailSet(

    supabase,

    input.targets.map((t) => t.contact.email),

  )



  const campaignInvites = await loadCampaignInvitesByContact(supabase, {

    referenceId: input.referenceId,

    module: input.module,

    surveyKind: input.surveyKind,

  })



  for (const t of input.targets) {

    const email = normalizeEmail(t.contact.email)

    let surveyUrl = t.surveyUrl

    if (!email.includes('@')) {

      skipped += 1

      await supabase.from('email_dispatch_items').insert({

        batch_id: batchId,

        contact_id: t.contact.id,

        email,

        status: 'skipped',

        error_message: 'E-mail inválido',

      } as never)

      continue

    }



    if (suppressed.has(email)) {

      skipped += 1

      await supabase.from('email_dispatch_items').insert({

        batch_id: batchId,

        contact_id: t.contact.id,

        email,

        status: 'skipped',

        error_message: 'E-mail na lista de supressão (bounce/spam)',

      } as never)

      continue

    }



    let inviteId: string | null = null

    try {

      const resolved = await resolveInviteForDispatch(

        supabase,

        {

          companyId: input.companyId,

          contactId: t.contact.id,

          module: input.module,

          surveyKind: input.surveyKind,

          referenceId: input.referenceId,

          surveyUrl,

        },

        campaignInvites.get(t.contact.id),

      )



      if (resolved.action === 'skip') {

        skipped += 1

        await supabase.from('email_dispatch_items').insert({

          batch_id: batchId,

          contact_id: t.contact.id,

          email,

          status: 'skipped',

          error_message: resolved.reason,

          invite_id: resolved.id ?? null,

        } as never)

        continue

      }



      inviteId = resolved.id

      const inviteToken = resolved.token



      if (input.module === 'pentagrama' && input.surveyKind === 'il') {

        surveyUrl = buildPentagramaIlUrl(

          surveyUrl.split('/il/')[1]?.split('?')[0] ?? '',

          inviteToken,

        )

      } else if (input.module === 'pentagrama' && input.surveyKind === 'ic') {

        surveyUrl = buildPentagramaIcUrl(

          surveyUrl.split('/ic/')[1]?.split('?')[0] ?? '',

          inviteToken,

        )

      } else if (input.surveyKind === 'nr01_coleta') {

        const token = surveyUrl.split('/nr01/coleta/')[1]?.split('?')[0] ?? ''

        surveyUrl = buildNr01ColetaUrl(token, inviteToken)

      }



      const mail = buildSurveyInviteEmail({

        to: email,

        recipientName: t.contact.full_name,

        companyName: input.companyName,

        moduleLabel: input.moduleLabel,

        surveyLabel: input.surveyLabel,

        surveyUrl,

        deadline: input.deadline,

        consultantName: input.consultantName,

      })



      const result = await sendEmail({

        to: email,

        subject: mail.subject,

        text: mail.text,

        html: mail.html,

        from,

        inviteId,

      })



      if (result.ok) {

        sent += 1

        const patch: Record<string, string> = {

          email_sent_at: new Date().toISOString(),

          email_status: 'sent',

        }

        if (result.id && !result.simulated && result.driver === 'resend') {

          patch.resend_email_id = result.id

        }

        await supabase

          .from('survey_invites')

          .update(patch as never)

          .eq('id', inviteId)

        await supabase.from('email_dispatch_items').insert({

          batch_id: batchId,

          contact_id: t.contact.id,

          email,

          status: 'sent',

          invite_id: inviteId,

        } as never)

      } else {

        failed += 1

        await supabase

          .from('survey_invites')

          .update({ email_status: 'failed', email_error: result.error ?? 'erro' } as never)

          .eq('id', inviteId)

        await supabase.from('email_dispatch_items').insert({

          batch_id: batchId,

          contact_id: t.contact.id,

          email,

          status: 'failed',

          error_message: result.error,

          invite_id: inviteId,

        } as never)

      }

    } catch (err) {

      failed += 1

      await supabase.from('email_dispatch_items').insert({

        batch_id: batchId,

        contact_id: t.contact.id,

        email,

        status: 'failed',

        error_message: (err as Error).message,

        invite_id: inviteId,

      } as never)

    }

  }



  await supabase

    .from('email_dispatch_batches')

    .update({ sent_count: sent, failed_count: failed } as never)

    .eq('id', batchId)



  return { batchId, sent, failed, skipped }

}


