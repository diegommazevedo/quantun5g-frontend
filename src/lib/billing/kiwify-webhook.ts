/**
 * Verificação e parsing de webhooks Kiwify (infoprodutos).
 * Docs: https://docs.kiwify.com.br/api-reference/webhooks/create
 */

import { createHash, timingSafeEqual } from 'crypto'

export type KiwifyWebhookTrigger =
  | 'compra_aprovada'
  | 'compra_reembolsada'
  | 'compra_recusada'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | string

export interface NormalizedKiwifyWebhook {
  trigger: KiwifyWebhookTrigger
  orderId: string | null
  subscriptionRef: string | null
  customerEmail: string | null
  productId: string | null
  productName: string | null
  status: string | null
  raw: Record<string, unknown>
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function getKiwifyWebhookSecret(): string {
  const token = process.env.KIWIFY_WEBHOOK_TOKEN?.trim()
  if (!token) throw new Error('KIWIFY_WEBHOOK_TOKEN não configurado')
  return token
}

/** Token enviado pela Kiwify (query ou corpo). */
export function verifyKiwifyWebhookToken(received: string | null | undefined): boolean {
  if (!received?.trim()) return false
  try {
    return safeEqual(received.trim(), getKiwifyWebhookSecret())
  } catch {
    return false
  }
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function nested(obj: unknown): Record<string, unknown> | null {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return obj as Record<string, unknown>
  }
  return null
}

/** Extrai subscription UUID gravada no checkout (utm_content ou s1). */
export function extractSubscriptionRef(payload: Record<string, unknown>): string | null {
  const tracking = nested(payload.TrackingParameters) ?? nested(payload.tracking)
  const fromTracking =
    pickString(tracking ?? {}, 'utm_content', 's1', 'sck') ??
    pickString(payload, 'utm_content', 's1', 'sck')

  if (fromTracking && /^[0-9a-f-]{36}$/i.test(fromTracking)) return fromTracking

  const commissions = payload.Commissions ?? payload.commissions
  if (commissions && typeof commissions === 'object') {
    const c = commissions as Record<string, unknown>
    const tracking2 = nested(c.tracking) ?? nested(c.TrackingParameters)
    const ref = pickString(tracking2 ?? {}, 'utm_content', 's1')
    if (ref && /^[0-9a-f-]{36}$/i.test(ref)) return ref
  }

  return null
}

export function normalizeKiwifyWebhook(payload: Record<string, unknown>): NormalizedKiwifyWebhook {
  const trigger =
    pickString(payload, 'webhook_event_type', 'event', 'trigger', 'type') ?? 'unknown'

  const order =
    nested(payload.order) ??
    nested(payload.Order) ??
    nested(payload.sale) ??
    payload

  const orderId =
    pickString(order, 'order_id', 'id', 'orderId') ?? pickString(payload, 'order_id', 'id')

  const product =
    nested(order.product) ??
    nested(order.Product) ??
    nested(payload.product) ??
    nested(payload.Product)

  const customer =
    nested(order.customer) ??
    nested(order.Customer) ??
    nested(payload.customer) ??
    nested(payload.Customer)

  const status =
    pickString(order, 'order_status', 'status') ?? pickString(payload, 'order_status', 'status')

  return {
    trigger,
    orderId,
    subscriptionRef: extractSubscriptionRef(payload),
    customerEmail: pickString(customer ?? {}, 'email', 'Email'),
    productId: pickString(product ?? {}, 'product_id', 'id'),
    productName: pickString(product ?? {}, 'product_name', 'name'),
    status,
    raw: payload,
  }
}

export function isKiwifyApprovedEvent(normalized: NormalizedKiwifyWebhook): boolean {
  const t = normalized.trigger.toLowerCase()
  if (t.includes('aprovada') || t.includes('approved') || t === 'order_approved') return true
  const st = (normalized.status ?? '').toLowerCase()
  return st === 'paid' || st === 'approved' || st === 'compra_aprovada'
}

export function isKiwifyRefundEvent(normalized: NormalizedKiwifyWebhook): boolean {
  const t = normalized.trigger.toLowerCase()
  return (
    t.includes('reembols') ||
    t.includes('refund') ||
    t.includes('chargeback') ||
    t.includes('subscription_canceled') ||
    t.includes('subscription_cancelled') ||
    t === 'canceled' ||
    t === 'cancelled'
  )
}

/** Idempotência payments.asaas_payment_id (coluna legada, prefixo kiwify:). */
export function kiwifyPaymentExternalId(orderId: string): string {
  return `kiwify:${orderId}`
}

export function hashPayloadForLog(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}
