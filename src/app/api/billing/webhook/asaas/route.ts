/**
 * QUANTUM5G — POST /api/billing/webhook/asaas (P021)
 *
 * Webhook do Asaas. Idempotente por asaas_payment_id (UNIQUE no schema).
 *
 * Eventos tratados:
 *   PAYMENT_CONFIRMED, PAYMENT_RECEIVED → ativa subscription
 *   PAYMENT_OVERDUE                      → status='failed'
 *   PAYMENT_REFUNDED, PAYMENT_DELETED    → status='cancelled'
 *
 * Header validado: asaas-access-token (constant-time compare).
 *
 * IMPORTANTE: este endpoint usa service_role (bypassa RLS) e
 * NÃO requer auth de usuário. Por isso a validação do token é
 * a única defesa — não relaxar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookToken } from '@/lib/billing/asaas-client'
import {
  createServiceRoleClient,
  createServiceRoleAdmin,
} from '@/lib/supabase/service-role'
import {
  activateSubscription,
  setSubscriptionStatus,
} from '@/lib/billing/subscription'
import type { ProductPlan, Subscription } from '@/types/database'

interface AsaasWebhookEvent {
  event?: string
  payment?: {
    id?: string
    status?: string
    value?: number
    paymentDate?: string
    confirmedDate?: string
    billingType?: string
    externalReference?: string
  }
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  // 1. Validar token
  const token = req.headers.get('asaas-access-token')
  if (!verifyWebhookToken(token)) {
    return bad('token inválido', 401)
  }

  // 2. Parse
  let event: AsaasWebhookEvent
  try {
    event = (await req.json()) as AsaasWebhookEvent
  } catch {
    return bad('JSON inválido')
  }

  const { event: eventType, payment } = event
  if (!eventType || !payment?.id) return bad('evento sem id')

  const admin = createServiceRoleClient()

  // 3. Localizar subscription por externalReference (UUID) ou asaas_payment_id
  const extRef = payment.externalReference
  const paymentId = payment.id
  const { data: subRow, error: subErr } = await (async () => {
    if (extRef) {
      const r = await admin
        .from('subscriptions')
        .select('*')
        .eq('id', extRef)
        .maybeSingle()
      if (r.data) return r
    }
    return admin
      .from('subscriptions')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .maybeSingle()
  })()

  if (subErr) return bad(`db error: ${subErr.message}`, 500)
  if (!subRow) {
    // Não falha o webhook do Asaas; só loga e devolve 200 (idempotência amigável)
    return NextResponse.json({ ok: true, ignored: 'subscription não encontrada' })
  }
  const subscription = subRow as Subscription

  // 4. Persistir payment (idempotente via UNIQUE asaas_payment_id).
  // Usa cliente untyped para o write (limitação do supabase-js v2.100+
  // com Insert types complexos — mesmo padrão usado pelo P020 agente).
  const adminUntyped = createServiceRoleAdmin()
  await adminUntyped.from('payments').upsert(
    {
      subscription_id: subscription.id,
      asaas_payment_id: payment.id,
      amount_cents: Math.round((payment.value ?? 0) * 100),
      status: payment.status ?? eventType,
      payment_method: payment.billingType ?? null,
      paid_at: payment.confirmedDate
        ? new Date(payment.confirmedDate).toISOString()
        : null,
      webhook_payload: event as unknown as Record<string, unknown>,
    },
    { onConflict: 'asaas_payment_id' },
  )

  // 5. Aplicar transição de estado
  switch (eventType) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      const paidAt =
        payment.confirmedDate
          ? new Date(payment.confirmedDate)
          : payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date()

      if (subscription.product_id === 'nr01') {
        const { provisionNr01Subscription } = await import('@/lib/billing/provision-nr01')
        await provisionNr01Subscription({ subscription, paidAt })
        return NextResponse.json({ ok: true, action: 'activated_nr01' })
      }

      const { data: planRow } = await admin
        .from('product_plans')
        .select('modality, assessments_per_period')
        .eq('id', subscription.plan_id)
        .maybeSingle()
      const plan = planRow as Pick<ProductPlan, 'modality' | 'assessments_per_period'> | null
      if (!plan) return bad('plano não encontrado para subscription', 500)

      await activateSubscription({
        subscriptionId: subscription.id,
        paidAt,
        modality: plan.modality,
        assessmentsPerPeriod: plan.assessments_per_period,
      })
      return NextResponse.json({ ok: true, action: 'activated' })
    }

    case 'PAYMENT_OVERDUE':
      await setSubscriptionStatus(subscription.id, 'failed')
      return NextResponse.json({ ok: true, action: 'failed' })

    case 'PAYMENT_REFUNDED':
    case 'PAYMENT_DELETED':
      await setSubscriptionStatus(subscription.id, 'cancelled')
      return NextResponse.json({ ok: true, action: 'cancelled' })

    default:
      return NextResponse.json({ ok: true, ignored: eventType })
  }
}
