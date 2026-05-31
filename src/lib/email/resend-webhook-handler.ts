/**
 * Processamento de eventos Resend → survey_invites + supressão.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { addEmailSuppression, normalizeEmail } from '@/lib/email/suppression'

export interface ResendWebhookPayload {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string | string[]
    subject?: string
    bounce?: { message?: string; type?: string; subType?: string }
    click?: { link?: string }
    tags?: Array<{ name?: string; value?: string }>
  }
}

function recipientEmail(data: ResendWebhookPayload['data']): string | null {
  if (!data?.to) return null
  const raw = Array.isArray(data.to) ? data.to[0] : data.to
  return raw ? normalizeEmail(raw) : null
}

function inviteIdFromTags(data: ResendWebhookPayload['data']): string | null {
  const tag = data?.tags?.find((t) => t.name === 'invite_id')
  return tag?.value?.trim() || null
}

async function findInvite(
  admin: SupabaseClient,
  resendEmailId: string | undefined,
  inviteIdTag: string | null,
) {
  if (inviteIdTag) {
    const { data } = await admin
      .from('survey_invites')
      .select('id, contact_id, email_status')
      .eq('id', inviteIdTag)
      .maybeSingle()
    if (data) return data as { id: string; contact_id: string; email_status: string | null }
  }
  if (!resendEmailId) return null
  const { data } = await admin
    .from('survey_invites')
    .select('id, contact_id, email_status')
    .eq('resend_email_id', resendEmailId)
    .maybeSingle()
  return (data as { id: string; contact_id: string; email_status: string | null } | null) ?? null
}

export async function processResendWebhookEvent(
  admin: SupabaseClient,
  svixId: string,
  payload: ResendWebhookPayload,
): Promise<{ processed: boolean; duplicate?: boolean }> {
  const eventType = payload.type ?? 'unknown'
  const resendEmailId = payload.data?.email_id ?? null
  const inviteIdTag = inviteIdFromTags(payload.data)
  const toEmail = recipientEmail(payload.data)

  const invite = await findInvite(admin, resendEmailId ?? undefined, inviteIdTag)

  const summary = {
    type: eventType,
    email_id: resendEmailId,
    to: toEmail,
    invite_id: invite?.id ?? inviteIdTag,
    bounce_type: payload.data?.bounce?.type ?? null,
  }

  const { error: logErr } = await admin.from('email_webhook_events').insert({
    svix_id: svixId,
    event_type: eventType,
    resend_email_id: resendEmailId,
    invite_id: invite?.id ?? null,
    payload_summary: summary,
  } as never)

  if (logErr?.code === '23505') {
    return { processed: false, duplicate: true }
  }
  if (logErr) {
    throw new Error(logErr.message)
  }

  if (!invite?.id) {
    return { processed: true }
  }

  const now = new Date().toISOString()
  const inviteId = invite.id

  switch (eventType) {
    case 'email.delivered':
      await admin
        .from('survey_invites')
        .update({
          email_status: 'delivered',
          email_delivered_at: now,
          email_error: null,
        } as never)
        .eq('id', inviteId)
      break

    case 'email.opened':
      await admin
        .from('survey_invites')
        .update({ email_opened_at: now } as never)
        .eq('id', inviteId)
        .is('email_opened_at', null)
      break

    case 'email.clicked':
      await admin
        .from('survey_invites')
        .update({ email_clicked_at: now } as never)
        .eq('id', inviteId)
        .is('email_clicked_at', null)
      break

    case 'email.bounced': {
      const bounceType = (payload.data?.bounce?.type ?? 'hard').toLowerCase()
      const msg = payload.data?.bounce?.message ?? 'bounce'
      const isHard = bounceType !== 'soft'

      await admin
        .from('survey_invites')
        .update({
          email_status: isHard ? 'bounced' : invite.email_status ?? 'sent',
          email_error: msg.slice(0, 500),
        } as never)
        .eq('id', inviteId)

      if (isHard && toEmail) {
        await addEmailSuppression(admin, {
          email: toEmail,
          reason: 'hard_bounce',
          resendEmailId,
          resendEventId: svixId,
          contactId: invite.contact_id,
          notes: msg.slice(0, 500),
        })
      }
      break
    }

    case 'email.complained':
      await admin
        .from('survey_invites')
        .update({ email_status: 'complained', email_error: 'spam complaint' } as never)
        .eq('id', inviteId)

      if (toEmail) {
        await addEmailSuppression(admin, {
          email: toEmail,
          reason: 'complaint',
          resendEmailId,
          resendEventId: svixId,
          contactId: invite.contact_id,
          notes: 'Marcado como spam pelo destinatário',
        })
      }
      break

    case 'email.delivery_delayed':
      await admin
        .from('survey_invites')
        .update({
          email_error: 'Entrega atrasada — tentativa em andamento',
        } as never)
        .eq('id', inviteId)
      break

    default:
      break
  }

  if (inviteId && (eventType === 'email.bounced' || eventType === 'email.complained')) {
    const { data: item } = await admin
      .from('email_dispatch_items')
      .select('id')
      .eq('invite_id', inviteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (item) {
      await admin
        .from('email_dispatch_items')
        .update({
          status: 'failed',
          error_message:
            eventType === 'email.complained'
              ? 'spam complaint (Resend)'
              : (payload.data?.bounce?.message ?? 'hard bounce').slice(0, 500),
        } as never)
        .eq('id', (item as { id: string }).id)
    }
  }

  return { processed: true }
}
