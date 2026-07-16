export type PlanId =
  | 'nr01_essencial'
  | 'nr01_operacional'
  | 'nr01_estruturado'
  | 'nr01_corporativo'

export const JOVANE_RT_UPSELL = {
  id: 'jovane_rt',
  shortLabel: 'ADD-ON: JOVANE COMO RT',
  description:
    'Jovane Borlini como responsável técnico habilitado + aplicação do Pentagrama de Ginger (IL e IC) em toda a equipe, antecedendo a pesquisa e o laudo NR-01.',
  multiplier: 0.5,
} as const

export const RT_NOTICE =
  'A assinatura da plataforma não inclui o profissional que assina o laudo perante o MTE. Cada empresa cadastra o seu RT habilitado. O add-on acima é opcional.'

export type SalesPlan = {
  id: PlanId
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
}

export const SALES_PLANS: SalesPlan[] = [
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
      'Até 50 colaboradores',
      'Até 4 laudos certificados/ano',
      'Cadência máxima: 1 laudo/mês',
      'O 1.º laudo certifica os subsequentes',
      'RT cadastrado pela sua empresa',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA',
      'Suporte por e-mail',
    ],
    ctaLabel: 'Assinar plano',
    checkoutEnabled: true,
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
      'Para equipes de até 120 colaboradores com ciclo semestral robusto de avaliação psicossocial.',
    features: [
      'Até 120 colaboradores',
      'Até 6 laudos certificados/ano',
      'Cadência máxima: 1 laudo/mês',
      'O 1.º laudo certifica os subsequentes',
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
      'Para empresas com até 200 colaboradores, ciclo mensal completo e relatórios consolidados.',
    features: [
      'Até 200 colaboradores',
      'Até 12 laudos certificados/ano',
      'Cadência máxima: 1 laudo/mês',
      'O 1.º laudo certifica os subsequentes',
      'RT cadastrado pela sua empresa',
      'Laudo técnico NR-01 completo',
      'Plano de ação PDCA',
      'Pacote de evidências (Trino)',
      'Relatório consolidado trimestral',
      'Suporte prioritário',
    ],
    ctaLabel: 'Assinar plano',
    checkoutEnabled: true,
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
      'Para grupos com mais de 200 colaboradores ou múltiplas unidades. Proposta sob medida.',
    features: [
      'Colaboradores ilimitados (escopo acordado)',
      'Laudos certificados ilimitados no período',
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
  },
]

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function totalWithAddon(baseCents: number, addon: boolean): number {
  if (!addon) return baseCents
  return baseCents + Math.round(baseCents * JOVANE_RT_UPSELL.multiplier)
}
