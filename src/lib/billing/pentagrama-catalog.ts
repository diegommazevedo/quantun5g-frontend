/**
 * Catálogo comercial Pentagrama de Ginger — faturas presenciais e checkout.
 */

export type PentagramaPlanId =
  | 'pent_essencial'
  | 'pent_operacional'
  | 'pent_estruturado'
  | 'pent_corporativo'

export type PentagramaModality = 'one_off' | 'annual'

export interface PentagramaPlan {
  id: PentagramaPlanId
  name: string
  workerMin: number
  workerMax: number | null
  priceCents: number
  modality: PentagramaModality
  diagnosticsPerPeriod: number
  summary: string
}

/** Preços alinhados à migration P021 (product_plans). */
export const PENTAGRAMA_PLANS: PentagramaPlan[] = [
  {
    id: 'pent_essencial',
    name: 'Essencial',
    workerMin: 1,
    workerMax: 19,
    priceCents: 240_000,
    modality: 'one_off',
    diagnosticsPerPeriod: 1,
    summary: '1 diagnóstico IL+IC · até 19 colaboradores',
  },
  {
    id: 'pent_operacional',
    name: 'Operacional',
    workerMin: 20,
    workerMax: 99,
    priceCents: 480_000,
    modality: 'one_off',
    diagnosticsPerPeriod: 1,
    summary: '1 diagnóstico IL+IC · 20–99 colaboradores',
  },
  {
    id: 'pent_estruturado',
    name: 'Estruturado',
    workerMin: 100,
    workerMax: 499,
    priceCents: 1_680_000,
    modality: 'annual',
    diagnosticsPerPeriod: 2,
    summary: 'Assinatura anual · 2 diagnósticos · 100–499 colaboradores',
  },
  {
    id: 'pent_corporativo',
    name: 'Corporativo',
    workerMin: 500,
    workerMax: null,
    priceCents: 4_800_000,
    modality: 'annual',
    diagnosticsPerPeriod: 4,
    summary: 'Assinatura anual · 4 diagnósticos · 500+ colaboradores',
  },
]

export function getPentagramaPlan(id: string): PentagramaPlan | undefined {
  return PENTAGRAMA_PLANS.find((p) => p.id === id)
}

export function parsePentagramaPlanId(id: string): PentagramaPlanId | null {
  return getPentagramaPlan(id)?.id ?? null
}

export function resolvePentagramaPlanFromHeadcount(headcount: number): PentagramaPlanId {
  const n = Math.max(1, Math.round(headcount))
  if (n <= 19) return 'pent_essencial'
  if (n <= 99) return 'pent_operacional'
  if (n <= 499) return 'pent_estruturado'
  return 'pent_corporativo'
}

export function buildPentagramaInvoiceMetadata(
  plan: PentagramaPlan,
  headcountDeclared: number | null,
): Record<string, unknown> {
  return {
    product: 'quantum5g_pentagrama',
    plan_id: plan.id,
    plan_name: plan.name,
    modality: plan.modality,
    price_cents: plan.priceCents,
    diagnostics_per_period: plan.diagnosticsPerPeriod,
    worker_min: plan.workerMin,
    worker_max: plan.workerMax,
    headcount_declared: headcountDeclared,
    entitlements: ['pentagrama_core', 'email_broadcast', 'reports'],
  }
}
