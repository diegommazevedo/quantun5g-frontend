/**
 * Provisionamento pós-webhook Kiwify → subscription + NR-01 entitlements.
 */

import { createServiceRoleAdmin, createServiceRoleClient } from '@/lib/supabase/service-role'
import { provisionNr01Subscription } from '@/lib/billing/provision-nr01'
import { findKiwifyEntryByProductId } from '@/lib/billing/kiwify-product-map'
import {
  buildSubscriptionMetadata,
  computeCheckoutPricing,
  planDbId,
  type Nr01SubscriptionMetadata,
} from '@/lib/billing/nr01-catalog'
import { kiwifyRequest, type KiwifySaleDetails } from '@/lib/billing/kiwify-client'
import {
  kiwifyPaymentExternalId,
  type NormalizedKiwifyWebhook,
} from '@/lib/billing/kiwify-webhook'
import type { Subscription, SubscriptionInsert } from '@/types/database'
import { randomUUID } from 'crypto'

export interface KiwifyProvisionResult {
  action: 'activated_nr01' | 'activated' | 'ignored' | 'failed'
  subscriptionId?: string
  reason?: string
}

export async function fetchKiwifySale(orderId: string): Promise<KiwifySaleDetails | null> {
  try {
    return await kiwifyRequest<KiwifySaleDetails>('GET', `/sales/${encodeURIComponent(orderId)}`)
  } catch (e) {
    console.error('[kiwify-provision] fetch sale failed:', e)
    return null
  }
}

function saleSubscriptionRef(sale: KiwifySaleDetails): string | null {
  const ref = sale.tracking?.utm_content ?? sale.tracking?.s1 ?? null
  if (ref && /^[0-9a-f-]{36}$/i.test(ref)) return ref
  return null
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin.from('profiles').select('id').eq('email', email.trim()).maybeSingle()
  return data?.id ?? null
}

async function upsertKiwifyPayment(params: {
  subscriptionId: string
  orderId: string
  amountCents: number
  status: string
  paymentMethod: string | null
  paidAt: Date | null
  payload: Record<string, unknown>
}): Promise<void> {
  const admin = createServiceRoleAdmin()
  await admin.from('payments').upsert(
    {
      subscription_id: params.subscriptionId,
      asaas_payment_id: kiwifyPaymentExternalId(params.orderId),
      amount_cents: params.amountCents,
      status: params.status,
      payment_method: params.paymentMethod,
      paid_at: params.paidAt?.toISOString() ?? null,
      webhook_payload: params.payload,
    },
    { onConflict: 'asaas_payment_id' },
  )
}

function metadataFromMapEntry(
  entry: NonNullable<ReturnType<typeof findKiwifyEntryByProductId>>,
  headcountDeclared: number | null,
): Nr01SubscriptionMetadata {
  const pricing = computeCheckoutPricing({
    tierId: entry.tier_id,
    billingMode: entry.billing_mode,
    includePentagrama: entry.include_pentagrama,
  })
  return buildSubscriptionMetadata(pricing, headcountDeclared)
}

