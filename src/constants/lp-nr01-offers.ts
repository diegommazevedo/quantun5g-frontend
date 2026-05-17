/** Planos NR-01 publicados na LP — alinhados ao checkout (P021) e à calculadora de escala. */

export type Nr01WizardTier = 'Essencial' | 'Operacional' | 'Estruturado' | 'Corporativo'

export type Nr01Offer = {
  tier: Nr01WizardTier
  planId: string
  price: string
  period: string
  modality: string
  description: string
  highlights: string[]
  collaboratorsMin: number
  collaboratorsMax: number | null
}

export const NR01_OFFERS: Nr01Offer[] = [
  {
    tier: 'Essencial',
    planId: 'nr01_essencial',
    price: 'R$ 2.800',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo de avaliação',
    description: 'Coleta NR-01, laudo técnico e plano PDCA base.',
    highlights: [
      'Coleta anônima NR-01',
      'Laudo técnico em PDF',
      'Plano de ação PDCA',
      'Dashboard do consultor',
    ],
    collaboratorsMin: 1,
    collaboratorsMax: 19,
  },
  {
    tier: 'Operacional',
    planId: 'nr01_operacional',
    price: 'R$ 5.500',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo de avaliação',
    description: 'Pacote com evidências e trilha de auditoria para SESMT.',
    highlights: [
      'Tudo do Essencial',
      'Pacote de evidências SHA-256',
      'Audit log imutável',
      'Suporte na implantação',
    ],
    collaboratorsMin: 20,
    collaboratorsMax: 99,
  },
  {
    tier: 'Estruturado',
    planId: 'nr01_estruturado',
    price: 'R$ 19.600',
    period: 'por ano',
    modality: 'Assinatura anual · 2 ciclos de avaliação',
    description: 'Monitoramento contínuo e relatórios para SST.',
    highlights: [
      'Tudo do Operacional',
      'Pulsos de monitoramento',
      'Relatórios periódicos',
      'k-anonymity configurável',
    ],
    collaboratorsMin: 100,
    collaboratorsMax: 499,
  },
  {
    tier: 'Corporativo',
    planId: 'nr01_corporativo',
    price: 'R$ 60.000',
    period: 'por ano',
    modality: 'Assinatura anual · 4 ciclos de avaliação',
    description: 'Grandes populações e multi-equipe.',
    highlights: [
      'Tudo do Estruturado',
      'Volume elevado',
      'Prioridade na implantação',
      'Evidências para auditoria',
    ],
    collaboratorsMin: 500,
    collaboratorsMax: null,
  },
]

export function collaboratorsToTier(collaborators: number): Nr01WizardTier {
  const n = Math.min(5000, Math.max(1, Math.round(collaborators)))
  if (n <= 19) return 'Essencial'
  if (n <= 99) return 'Operacional'
  if (n <= 499) return 'Estruturado'
  return 'Corporativo'
}

export function getOfferByTier(tier: Nr01WizardTier): Nr01Offer {
  const offer = NR01_OFFERS.find((o) => o.tier === tier)
  if (!offer) throw new Error(`Oferta não encontrada: ${tier}`)
  return offer
}

export function tierRangeLabel(tier: Nr01WizardTier): string {
  const o = getOfferByTier(tier)
  if (o.collaboratorsMax == null) return `${o.collaboratorsMin}+ colaboradores`
  if (o.collaboratorsMin === o.collaboratorsMax) return `${o.collaboratorsMin} colaboradores`
  return `${o.collaboratorsMin} a ${o.collaboratorsMax} colaboradores`
}
