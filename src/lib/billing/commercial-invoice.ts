/**
 * Faturas comerciais — checkout alternativo (pagamento presencial).
 */

import { randomUUID } from 'crypto'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { provisionNr01Subscription } from '@/lib/billing/provision-nr01'
import { provisionPentagramaSubscription } from '@/lib/billing/provision-pentagrama'
import {
  buildSubscriptionMetadata,
  computeCheckoutPricing,
  planDbId,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'
import {
  buildPentagramaInvoiceMetadata,
  getPentagramaPlan,
  type PentagramaPlanId,
} from '@/lib/billing/pentagrama-catalog'
import {
  COMPANY_CNPJ_SLOTS_META_KEY,
  formatCompanyCnpjSlotsShort,
  parseCompanyCnpjSlots,
  slotsFromMetadata,
} from '@/lib/licensing/company-cnpj-slots'
import type {
  CommercialInvoice,
  CommercialInvoiceStatus,
  Subscription,
  SubscriptionInsert,
  UserRole,
} from '@/types/database'

export type { CommercialInvoiceStatus }

export type CommercialInvoiceProductId = 'nr01' | 'pentagrama'

export interface InvoiceModuleSelection {
  nr01: boolean
  pentagrama: boolean
}

export interface CreateCommercialInvoiceInput {
  userId: string
  companyId?: string | null
  consultantId: string
  createdBy: string
  modules: InvoiceModuleSelection
  /** NR-01 */
  tierId?: Nr01TierId
  billingMode?: Nr01BillingMode
  /** Upsell NR-01 (+50%) — só quando só NR-01 está marcado */
  includePentagrama?: boolean
  /** Pentagrama (standalone ou combo) */
  pentagramaPlanId?: PentagramaPlanId
  headcountDeclared?: number | null
  notes?: string | null
  clientCnpj?: string | null
  clientWhatsapp?: string | null
  clientCompanyName?: string | null
  clientEmail?: string | null
  /** Quantidade de CNPJs/empresas que o cliente poderá cadastrar (plano base = 1). */
  companyCnpjSlots?: number
}

const STATUS_FLOW: Record<CommercialInvoiceStatus, CommercialInvoiceStatus[]> = {
  emitida: ['aprovada', 'cancelada'],
  aprovada: ['paga', 'cancelada'],
  paga: [],
  cancelada: [],
}

export function canTransitionStatus(
  from: CommercialInvoiceStatus,
  to: CommercialInvoiceStatus,
): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false
}

export async function allocateInvoiceNumber(): Promise<string> {
  const admin = createServiceRoleAdmin()
  const { data, error } = await admin.rpc('next_commercial_invoice_number')
  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao gerar número da fatura')
  }
  return String(data)
}

