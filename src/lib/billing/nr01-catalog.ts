/**
 * Catálogo comercial NR-01 — fonte única (COERENCIA-LP-SAAS.md §3).
 * Faixas t01–t16, preços, SKUs, entitlements e fórmulas de billing.
 */

import type { ProductPlan } from '@/types/database'
import { COMPANY_CNPJ_SLOTS_DEFAULT } from '@/lib/licensing/company-cnpj-slots'

export type Nr01TierId =
  | 't01' | 't02' | 't03' | 't04' | 't05' | 't06' | 't07' | 't08'
  | 't09' | 't10' | 't11' | 't12' | 't13' | 't14' | 't15' | 't16'

export type Nr01BillingMode = 'anual_parcelado' | 'anual_vista'

export type Nr01Entitlement =
  | 'core_nr01'
  | 'email_broadcast'
  | 'pdca'
  | 'evidence_pack'
  | 'support_email'
  | 'pentagrama_ginger'

export const PENTAGRAMA_GINGER_ADDON_ID = 'pentagrama_ginger' as const

/** @deprecated Use pentagrama_ginger */
export const JOVANE_RT_UPSELL_ID = 'jovane_rt' as const

export const PENTAGRAMA_GINGER_ADDON = {
  id: PENTAGRAMA_GINGER_ADDON_ID,
  label: 'Complemento Pentagrama de Ginger',
  shortLabel: 'Pentagrama de Ginger',
  description:
    'Diagnóstico organizacional via IL + IC (Pentagrama de Ginger) como precursor opcional à pesquisa NR-01. Metodologia validada; a assinatura do laudo NR-01 continua sendo do RT cadastrado pela sua empresa.',
  priceMultiplier: 0.5,
} as const

export const NR01_RT_NOTICE =
  'A licença da plataforma não inclui profissional para assinatura do laudo perante o MTE. Cada empresa cadastra o seu RT habilitado (CRP/CRM). O complemento Pentagrama é diagnóstico organizacional opcional — não substitui o RT da empresa.'

export const NR01_PACKAGE_DELIVERABLES = [
  'Lista de transmissão e convites por e-mail na plataforma',
  'Pesquisa psicossocial online (~15 min/colaborador, 80 questões)',
  'Pseudonimização LGPD, agregação k≥5 — empresa não vê resposta individual',
  'Laudo técnico NR-01 ao encerrar a coleta',
  'Plano de ação PDCA gerido na plataforma',
  'Pacote de evidências com hash SHA-256',
  'Cadastro do RT da empresa para assinatura do laudo',
  'Suporte técnico por e-mail',
] as const

export interface Nr01Tier {
  id: Nr01TierId
  workerMin: number
  workerMax: number | null
  /** Total anual 12× (centavos), múltiplo de 12 */
  annualParceladoCents: number
  label: string
  checkoutEnabled: boolean
}

