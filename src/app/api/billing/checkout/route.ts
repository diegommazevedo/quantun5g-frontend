/**
 * QUANTUM5G — POST /api/billing/checkout (P021 + catálogo LP t01–t16)
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { findOrCreateCustomer, createPayment } from '@/lib/billing/asaas-client'
import { resolveActivePlan } from '@/lib/billing/resolve-plan'
import {
  PENTAGRAMA_GINGER_ADDON,
  buildSubscriptionMetadata,
  computeCheckoutPricing,
  isPentagramaAddon,
  parseTierPlanId,
  planDbId,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'
import type { SubscriptionInsert } from '@/types/database'

interface CheckoutBody {
  productId?: string
  planId?: string
  tierId?: string
  billingMode?: Nr01BillingMode
  includePentagrama?: boolean
  headcountDeclared?: number
  addon?: string
  customerData?: {
    name?: string
    cpfCnpj?: string
    email?: string
    phone?: string
  }
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return bad('Não autenticado', 401)

  let body: CheckoutBody
  try {
    body = (await req.json()) as CheckoutBody
  } catch {
    return bad('JSON inválido')
  }

  const { productId, planId, customerData } = body
  if (!productId) return bad('productId é obrigatório')
  if (!customerData?.name?.trim()) return bad('customerData.name é obrigatório')
  if (!customerData?.cpfCnpj?.trim()) return bad('customerData.cpfCnpj é obrigatório')
  if (!customerData?.email?.trim()) return bad('customerData.email é obrigatório')

  const billingMode: Nr01BillingMode =
    body.billingMode === 'anual_vista' ? 'anual_vista' : 'anual_parcelado'
  const includePentagrama =
    body.includePentagrama === true || isPentagramaAddon(body.addon)
  const headcountDeclared =
    typeof body.headcountDeclared === 'number' && body.headcountDeclared > 0
      ? Math.round(body.headcountDeclared)
      : null

  let resolvedPlanId = planId ?? ''
  let pricingTotalCents = 0
  let planName = ''
  let metadata: Record<string, unknown> = {}

  if (productId === 'nr01') {
    const tierId = (body.tierId ?? parseTierPlanId(planId ?? '')) as Nr01TierId | null
    if (!tierId) return bad('tierId ou planId NR-01 inválido (ex.: t03 ou nr01_t03)', 400)

    let pricing
    try {
      pricing = computeCheckoutPricing({ tierId, billingMode, includePentagrama })
    } catch (e) {
      return bad(e instanceof Error ? e.message : 'Faixa indisponível para checkout online', 400)
    }

    resolvedPlanId = planDbId(tierId)
    pricingTotalCents = pricing.totalCents
    planName = `NR-01 ${tierId.toUpperCase()}`
    metadata = buildSubscriptionMetadata(pricing, headcountDeclared) as unknown as Record<string, unknown>
  } else {
    if (!planId) return bad('planId é obrigatório')
    const plan = await resolveActivePlan(productId, planId)
    if (!plan) return bad('Plano não encontrado ou inativo', 404)
    resolvedPlanId = planId
    pricingTotalCents = plan.price_cents
    planName = plan.name
  }

  if (pricingTotalCents <= 0) {
    return bad('Este plano requer proposta comercial. Contacte contato@quantun5g.com', 400)
  }

  const plan = await resolveActivePlan(productId, resolvedPlanId)
  if (!plan && productId !== 'nr01') return bad('Plano não encontrado ou inativo', 404)

  const customer = await findOrCreateCustomer({
    name: customerData.name.trim(),
    cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
    email: customerData.email.trim(),
    phone: customerData.phone?.trim(),
  }).catch((err: Error) => ({ __error: err.message } as { __error: string }))

  if ('__error' in customer) {
    return bad(`Falha no Asaas (customer): ${customer.__error}`, 502)
  }

  const subscriptionId = randomUUID()
  const adminUntyped = createServiceRoleAdmin()

  const insertPayload: SubscriptionInsert = {
    id: subscriptionId,
    user_id: user.id,
    product_id: productId,
    plan_id: resolvedPlanId,
    company_id: null,
    status: 'pending',
    starts_at: null,
    expires_at: null,
    assessments_remaining: 0,
    asaas_customer_id: customer.id,
    asaas_payment_id: null,
    asaas_subscription_id: null,
    metadata,
  }

  const { error: subErr } = await adminUntyped.from('subscriptions').insert(insertPayload)
  if (subErr) return bad(`Falha ao criar subscription: ${subErr.message}`, 500)

  const dueDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().slice(0, 10)
  })()

  const description = includePentagrama
    ? `${planName} + ${PENTAGRAMA_GINGER_ADDON.shortLabel} — ${productId}`
    : `${planName} — ${productId}`

  let payment
  try {
    payment = await createPayment({
      customer: customer.id,
      billingType: 'UNDEFINED',
      value: pricingTotalCents / 100,
      dueDate,
      description,
      externalReference: subscriptionId,
    })
  } catch (err) {
    await adminUntyped.from('subscriptions').update({ status: 'failed' }).eq('id', subscriptionId)
    return bad(`Falha no Asaas (payment): ${err instanceof Error ? err.message : String(err)}`, 502)
  }

  await adminUntyped
    .from('subscriptions')
    .update({ asaas_payment_id: payment.id })
    .eq('id', subscriptionId)

  const paymentUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? null
  if (!paymentUrl) return bad('Asaas não retornou URL de pagamento', 502)

  return NextResponse.json({
    subscriptionId,
    paymentUrl,
    asaasPaymentId: payment.id,
    skuId: metadata.sku_id ?? null,
  })
}