export async function createCommercialInvoice(
  input: CreateCommercialInvoiceInput,
): Promise<CommercialInvoice> {
  const { modules } = input
  if (!modules.nr01 && !modules.pentagrama) {
    throw new Error('Selecione ao menos um módulo (NR-01 e/ou Pentagrama).')
  }

  const invoiceNumber = await allocateInvoiceNumber()
  const admin = createServiceRoleAdmin()

  const clientMeta: Record<string, unknown> = {
    [COMPANY_CNPJ_SLOTS_META_KEY]: parseCompanyCnpjSlots(input.companyCnpjSlots),
  }
  if (input.clientCnpj) clientMeta.client_cnpj = input.clientCnpj.replace(/\D/g, '')
  if (input.clientWhatsapp) clientMeta.client_whatsapp = input.clientWhatsapp.replace(/\D/g, '')
  if (input.clientCompanyName) clientMeta.client_company_name = input.clientCompanyName
  if (input.clientEmail) clientMeta.client_email = input.clientEmail.trim().toLowerCase()

  let row: Record<string, unknown>

  const isCombo = modules.nr01 && modules.pentagrama
  const isPentOnly = modules.pentagrama && !modules.nr01

  if (isPentOnly) {
    const planId = input.pentagramaPlanId
    if (!planId) throw new Error('pentagramaPlanId é obrigatório')
    const plan = getPentagramaPlan(planId)
    if (!plan) throw new Error('Plano Pentagrama inválido')

    row = {
      invoice_number: invoiceNumber,
      status: 'emitida',
      user_id: input.userId,
      company_id: input.companyId ?? null,
      consultant_id: input.consultantId,
      created_by: input.createdBy,
      product_id: 'pentagrama',
      plan_id: plan.id,
      amount_cents: plan.priceCents,
      billing_mode: plan.modality === 'annual' ? 'anual_parcelado' : 'anual_vista',
      include_pentagrama: false,
      headcount_declared: input.headcountDeclared ?? null,
      metadata: {
        ...buildPentagramaInvoiceMetadata(plan, input.headcountDeclared ?? null),
        ...clientMeta,
      },
      notes: input.notes?.trim() || null,
    }
  } else {
    const tierId = input.tierId
    if (!tierId) throw new Error('tierId é obrigatório para NR-01')
    const billingMode = input.billingMode ?? 'anual_parcelado'
    const includePentagrama = !isCombo && input.includePentagrama === true
    const pricing = computeCheckoutPricing({
      tierId,
      billingMode,
      includePentagrama,
    })

    let amountCents = pricing.totalCents
    let metadata: Record<string, unknown> = {
      ...buildSubscriptionMetadata(pricing, input.headcountDeclared ?? null),
      ...clientMeta,
      modules: isCombo ? ['nr01', 'pentagrama'] : ['nr01'],
    }

    if (isCombo) {
      const pentId = input.pentagramaPlanId
      if (!pentId) throw new Error('pentagramaPlanId é obrigatório no combo')
      const pentPlan = getPentagramaPlan(pentId)
      if (!pentPlan) throw new Error('Plano Pentagrama inválido')
      const nr01Only = computeCheckoutPricing({
        tierId,
        billingMode,
        includePentagrama: false,
      })
      amountCents = nr01Only.baseCents + pentPlan.priceCents
      metadata = {
        ...metadata,
        invoice_kind: 'combo',
        tier_id: tierId,
        nr01: buildSubscriptionMetadata(nr01Only, input.headcountDeclared ?? null),
        pentagrama: buildPentagramaInvoiceMetadata(pentPlan, input.headcountDeclared ?? null),
        pentagrama_plan_id: pentId,
      }
    }

    row = {
      invoice_number: invoiceNumber,
      status: 'emitida',
      user_id: input.userId,
      company_id: input.companyId ?? null,
      consultant_id: input.consultantId,
      created_by: input.createdBy,
      product_id: 'nr01',
      plan_id: isCombo ? `combo_${planDbId(tierId)}_${input.pentagramaPlanId}` : planDbId(tierId),
      amount_cents: amountCents,
      billing_mode: billingMode,
      include_pentagrama: includePentagrama,
      headcount_declared: input.headcountDeclared ?? null,
      metadata,
      notes: input.notes?.trim() || null,
    }
  }

  const { data, error } = await admin
    .from('commercial_invoices')
    .insert(row as never)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao criar fatura')
  }

  return data as CommercialInvoice
}

export async function getCommercialInvoice(id: string): Promise<CommercialInvoice | null> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin.from('commercial_invoices').select('*').eq('id', id).maybeSingle()
  return data ? (data as CommercialInvoice) : null
}

async function insertAndProvisionSub(params: {
  invoice: CommercialInvoice
  paidAt: Date
  productId: 'nr01' | 'pentagrama'
  planId: string
  meta: Record<string, unknown>
}): Promise<string> {
  const admin = createServiceRoleAdmin()
  const subscriptionId = randomUUID()
  const insert: SubscriptionInsert = {
    id: subscriptionId,
    user_id: params.invoice.user_id,
    product_id: params.productId,
    plan_id: params.planId,
    company_id: params.invoice.company_id,
    status: 'pending',
    assessments_remaining: 0,
    metadata: {
      ...params.meta,
      gateway: 'commercial_invoice',
      commercial_invoice_id: params.invoice.id,
      commercial_invoice_number: params.invoice.invoice_number,
    },
  }

  const { error: subErr } = await admin.from('subscriptions').insert(insert as never)
  if (subErr) throw new Error(subErr.message)

  const { data: subRow } = await admin
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()

  if (!subRow) throw new Error('Subscription não criada')

  if (params.productId === 'pentagrama') {
    await provisionPentagramaSubscription({ subscription: subRow as Subscription, paidAt: params.paidAt })
  } else {
    await provisionNr01Subscription({ subscription: subRow as Subscription, paidAt: params.paidAt })
  }

  return subscriptionId
}

