/**
 * Ofertas LP NR-01 — derivadas do catálogo t01–t16 (COERENCIA-LP-SAAS).
 */

import {
  NR01_PACKAGE_DELIVERABLES,
  NR01_TIERS,
  computeCheckoutPricing,
  formatBrl,
  formatBillingLabel,
  getTier,
  planDbId,
  resolveTierFromHeadcount,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'

export type Nr01WizardTier = Nr01TierId

export type Nr01Offer = {
  tier: Nr01WizardTier
  planId: string
  price: string
  period: string
  modality: string
  audienceRange: string
  headline: string
  summary: string
  deliverables: string[]
  idealFor: string
  collaboratorsMin: number
  collaboratorsMax: number | null
  billingMode: Nr01BillingMode
  installmentLabel: string
  vistaLabel: string
}

export const NR01_RT_LAUDO_NOTICE =
  'A assinatura e a responsabilidade técnica do laudo perante o MTE não estão incluídas na licença da plataforma. Cada empresa contratante cadastra o profissional legalmente habilitado (CRP/CRM) da organização, que assina o documento conforme legislação e PGR.'

export const NR01_PLATFORM_NOTICE =
  'Quantum5G: coleta anônima, laudo NR-01, plano PDCA e trilha de evidências com integridade verificável (SHA-256). Assinatura anual por faixa de trabalhadores — à vista (−10%) ou 12× no cartão.'

function buildOffer(tierId: Nr01TierId, billingMode: Nr01BillingMode = 'anual_parcelado'): Nr01Offer {
  const tier = getTier(tierId)

  if (!tier.checkoutEnabled) {
    return {
      tier: tierId,
      planId: planDbId(tierId),
      price: 'Sob consulta',
      period: 'Proposta comercial',
      modality: 'Assinatura anual · volume enterprise',
      audienceRange: tier.label,
      headline: `Conformidade NR-01 para ${tier.label}`,
      summary:
        'Volume acima de 1.000 trabalhadores — proposta comercial personalizada.',
      deliverables: [...NR01_PACKAGE_DELIVERABLES],
      idealFor: 'Grupos empresariais e operações de grande porte.',
      collaboratorsMin: tier.workerMin,
      collaboratorsMax: tier.workerMax,
      billingMode,
      installmentLabel: 'Entre em contato para proposta',
      vistaLabel: 'Entre em contato para proposta',
    }
  }

  const parcelado = computeCheckoutPricing({ tierId, billingMode: 'anual_parcelado', includePentagrama: false })
  const vista = computeCheckoutPricing({ tierId, billingMode: 'anual_vista', includePentagrama: false })
  const active = computeCheckoutPricing({ tierId, billingMode, includePentagrama: false })

  return {
    tier: tierId,
    planId: planDbId(tierId),
    price: formatBrl(active.baseCents),
    period: billingMode === 'anual_vista' ? 'à vista / ano' : '12× no cartão / ano',
    modality: 'Assinatura anual · mesmo pacote em todas as faixas',
    audienceRange: tier.label,
    headline: `Conformidade NR-01 para ${tier.label}`,
    summary: `Licença anual da plataforma Quantum5G NR-01 para empresas com ${tier.label.toLowerCase()}. Pesquisa psicossocial, laudo, PDCA e evidências — RT cadastrado pela sua empresa.`,
    deliverables: [...NR01_PACKAGE_DELIVERABLES],
    idealFor: `Organizações com ${tier.label.toLowerCase()} no escopo NR-01.`,
    collaboratorsMin: tier.workerMin,
    collaboratorsMax: tier.workerMax,
    billingMode,
    installmentLabel: `${formatBrl(parcelado.baseCents)}/ano · 12× de ${formatBrl(parcelado.installmentCents)}`,
    vistaLabel: `${formatBrl(vista.baseCents)}/ano à vista (−10%)`,
  }
}

export const NR01_OFFERS: Nr01Offer[] = NR01_TIERS.map((t) => buildOffer(t.id))

export function collaboratorsToTier(collaborators: number): Nr01WizardTier {
  return resolveTierFromHeadcount(collaborators)
}

export function getOfferByTier(tier: Nr01WizardTier, billingMode: Nr01BillingMode = 'anual_parcelado'): Nr01Offer {
  return buildOffer(tier, billingMode)
}

export function tierRangeLabel(tier: Nr01WizardTier): string {
  return getTier(tier).label
}

export function tierDisplayName(tier: Nr01WizardTier): string {
  return getTier(tier).label
}
