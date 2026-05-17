/** NR-01 landing — copy, tiers e FAQ (P022) */

export const LP_NR01_TARGET_DATE = new Date('2026-05-26T23:59:59-03:00')

export const JOVANE_CRP_LABEL =
  process.env.NEXT_PUBLIC_JOVANE_CRP?.trim() || 'CRP 16/4948'

export type LpContentItem = {
  id: string
  title: string
  description: string
  href?: string
  available: boolean
}

/** Biblioteca de conteúdo: só renderiza secção se algum item tiver available: true */
export const LP_CONTENT_ITEMS: LpContentItem[] = [
  {
    id: 'guia-frp',
    title: 'Guia prático FRP (rascunho)',
    description: 'Checklist para gestores alinhar coleta e comunicação interna.',
    available: false,
  },
  {
    id: 'webinar-gravado',
    title: 'Webinar NR-01 + ISO 45003',
    description: 'Gravação e slides — disponível após homologação.',
    href: '#',
    available: false,
  },
]

export type LpPricingTier = {
  id: string
  name: string
  priceLabel: string
  period: string
  description: string
  highlights: string[]
  ctaLabel: string
  featured?: boolean
}

export const LP_PRICING_TIERS: LpPricingTier[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    priceLabel: 'Sob consulta',
    period: 'projeto fechado',
    description: 'Coleta NR-01, laudo técnico e plano PDCA base.',
    highlights: ['Até 100 respondentes', 'Dashboard consultor', 'Export PDF laudo'],
    ctaLabel: 'Falar com consultor',
  },
  {
    id: 'profissional',
    name: 'Profissional',
    priceLabel: 'Sob consulta',
    period: 'anual sugerido',
    description: 'Pacote completo com evidências assinadas e trilha de auditoria.',
    highlights: [
      'Pacote Trino (laudo + plano + evidências)',
      'Hashes SHA-256 e audit log imutável',
      'Suporte prioritário na implantação',
    ],
    ctaLabel: 'Solicitar proposta',
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Custom',
    period: 'multi-unidade',
    description: 'Volume alto, SSO, SLA e integrações sob medida.',
    highlights: ['Multiempresa', 'API e webhooks', 'Customer success dedicado'],
    ctaLabel: 'Agendar diagnóstico comercial',
  },
  {
    id: 'pentagrama-bridge',
    name: 'Pentagrama + NR-01',
    priceLabel: 'Pacote',
    period: 'diagnóstico integrado',
    description: 'Cruzamento opcional Pentagrama (vivido) com achados NR-01 regulatórios.',
    highlights: ['Bridge metodológica', 'Workshop de leitura conjunta', 'Relatório unificado'],
    ctaLabel: 'Pedir escopo',
  },
]

export type LpFaqItem = { q: string; a: string }

export const LP_FAQ_ITEMS: LpFaqItem[] = [
  {
    q: 'O que muda com a NR-01 em maio de 2026?',
    a: 'A obrigatoriedade de identificar, avaliar e controlar fatores de risco psicossociais (FRP) relacionados ao trabalho passa a integrar o GRO de forma mais explícita para fins de fiscalização. A plataforma apoia evidência documental e trilha de auditoria.',
  },
  {
    q: 'Quantas pessoas precisam responder?',
    a: 'Depende do desenho amostral e do segmento. O motor respeita regras de agregação (k-anonymity configurável) para exibir dimensões com segurança estatística.',
  },
  {
    q: 'Os colaboradores são identificados?',
    a: 'Não. Coletas de colaborador são anônimas por desenho: identificador técnico sem vínculo a cadastro de usuário, alinhado à decisão de produto de confidencialidade.',
  },
  {
    q: 'Quanto tempo leva a coleta?',
    a: 'Em média 10 a 15 minutos por respondente, em fluxo web responsivo. A consultoria define janela e comunicação interna.',
  },
  {
    q: 'Posso usar só o laudo sem o plano de ação?',
    a: 'O laudo técnico pode ser contratado de forma modular; o plano PDCA e o pacote de evidências são recomendados para fechar o ciclo preventivo e a documentação para fiscalização.',
  },
  {
    q: 'O que é o pacote Trino?',
    a: 'Conjunto de artefatos com laudo, plano de ação e evidências, com hashes criptográficos e registro em audit log imutável — primeira coisa que o auditor fiscal abre.',
  },
  {
    q: 'Integra com Pentagrama de Ginger?',
    a: 'Sim, de forma opcional: o bridge cruza leitura ISO regulatória com o vivido organizacional quando contratado.',
  },
  {
    q: 'Onde ficam hospedados os dados?',
    a: 'Infraestrutura em nuvem (Supabase + Vercel), com medidas de pseudonimização e segregação por tenant conforme arquitetura Quantum5G.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Contratos comerciais podem usar gateway Asaas (cartão, boleto, PIX conforme habilitação). Valores finais constam na proposta assinada.',
  },
  {
    q: 'Preciso de assessoria jurídica?',
    a: 'A Quantum5G fornece instrumento e documentação técnica; decisões jurídicas e de compliance final são sempre da empresa contratante com seu corpo jurídico.',
  },
]
