/**
 * QUANTUM5G — POST /api/billing/checkout (P021 + catálogo LP t01–t16)
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { findOrCreateCustomer, createPayment, isAsaasConfigured } from '@/lib/billing/asaas-client'
import { getBillingProvider, isKiwifyBillingEnabled } from '@/lib/billing/billing-provider'
import { buildKiwifyCheckoutRedirectUrl } from '@/lib/billing/kiwify-checkout'
import { isKiwifyProductMapReady } from '@/lib/billing/kiwify-product-map'
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
import { validateCnpj } from '@/lib/companies/cnpj'
import { normalizeCnpj } from '@/lib/companies/normalize'
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

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
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

  const cpfCnpjDigits = normalizeCnpj(customerData.cpfCnpj)
  if (productId === 'nr01') {
    const cnpjErr = validateCnpj(cpfCnpjDigits)
    if (cnpjErr) return bad(cnpjErr)
  }
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
    metadata = {
      ...(buildSubscriptionMetadata(pricing, headcountDeclared) as unknown as Record<string, unknown>),
      customer_cnpj: cpfCnpjDigits,
      customer_contact_name: customerData.name.trim(),
    }
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

  const subscriptionId = randomUUID()
  const adminUntyped = createServiceRoleAdmin()

  const gateway = getBillingProvider()
  const useKiwify =
    gateway === 'kiwify' && productId === 'nr01' && isKiwifyProductMapReady()

  const tierIdForKiwify =
    productId === 'nr01'
      ? ((body.tierId ?? parseTierPlanId(planId ?? '')) as Nr01TierId | null)
      : null

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
    asaas_customer_id: null,
    asaas_payment_id: null,
    asaas_subscription_id: null,
    metadata: {
      ...metadata,
      gateway: useKiwify ? 'kiwify' : 'asaas',
    },
  }

  const { error: subErr } = await adminUntyped.from('subscriptions').insert(insertPayload)
  if (subErr) return bad(`Falha ao criar subscription: ${subErr.message}`, 500)

  if (useKiwify && tierIdForKiwify) {
    try {
      const paymentUrl = buildKiwifyCheckoutRedirectUrl({
        subscriptionId,
        tierId: tierIdForKiwify,
        billingMode,
        includePentagrama,
        customerEmail: customerData.email.trim(),
      })
      return NextResponse.json({
        subscriptionId,
        paymentUrl,
        gateway: 'kiwify',
        skuId: metadata.sku_id ?? null,
      })
    } catch (err) {
      await adminUntyped.from('subscriptions').update({ status: 'failed' }).eq('id', subscriptionId)
      return bad(err instanceof Error ? err.message : 'Checkout Kiwify indisponível', 502)
    }
  }

  if (isKiwifyBillingEnabled() && productId === 'nr01' && !isKiwifyProductMapReady()) {
    await adminUntyped.from('subscriptions').delete().eq('id', subscriptionId)
    return bad(
      'BILLING_PROVIDER=kiwify mas config/kiwify-nr01-product-map.json está vazio. Use Asaas ou preencha o mapa.',
      503,
    )
  }

  if (!isAsaasConfigured()) {
    await adminUntyped.from('subscriptions').delete().eq('id', subscriptionId)
    return bad(
      'Pagamento online indisponível: ASAAS_API_KEY não está configurado na Vercel. Use emissão de fatura presencial.',
      503,
      { code: 'asaas_not_configured', fallbackUrl: '/contratacao' },
    )
  }

  const customer = await findOrCreateCustomer({
    name: customerData.name.trim(),
    cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
    email: customerData.email.trim(),
    phone: customerData.phone?.trim(),
  }).catch((err: Error) => ({ __error: err.message } as { __error: string }))

  if ('__error' in customer) {
    await adminUntyped.from('subscriptions').update({ status: 'failed' }).eq('id', subscriptionId)
    return bad(`Falha no Asaas (customer): ${customer.__error}`, 502)
  }

  await adminUntyped
    .from('subscriptions')
    .update({ asaas_customer_id: customer.id })
    .eq('id', subscriptionId)

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
    gateway: 'asaas',
    skuId: metadata.sku_id ?? null,
  })
}
