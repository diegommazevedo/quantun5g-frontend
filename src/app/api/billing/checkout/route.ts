/**
 * QUANTUM5G — POST /api/billing/checkout (P021)
 *
 * Body: {
 *   productId: 'pentagrama' | 'nr01',
 *   planId:    string,
 *   customerData: { name, cpfCnpj, email, phone? }
 * }
 *
 * Fluxo:
 *  1. Auth obrigatório (server cookies).
 *  2. Valida productId + planId no banco.
 *  3. find-or-create Customer no Asaas (indexa por cpfCnpj).
 *  4. Cria Payment Asaas com externalReference = subscriptionId.
 *  5. Persiste subscriptions (status='pending').
 *  6. Retorna { paymentUrl, subscriptionId }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  createServiceRoleClient,
  createServiceRoleAdmin,
} from '@/lib/supabase/service-role'
import { findOrCreateCustomer, createPayment } from '@/lib/billing/asaas-client'
import type { ProductPlan, SubscriptionInsert } from '@/types/database'

interface CheckoutBody {
  productId?: string
  planId?: string
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
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return bad('Não autenticado', 401)

  // 2. Body
  let body: CheckoutBody
  try {
    body = (await req.json()) as CheckoutBody
  } catch {
    return bad('JSON inválido')
  }

  const { productId, planId, customerData } = body
  if (!productId || !planId) return bad('productId e planId são obrigatórios')
  if (!customerData?.name?.trim()) return bad('customerData.name é obrigatório')
  if (!customerData?.cpfCnpj?.trim()) return bad('customerData.cpfCnpj é obrigatório')
  if (!customerData?.email?.trim()) return bad('customerData.email é obrigatório')

  // 3. Validar product/plan
  const admin = createServiceRoleClient()
  const { data: planRow, error: planErr } = await admin
    .from('product_plans')
    .select('*')
    .eq('id', planId)
    .eq('product_id', productId)
    .eq('active', true)
    .maybeSingle()

  if (planErr) return bad(`Erro consultando plano: ${planErr.message}`, 500)
  if (!planRow) return bad('Plano não encontrado ou inativo', 404)
  const plan = planRow as ProductPlan

  // 4. Asaas customer
  const customer = await findOrCreateCustomer({
    name: customerData.name.trim(),
    cpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
    email: customerData.email.trim(),
    phone: customerData.phone?.trim(),
  }).catch((err: Error) => {
    return { __error: err.message } as { __error: string }
  })

  if ('__error' in customer) {
    return bad(`Falha no Asaas (customer): ${customer.__error}`, 502)
  }

  // 5. Insere subscription pending PRIMEIRO para usar o id como externalReference
  const subscriptionId = randomUUID()
  const adminUntyped = createServiceRoleAdmin()

  const insertPayload: SubscriptionInsert = {
    id: subscriptionId,
    user_id: user.id,
    product_id: productId,
    plan_id: planId,
    company_id: null,
    status: 'pending',
    starts_at: null,
    expires_at: null,
    assessments_remaining: 0,
    asaas_customer_id: customer.id,
    asaas_payment_id: null,
    asaas_subscription_id: null,
  }

  const { error: subErr } = await adminUntyped
    .from('subscriptions')
    .insert(insertPayload)

  if (subErr) return bad(`Falha ao criar subscription: ${subErr.message}`, 500)

  // 6. Cria pagamento no Asaas
  const dueDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 3) // 3 dias para pagamento
    return d.toISOString().slice(0, 10)
  })()

  let payment
  try {
    payment = await createPayment({
      customer: customer.id,
      billingType: 'UNDEFINED', // permite cliente escolher (pix/boleto/cartão)
      value: plan.price_cents / 100,
      dueDate,
      description: `${plan.name} — ${productId}`,
      externalReference: subscriptionId,
    })
  } catch (err) {
    // rollback: marca subscription como failed
    await adminUntyped.from('subscriptions').update({ status: 'failed' }).eq('id', subscriptionId)
    return bad(`Falha no Asaas (payment): ${err instanceof Error ? err.message : String(err)}`, 502)
  }

  await adminUntyped
    .from('subscriptions')
    .update({ asaas_payment_id: payment.id })
    .eq('id', subscriptionId)

  const paymentUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? null
  if (!paymentUrl) {
    return bad('Asaas não retornou URL de pagamento', 502)
  }

  return NextResponse.json({
    subscriptionId,
    paymentUrl,
    asaasPaymentId: payment.id,
  })
}
