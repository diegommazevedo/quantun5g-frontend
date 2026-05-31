/** Planos NR-01 publicados na LP — alinhados ao checkout (P021) e à calculadora de escala. */

export type Nr01WizardTier = 'Essencial' | 'Operacional' | 'Estruturado' | 'Corporativo'

export type Nr01Offer = {
  tier: Nr01WizardTier
  planId: string
  price: string
  period: string
  modality: string
  /** Faixa de colaboradores — fator decisor do plano */
  audienceRange: string
  headline: string
  summary: string
  deliverables: string[]
  idealFor: string
  collaboratorsMin: number
  collaboratorsMax: number | null
}

/** Aviso regulatório exibido em todos os planos (responsável técnico do laudo). */
export const NR01_RT_LAUDO_NOTICE =
  'A assinatura e a responsabilidade técnica do laudo perante o MTE e demais órgãos competentes não estão incluídas na licença da plataforma. Cada empresa contratante deve cadastrar e vincular o seu profissional legalmente habilitado (engenheiro de segurança, médico do trabalho ou outro perfil aplicável ao seu GRO), que validará o conteúdo e assinará o documento conforme a legislação e o PGR da organização.'

export const NR01_PLATFORM_NOTICE =
  'A Quantum5G é uma solução digital de coleta anônima, motor regulatório, laudo técnico estruturado, plano de ação e trilha de evidências com integridade verificável (hashes e registro de auditoria). Material informativo: não substitui assessoria jurídica, médica do trabalho ou consultoria presencial contratada à parte.'

export const NR01_OFFERS: Nr01Offer[] = [
  {
    tier: 'Essencial',
    planId: 'nr01_essencial',
    price: 'R$ 2.800',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo completo de avaliação',
    audienceRange: '1 a 19 colaboradores na população avaliada',
    headline: 'Primeira adequação documental com laudo e plano de ação',
    summary:
      'Indicado para organizações enxutas que precisam estruturar a avaliação de fatores psicossociais relacionados ao trabalho (FRP) com coleta digital, laudo técnico exportável e base para o ciclo PDCA — com preço público e escopo fechado antes do pagamento.',
    deliverables: [
      'Instrumento NR-01 aplicado por link, com anonimato do respondente e regras de agregação estatística',
      'Laudo técnico em PDF gerado pela plataforma, com leitura por dimensão e indicadores alinhados ao GRO',
      'Plano de ação PDCA estruturado a partir dos achados',
      'Dashboard do consultor interno ou parceiro para acompanhar coleta e encerramento',
      '1 ciclo de avaliação no período contratado',
    ],
    idealFor: 'Pequenas equipes, pilotos de conformidade ou primeira entrega NR-01 antes da vigência punitiva.',
    collaboratorsMin: 1,
    collaboratorsMax: 19,
  },
  {
    tier: 'Operacional',
    planId: 'nr01_operacional',
    price: 'R$ 5.500',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo completo de avaliação',
    audienceRange: '20 a 99 colaboradores na população avaliada',
    headline: 'Conformidade operacional com pacote de evidências para fiscalização',
    summary:
      'Para empresas em crescimento que exigem não só o laudo, mas o pacote de evidências com integridade criptográfica e histórico imutável — o que o auditor fiscal e o SESMT costumam solicitar na abertura do dossiê.',
    deliverables: [
      'Tudo o que está incluído no plano Essencial',
      'Pacote Trino: laudo + plano de ação + evidências reunidas para auditoria',
      'Hashes SHA-256 do instrumento e do pacote global de evidências',
      'Audit log append-only (trilha de eventos sem alteração retroativa)',
      'Suporte prioritário na implantação do ciclo (configuração, comunicação interna e boas práticas de coleta)',
      '1 ciclo de avaliação no período contratado',
    ],
    idealFor: 'PMEs e operações com SESMT ativo que buscam resposta rápida e documentação defensável.',
    collaboratorsMin: 20,
    collaboratorsMax: 99,
  },
  {
    tier: 'Estruturado',
    planId: 'nr01_estruturado',
    price: 'R$ 19.600',
    period: 'por ano',
    modality: 'Assinatura anual · 2 ciclos de avaliação',
    audienceRange: '100 a 499 colaboradores na população avaliada',
    headline: 'Monitoramento contínuo com dois ciclos anuais de avaliação',
    summary:
      'Modelo para empresas médias que tratam FRP como programa recorrente: dois ciclos formais por ano, pulsos de acompanhamento e relatórios periódicos, mantendo k-anonymity configurável por avaliação.',
    deliverables: [
      'Tudo o que está incluído no plano Operacional',
      '2 ciclos completos de avaliação NR-01 no ano',
      'Pulsos de monitoramento contínuo entre ciclos (amostra reduzida, anônima)',
      'Relatórios periódicos para integração ao PGR e comunicação com lideranças',
      'k-anonymity configurável por avaliação (exibição segura de dimensões)',
    ],
    idealFor: 'Organizações com população relevante e necessidade de demonstrar evolução ao longo do ano.',
    collaboratorsMin: 100,
    collaboratorsMax: 499,
  },
  {
    tier: 'Corporativo',
    planId: 'nr01_corporativo',
    price: 'R$ 60.000',
    period: 'por ano',
    modality: 'Assinatura anual · 4 ciclos de avaliação',
    audienceRange: '500 ou mais colaboradores na população avaliada',
    headline: 'Escala corporativa com quatro ciclos e prioridade de implantação',
    summary:
      'Para operações de alto volume, múltiplas unidades ou grupos empresariais que precisam cadência trimestral de avaliação, fila prioritária de implantação e dossiê robusto para auditorias e due diligence de SST.',
    deliverables: [
      'Tudo o que está incluído no plano Estruturado',
      '4 ciclos completos de avaliação NR-01 no ano',
      'Prioridade na fila de implantação e acompanhamento dedicado',
      'Arquitetura preparada para volume elevado e segmentação por unidade (conforme desenho aprovado)',
      'Evidências e laudos versionados para histórico multiperíodo',
    ],
    idealFor: 'Corporações, indústrias e redes com população ampla e pressão regulatória constante.',
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
  return getOfferByTier(tier).audienceRange
}