async function provisionFromPaidInvoice(
  invoice: CommercialInvoice,
  paidAt: Date,
): Promise<string> {
  const admin = createServiceRoleAdmin()
  const meta = invoice.metadata as Record<string, unknown>
  const productId = invoice.product_id as 'nr01' | 'pentagrama'

  let primarySubId: string

  if (meta.invoice_kind === 'combo' && typeof meta.pentagrama_plan_id === 'string') {
    const tierId = (meta.tier_id as string) ?? 't01'
    const nr01Meta = (meta.nr01 as Record<string, unknown>) ?? meta
    primarySubId = await insertAndProvisionSub({
      invoice,
      paidAt,
      productId: 'nr01',
      planId: planDbId(tierId as Nr01TierId),
      meta: nr01Meta,
    })
    const pentMeta = (meta.pentagrama as Record<string, unknown>) ?? {}
    await insertAndProvisionSub({
      invoice,
      paidAt,
      productId: 'pentagrama',
      planId: meta.pentagrama_plan_id as string,
      meta: pentMeta,
    })
  } else if (productId === 'pentagrama') {
    primarySubId = await insertAndProvisionSub({
      invoice,
      paidAt,
      productId: 'pentagrama',
      planId: invoice.plan_id,
      meta,
    })
  } else {
    primarySubId = await insertAndProvisionSub({
      invoice,
      paidAt,
      productId: 'nr01',
      planId: invoice.plan_id,
      meta,
    })
  }

  if (invoice.company_id) {
    await admin
      .from('companies')
      .update({ account_user_id: invoice.user_id } as never)
      .eq('id', invoice.company_id)
  }

  return primarySubId
}

export function formatInvoiceProductPt(
  productId: string,
  includePentagrama: boolean,
  metadata?: Record<string, unknown>,
): string {
  const slots = metadata ? slotsFromMetadata(metadata) : null
  const slotsSuffix =
    slots && slots > 1 ? ` · ${formatCompanyCnpjSlotsShort(slots)}` : ''

  if (metadata?.invoice_kind === 'combo') return `NR-01 + Pentagrama (combo)${slotsSuffix}`
  if (productId === 'pentagrama') return `Pentagrama de Ginger${slotsSuffix}`
  if (includePentagrama) return `NR-01 + Pentagrama (upsell)${slotsSuffix}`
  return slotsSuffix ? `NR-01${slotsSuffix}` : 'NR-01'
}

export async function updateCommercialInvoiceStatus(params: {
  invoiceId: string
  nextStatus: CommercialInvoiceStatus
  actorId: string
  actorRole: UserRole
  notes?: string | null
}): Promise<CommercialInvoice> {
  const admin = createServiceRoleAdmin()
  const invoice = await getCommercialInvoice(params.invoiceId)
  if (!invoice) throw new Error('Fatura não encontrada')

  if (!canTransitionStatus(invoice.status, params.nextStatus)) {
    throw new Error(`Transição inválida: ${invoice.status} → ${params.nextStatus}`)
  }

  if (params.nextStatus === 'paga' && params.actorRole !== 'admin') {
    throw new Error('Somente administrador pode marcar fatura como paga')
  }

  if (
    (params.nextStatus === 'aprovada' || params.nextStatus === 'paga') &&
    params.actorRole !== 'admin'
  ) {
    throw new Error('Somente administrador pode aprovar ou pagar faturas')
  }

  const now = new Date()
  const patch: Record<string, unknown> = {
    status: params.nextStatus,
  }

  if (params.notes != null) {
    patch.notes = params.notes
  }

  if (params.nextStatus === 'aprovada') {
    patch.approved_by = params.actorId
    patch.approved_at = now.toISOString()
  }

  if (params.nextStatus === 'paga') {
    patch.paid_by = params.actorId
    patch.paid_at = now.toISOString()
    const subId = await provisionFromPaidInvoice(invoice, now)
    patch.subscription_id = subId
  }

  const { data, error } = await admin
    .from('commercial_invoices')
    .update(patch as never)
    .eq('id', params.invoiceId)
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Falha ao atualizar fatura')
  return data as CommercialInvoice
}

export function formatInvoiceStatusPt(status: CommercialInvoiceStatus): string {
  const map: Record<CommercialInvoiceStatus, string> = {
    emitida: 'Emitida',
    aprovada: 'Aprovada',
    paga: 'Paga',
    cancelada: 'Cancelada',
  }
  return map[status] ?? status
}