/** Preços vigentes LP (BRL × 100) — §3.1 */
export const NR01_TIERS: Nr01Tier[] = [
  { id: 't01', workerMin: 0, workerMax: 5, annualParceladoCents: 246_000, label: '0–5 trabalhadores', checkoutEnabled: true },
  { id: 't02', workerMin: 6, workerMax: 10, annualParceladoCents: 362_400, label: '6–10 trabalhadores', checkoutEnabled: true },
  { id: 't03', workerMin: 11, workerMax: 15, annualParceladoCents: 421_200, label: '11–15 trabalhadores', checkoutEnabled: true },
  { id: 't04', workerMin: 16, workerMax: 20, annualParceladoCents: 480_000, label: '16–20 trabalhadores', checkoutEnabled: true },
  { id: 't05', workerMin: 21, workerMax: 30, annualParceladoCents: 573_600, label: '21–30 trabalhadores', checkoutEnabled: true },
  { id: 't06', workerMin: 31, workerMax: 40, annualParceladoCents: 655_200, label: '31–40 trabalhadores', checkoutEnabled: true },
  { id: 't07', workerMin: 41, workerMax: 50, annualParceladoCents: 736_800, label: '41–50 trabalhadores', checkoutEnabled: true },
  { id: 't08', workerMin: 51, workerMax: 60, annualParceladoCents: 807_600, label: '51–60 trabalhadores', checkoutEnabled: true },
  { id: 't09', workerMin: 61, workerMax: 80, annualParceladoCents: 960_000, label: '61–80 trabalhadores', checkoutEnabled: true },
  { id: 't10', workerMin: 81, workerMax: 100, annualParceladoCents: 1_100_400, label: '81–100 trabalhadores', checkoutEnabled: true },
  { id: 't11', workerMin: 101, workerMax: 200, annualParceladoCents: 1_755_600, label: '101–200 trabalhadores', checkoutEnabled: true },
  { id: 't12', workerMin: 201, workerMax: 300, annualParceladoCents: 2_281_200, label: '201–300 trabalhadores', checkoutEnabled: true },
  { id: 't13', workerMin: 301, workerMax: 500, annualParceladoCents: 3_042_000, label: '301–500 trabalhadores', checkoutEnabled: true },
  { id: 't14', workerMin: 501, workerMax: 750, annualParceladoCents: 3_978_000, label: '501–750 trabalhadores', checkoutEnabled: true },
  { id: 't15', workerMin: 751, workerMax: 1000, annualParceladoCents: 4_914_000, label: '751–1.000 trabalhadores', checkoutEnabled: true },
  { id: 't16', workerMin: 1001, workerMax: null, annualParceladoCents: 0, label: 'Acima de 1.000 · sob consulta', checkoutEnabled: false },
]

export interface Nr01CheckoutPricing {
  tierId: Nr01TierId
  billingMode: Nr01BillingMode
  includePentagrama: boolean
  baseCents: number
  gingerCents: number
  totalCents: number
  installmentCents: number
  skuId: string
  entitlements: Nr01Entitlement[]
}

export interface Nr01SubscriptionMetadata {
  product: 'quantum5g_nr01'
  sku_id: string
  tier_id: Nr01TierId
  billing_mode: Nr01BillingMode
  includes_pentagrama: boolean
  headcount_declared: number | null
  worker_min: number
  worker_max: number | null
  entitlements: Nr01Entitlement[]
  base_paid_cents: number
  ginger_cents: number
  total_cents: number
  installments: number
  company_cnpj_slots: number
}

const LEGACY_PLAN_TO_TIER: Record<string, Nr01TierId> = {
  nr01_essencial: 't05',
  nr01_operacional: 't09',
  nr01_estruturado: 't12',
  nr01_corporativo: 't16',
}

export function getTier(tierId: Nr01TierId): Nr01Tier {
  const t = NR01_TIERS.find((x) => x.id === tierId)
  if (!t) throw new Error(`Faixa inválida: ${tierId}`)
  return t
}

export function resolveTierFromHeadcount(headcount: number): Nr01TierId {
  const n = Math.min(5000, Math.max(0, Math.round(headcount)))
  if (n > 1000) return 't16'
  for (let i = NR01_TIERS.length - 2; i >= 0; i--) {
    const t = NR01_TIERS[i]
    if (n >= t.workerMin && (t.workerMax == null || n <= t.workerMax)) return t.id
  }
  return 't01'
}

export function annualVistaCents(annualParceladoCents: number): number {
  return Math.round((annualParceladoCents * 0.9) / 12) * 12
}

export function installmentCents(annualTotalCents: number): number {
  return Math.round(annualTotalCents / 12)
}

export function planDbId(tierId: Nr01TierId): string {
  return `nr01_${tierId}`
}

export function parseTierPlanId(planId: string): Nr01TierId | null {
  if (planId.startsWith('nr01_t') && planId.length === 8) {
    return planId.slice(5) as Nr01TierId
  }
  if (planId.startsWith('t') && planId.length === 3) return planId as Nr01TierId
  return LEGACY_PLAN_TO_TIER[planId] ?? null
}

