/**
 * QUANTUM5G — POST /api/billing/webhook/kiwify
 *
 * Webhook infoprodutos (compra_aprovada → provision NR-01).
 * Valida token configurado na dashboard/API (query ?token= ou body.token).
 * Idempotente via payments.asaas_payment_id = kiwify:{order_id}.
 *
 * Asaas permanece em /api/billing/webhook/asaas — sem alteração.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeKiwifyWebhook,
  verifyKiwifyWebhookToken,
  isKiwifyApprovedEvent,
  isKiwifyRefundEvent,
  hashPayloadForLog,
} from '@/lib/billing/kiwify-webhook'
import {
  provisionFromKiwifyWebhook,
  cancelFromKiwifyRefund,
} from '@/lib/billing/kiwify-provision'

export const dynamic = 'force-dynamic'

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return bad('JSON inválido')
  }

  const tokenFromQuery = req.nextUrl.searchParams.get('token')
  const tokenFromBody =
    typeof payload.token === 'string'
      ? payload.token
      : typeof payload.webhook_token === 'string'
        ? payload.webhook_token
        : null

  const receivedToken = tokenFromQuery ?? tokenFromBody
  if (!verifyKiwifyWebhookToken(receivedToken)) {
    console.warn('[webhook/kiwify] token inválido', hashPayloadForLog(payload))
    return bad('token inválido', 401)
  }

  const normalized = normalizeKiwifyWebhook(payload)

  try {
    if (isKiwifyRefundEvent(normalized)) {
      const result = await cancelFromKiwifyRefund(normalized)
      return NextResponse.json({ ok: true, ...result })
    }

    if (!isKiwifyApprovedEvent(normalized)) {
      return NextResponse.json({
        ok: true,
        ignored: normalized.trigger,
      })
    }

    const result = await provisionFromKiwifyWebhook(normalized)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[webhook/kiwify]', err)
    return NextResponse.json({ error: 'Falha ao processar webhook' }, { status: 500 })
  }
}
