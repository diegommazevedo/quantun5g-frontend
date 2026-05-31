/**
 * Catálogo comercial NR-01 (página de vendas + checkout).
 * Alinhado à tabela product_plans após migration v2.
 */

export type Nr01SalesPlanId =
  | 'nr01_essencial'
  | 'nr01_operacional'
  | 'nr01_estruturado'
  | 'nr01_corporativo'

export const JOVANE_RT_UPSELL_ID = 'jovane_rt' as const

export const JOVANE_RT_UPSELL = {
  id: JOVANE_RT_UPSELL_ID,
  label: 'Jovane Borlini como RT + Pentagrama de Ginger',
  shortLabel: 'ADD-ON: JOVANE COMO RT',
  description:
    'Inclui a atuação de Jovane Borlini da Silva como responsável técnico habilitado para assinatura do laudo, com aplicação integral do Pentagrama de Ginger (IL + IC) em toda a equipe como diagnóstico organizacional precursor à pesquisa e laudo NR-01.',
  priceMultiplier: 0.5,
} as const

export const NR01_RT_NOTICE =
  'A licença da plataforma não inclui profissional para assinatura do laudo perante o MTE. Cada empresa cadastra o seu RT habilitado no sistema. O add-on acima é contratação opcional de RT + metodologia Pentagrama precursora.'

export type Nr01SalesPlan = {
  id: Nr01SalesPlanId
  name: string
  audienceBadge: string
  priceLabel: string
  priceCents: number
  installmentNote: string
  modalityLabel: string
  summary: string
  features: string[]
  featured?: boolean
  featuredBadge?: string
  ctaLabel: string
  checkoutEnabled: boolean
  collaboratorsMin: number
  collaboratorsMax: number | null
  assessmentsPerPeriod: number
}

export const NR01_SALES_PLANS: Nr01SalesPlan[] = [
  {
    id: 'nr01_essencial',
    name: 'Essencial',
    audienceBadge: 'Até 50 colaboradores',
    priceLabel: 'R$ 4.800',
    priceCents: 480_000,
    installmentNote: '12x de R$ 400 no cartão',
    modalityLabel: 'Assinatura anual',
    summary:
      'Para empresas com até 50 colaboradores que precisam adequar-se à NR-01 com laudo certificado e sem burocracia desnecessária.',
    features: [
      'Até 50 colaboradores na população avaliada',
      'Até 4 laudos certificados por ano',
      'Cadência máxima: 1 laudo por mês',
      'O 1.º laudo certifica os subsequentes no ciclo',
      'RT cadastrado pela sua empresa (assinatura fora da licença base)',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA',
      'Suporte por e-mail',
    ],
    ctaLabel: 'Assinar plano',
    checkoutEnabled: true,
    collaboratorsMin: 1,
    collaboratorsMax: 50,
    assessmentsPerPeriod: 4,
  },
  {
    id: 'nr01_operacional',
    name: 'Operacional',
    audienceBadge: 'Até 120 colaboradores',
    priceLabel: 'R$ 9.600',
    priceCents: 960_000,
    installmentNote: '12x de R$ 800 no cartão',
    modalityLabel: 'Assinatura anual',
    summary:
      'Para equipes de até 120 colaboradores com ciclo semestral robusto de avaliação psicossocial e dossiê preparado para fiscalização.',
    features: [
      'Até 120 colaboradores na população avaliada',
      'Até 6 laudos certificados por ano',
      'Cadência máxima: 1 laudo por mês',
      'O 1.º laudo certifica os subsequentes no ciclo',
      'RT cadastrado pela sua empresa',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA',
      'Pacote de evidências (Trino)',
      'Suporte prioritário',
    ],
    featured: true,
    featuredBadge: 'Mais contratado',
    ctaLabel: 'Assinar plano',
    checkoutEnabled: true,
    collaboratorsMin: 1,
    collaboratorsMax: 120,
    assessmentsPerPeriod: 6,
  },
  {
    id: 'nr01_estruturado',
    name: 'Estruturado',
    audienceBadge: 'Até 200 colaboradores',
    priceLabel: 'R$ 12.000',
    priceCents: 1_200_000,
    installmentNote: '12x de R$ 1.000 no cartão',
    modalityLabel: 'Assinatura anual',
    summary:
      'Para empresas com até 200 colaboradores, ciclo mensal completo e relatórios consolidados para o PGR e a liderança.',
    features: [
      'Até 200 colaboradores na população avaliada',
      'Até 12 laudos certificados por ano',
      'Cadência máxima: 1 laudo por mês',
      'O 1.º laudo certifica os subsequentes no ciclo',
      'RT cadastrado pela sua empresa',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA',
      'Pacote de evidências (Trino)',
      'Relatório consolidado trimestral',
      'Suporte prioritário',
    ],
    ctaLabel: 'Assinar plano',
    checkoutEnabled: true,
    collaboratorsMin: 1,
    collaboratorsMax: 200,
    assessmentsPerPeriod: 12,
  },
  {
    id: 'nr01_corporativo',
    name: 'Corporativo',
    audienceBadge: 'Acima de 200 colaboradores',
    priceLabel: 'Sob consulta',
    priceCents: 0,
    installmentNote: 'Condições personalizadas',
    modalityLabel: 'Assinatura anual',
    summary:
      'Para grupos empresariais com mais de 200 colaboradores ou múltiplas unidades. Proposta sob medida.',
    features: [
      'Colaboradores ilimitados (conforme escopo)',
      'Laudos certificados ilimitados no período acordado',
      'Cadência máxima: 1 laudo/mês por unidade',
      'Múltiplos RT cadastráveis',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA por unidade',
      'Pacote de evidências (Trino)',
      'Integração com SESMT',
      'Relatório consolidado mensal',
      'Suporte dedicado',
    ],
    ctaLabel: 'Solicitar proposta',
    checkoutEnabled: false,
    collaboratorsMin: 201,
    collaboratorsMax: null,
    assessmentsPerPeriod: 999,
  },
]

export function getSalesPlan(id: string): Nr01SalesPlan | undefined {
  return NR01_SALES_PLANS.find((p) => p.id === id)
}

export function computeCheckoutTotalCents(
  plan: Pick<Nr01SalesPlan, 'priceCents'>,
  addonJovaneRt: boolean,
): { baseCents: number; addonCents: number; totalCents: number } {
  const baseCents = plan.priceCents
  const addonCents = addonJovaneRt ? Math.round(baseCents * JOVANE_RT_UPSELL.priceMultiplier) : 0
  return { baseCents, addonCents, totalCents: baseCents + addonCents }
}

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}
