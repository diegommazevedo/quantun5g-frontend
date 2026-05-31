/**
 * POST /api/webhooks/resend
 *
 * Eventos Resend (Svix): delivered, bounced, complained, opened, clicked.
 * Atualiza survey_invites e lista email_suppressions.
 *
 * Configurar no dashboard Resend → Webhooks:
 *   https://SEU_DOMINIO/api/webhooks/resend
 * Eventos: email.delivered, email.bounced, email.complained,
 *          email.opened, email.clicked, email.delivery_delayed
 *
 * .env.local: RESEND_WEBHOOK_SECRET=whsec_...
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyResendWebhookSignature } from '@/lib/email/resend-webhook-verify'
import { processResendWebhookEvent, type ResendWebhookPayload } from '@/lib/email/resend-webhook-handler'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

function unauthorized(msg: string) {
  return NextResponse.json({ error: msg }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const verified = verifyResendWebhookSignature(
    rawBody,
    {
      'svix-id': req.headers.get('svix-id'),
      'svix-timestamp': req.headers.get('svix-timestamp'),
      'svix-signature': req.headers.get('svix-signature'),
    },
    process.env.RESEND_WEBHOOK_SECRET,
  )

  if (!verified.ok) {
    console.warn('[webhook/resend]', verified.error)
    return unauthorized(verified.error)
  }

  const svixId = req.headers.get('svix-id')?.trim()
  if (!svixId) {
    return NextResponse.json({ error: 'svix-id ausente' }, { status: 400 })
  }

  let payload: ResendWebhookPayload
  try {
    payload = JSON.parse(rawBody) as ResendWebhookPayload
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleAdmin()
    const result = await processResendWebhookEvent(admin, svixId, payload)
    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate ?? false,
      type: payload.type ?? null,
    })
  } catch (err) {
    console.error('[webhook/resend] process error:', err)
    return NextResponse.json({ error: 'Falha ao processar evento' }, { status: 500 })
  }
}