export async function provisionFromKiwifyWebhook(
  normalized: NormalizedKiwifyWebhook,
): Promise<KiwifyProvisionResult> {
  if (!normalized.orderId) {
    return { action: 'ignored', reason: 'sem order_id' }
  }

  const sale = await fetchKiwifySale(normalized.orderId)
  if (!sale) {
    return { action: 'failed', reason: 'venda não encontrada na API' }
  }

  if (sale.status !== 'paid') {
    return { action: 'ignored', reason: `status=${sale.status}` }
  }

  const admin = createServiceRoleClient()
  const adminUntyped = createServiceRoleAdmin()
  const orderId = sale.id
  const externalPayId = kiwifyPaymentExternalId(orderId)

  let subscriptionRef =
    normalized.subscriptionRef ?? saleSubscriptionRef(sale)

  let subscription: Subscription | null = null

  if (subscriptionRef) {
    const { data } = await admin.from('subscriptions').select('*').eq('id', subscriptionRef).maybeSingle()
    subscription = data ? (data as Subscription) : null
  }

  if (!subscription) {
    const { data: byPay } = await admin
      .from('subscriptions')
      .select('*')
      .eq('asaas_payment_id', externalPayId)
      .maybeSingle()
    subscription = byPay ? (byPay as Subscription) : null
  }

  const productId = sale.product?.id ?? normalized.productId
  const chargeCents = Math.round(sale.payment?.charge_amount ?? sale.net_amount ?? 0)
  const mapEntry = productId
    ? findKiwifyEntryByProductId(productId, { priceCents: chargeCents > 0 ? chargeCents : undefined })
    : null
  const customerEmail = sale.customer?.email ?? normalized.customerEmail

  if (!subscription && customerEmail && mapEntry) {
    const userId = await findUserIdByEmail(customerEmail)
    if (userId) {
      const subId = randomUUID()
      const meta = metadataFromMapEntry(mapEntry, null) as unknown as Record<string, unknown>
      const insert: SubscriptionInsert = {
        id: subId,
        user_id: userId,
        product_id: 'nr01',
        plan_id: planDbId(mapEntry.tier_id),
        status: 'pending',
        assessments_remaining: 0,
        asaas_payment_id: externalPayId,
        metadata: {
          ...meta,
          gateway: 'kiwify',
          kiwify_order_id: orderId,
          kiwify_product_id: productId,
        },
      }
      const { error } = await adminUntyped.from('subscriptions').insert(insert)
      if (!error) {
        const { data: created } = await admin.from('subscriptions').select('*').eq('id', subId).maybeSingle()
        subscription = created ? (created as Subscription) : null
      }
    }
  }

  if (!subscription) {
    console.warn('[kiwify-provision] subscription não encontrada', {
      orderId,
      subscriptionRef,
      email: customerEmail,
    })
    return { action: 'ignored', reason: 'subscription não encontrada' }
  }

  const paidAt = sale.approved_date ? new Date(sale.approved_date) : new Date()
  const amountCents = Math.round(
    (sale.payment?.charge_amount ?? sale.net_amount ?? 0),
  )

  await upsertKiwifyPayment({
    subscriptionId: subscription.id,
    orderId,
    amountCents,
    status: sale.status,
    paymentMethod: sale.payment_method ?? null,
    paidAt,
    payload: normalized.raw,
  })

  await adminUntyped
    .from('subscriptions')
    .update({
      asaas_payment_id: externalPayId,
      metadata: {
        ...(typeof subscription.metadata === 'object' && subscription.metadata
          ? subscription.metadata
          : {}),
        gateway: 'kiwify',
        kiwify_order_id: orderId,
        kiwify_product_id: productId,
      },
    })
    .eq('id', subscription.id)

  if (subscription.product_id === 'nr01') {
    await provisionNr01Subscription({ subscription, paidAt })
    return { action: 'activated_nr01', subscriptionId: subscription.id }
  }

  return { action: 'ignored', reason: 'produto não NR-01', subscriptionId: subscription.id }
}

export async function cancelFromKiwifyRefund(
  normalized: NormalizedKiwifyWebhook,
): Promise<KiwifyProvisionResult> {
  if (!normalized.orderId) return { action: 'ignored', reason: 'sem order_id' }
  const admin = createServiceRoleAdmin()
  const externalPayId = kiwifyPaymentExternalId(normalized.orderId)
  const { data } = await admin
    .from('subscriptions')
    .select('id')
    .eq('asaas_payment_id', externalPayId)
    .maybeSingle()
  if (!data?.id) return { action: 'ignored', reason: 'subscription não encontrada' }
  await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', data.id)
  return { action: 'activated', subscriptionId: data.id, reason: 'cancelled' }
}