export function buildSku(
  tierId: Nr01TierId,
  billingMode: Nr01BillingMode,
  includePentagrama: boolean,
): string {
  const ginger = includePentagrama ? 'com_ginger' : 'base'
  return `q5g-nr01-${tierId}-${billingMode}-${ginger}`
}

export function baseEntitlements(): Nr01Entitlement[] {
  return ['core_nr01', 'email_broadcast', 'pdca', 'evidence_pack', 'support_email']
}

export function entitlementsForPurchase(includePentagrama: boolean): Nr01Entitlement[] {
  const list = baseEntitlements()
  if (includePentagrama) list.push('pentagrama_ginger')
  return list
}

export function computeCheckoutPricing(params: {
  tierId: Nr01TierId
  billingMode: Nr01BillingMode
  includePentagrama: boolean
}): Nr01CheckoutPricing {
  const tier = getTier(params.tierId)
  if (!tier.checkoutEnabled || tier.annualParceladoCents <= 0) {
    throw new Error('Faixa requer proposta comercial (t16 ou indisponível).')
  }

  const baseCents =
    params.billingMode === 'anual_vista'
      ? annualVistaCents(tier.annualParceladoCents)
      : tier.annualParceladoCents

  const gingerCents = params.includePentagrama
    ? Math.round(baseCents * PENTAGRAMA_GINGER_ADDON.priceMultiplier)
    : 0

  const totalCents = baseCents + gingerCents

  return {
    tierId: params.tierId,
    billingMode: params.billingMode,
    includePentagrama: params.includePentagrama,
    baseCents,
    gingerCents,
    totalCents,
    installmentCents: installmentCents(totalCents),
    skuId: buildSku(params.tierId, params.billingMode, params.includePentagrama),
    entitlements: entitlementsForPurchase(params.includePentagrama),
  }
}

export function buildSubscriptionMetadata(
  pricing: Nr01CheckoutPricing,
  headcountDeclared: number | null,
  opts?: { companyCnpjSlots?: number },
): Nr01SubscriptionMetadata {
  const tier = getTier(pricing.tierId)
  return {
    product: 'quantum5g_nr01',
    sku_id: pricing.skuId,
    tier_id: pricing.tierId,
    billing_mode: pricing.billingMode,
    includes_pentagrama: pricing.includePentagrama,
    headcount_declared: headcountDeclared,
    worker_min: tier.workerMin,
    worker_max: tier.workerMax,
    entitlements: pricing.entitlements,
    base_paid_cents: pricing.baseCents,
    ginger_cents: pricing.gingerCents,
    total_cents: pricing.totalCents,
    installments: 12,
    company_cnpj_slots: opts?.companyCnpjSlots ?? COMPANY_CNPJ_SLOTS_DEFAULT,
  }
}

export function tierToProductPlan(tier: Nr01Tier): ProductPlan {
  const now = new Date(0).toISOString()
  return {
    id: planDbId(tier.id),
    product_id: 'nr01',
    name: `NR-01 · ${tier.label}`,
    collaborators_min: tier.workerMin,
    collaborators_max: tier.workerMax,
    price_cents: tier.annualParceladoCents,
    modality: 'annual',
    assessments_per_period: 99,
    active: tier.checkoutEnabled,
    created_at: now,
  }
}

export function nr01CatalogAsProductPlans(): ProductPlan[] {
  return NR01_TIERS.filter((t) => t.checkoutEnabled).map(tierToProductPlan)
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function formatBillingLabel(mode: Nr01BillingMode): string {
  return mode === 'anual_vista' ? 'À vista (−10%)' : '12× no cartão'
}

export function isPentagramaAddon(addon: string | undefined | null): boolean {
  return addon === PENTAGRAMA_GINGER_ADDON_ID || addon === JOVANE_RT_UPSELL_ID
}

export function tierGroupLabel(tierId: Nr01TierId): string {
  const n = parseInt(tierId.slice(1), 10)
  if (n <= 10) return 'Até 100 trabalhadores'
  if (n <= 15) return '101 a 1.000 trabalhadores'
  return 'Acima de 1.000'
}
