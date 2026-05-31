/**
 * Verificação de assinatura Svix (Resend webhooks).
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */

import { createHmac, timingSafeEqual } from 'crypto'

const MAX_AGE_SEC = 300

export function verifyResendWebhookSignature(
  rawBody: string,
  headers: {
    'svix-id'?: string | null
    'svix-timestamp'?: string | null
    'svix-signature'?: string | null
  },
  secret: string | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!secret?.trim()) {
    return { ok: false, error: 'RESEND_WEBHOOK_SECRET não configurado' }
  }

  const msgId = headers['svix-id']?.trim()
  const timestamp = headers['svix-timestamp']?.trim()
  const signatureHeader = headers['svix-signature']?.trim()

  if (!msgId || !timestamp || !signatureHeader) {
    return { ok: false, error: 'Cabeçalhos Svix ausentes' }
  }

  const ts = parseInt(timestamp, 10)
  if (!Number.isFinite(ts)) {
    return { ok: false, error: 'Timestamp Svix inválido' }
  }
  const age = Math.abs(Math.floor(Date.now() / 1000) - ts)
  if (age > MAX_AGE_SEC) {
    return { ok: false, error: 'Webhook expirado (timestamp)' }
  }

  const secretPart = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(secretPart, 'base64')
  } catch {
    return { ok: false, error: 'RESEND_WEBHOOK_SECRET inválido' }
  }

  const signedContent = `${msgId}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  const parts = signatureHeader.split(/\s+/)
  for (const part of parts) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return { ok: true }
      }
    } catch {
      continue
    }
  }

  return { ok: false, error: 'Assinatura Svix inválida' }
}
