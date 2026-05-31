/**
 * Re-export do catálogo NR-01 (t01–t16) — compatibilidade com imports legados.
 */

import {
  NR01_PACKAGE_DELIVERABLES,
  computeCheckoutPricing,
  formatBrl,
  getTier,
  parseTierPlanId,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'

export {
  PENTAGRAMA_GINGER_ADDON,
  PENTAGRAMA_GINGER_ADDON_ID,
  JOVANE_RT_UPSELL_ID,
  NR01_RT_NOTICE,
  NR01_TIERS,
  NR01_PACKAGE_DELIVERABLES,
  buildSku,
  computeCheckoutPricing,
  formatBrl,
  formatBillingLabel,
  getTier,
  isPentagramaAddon,
  parseTierPlanId,
  planDbId,
  resolveTierFromHeadcount,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'

/** @deprecated Use PENTAGRAMA_GINGER_ADDON */
export { PENTAGRAMA_GINGER_ADDON as JOVANE_RT_UPSELL } from '@/lib/billing/nr01-catalog'

export type Nr01SalesPlanId = `nr01_${Nr01TierId}`

export function getSalesPlan(id: string) {
  const tierId = parseTierPlanId(id)
  if (!tierId) return undefined
  const tier = getTier(tierId)
  const pricing = computeCheckoutPricing({
    tierId,
    billingMode: 'anual_parcelado',
    includePentagrama: false,
  })
  return {
    id: `nr01_${tierId}`,
    name: `Faixa ${tierId.toUpperCase()}`,
    audienceBadge: tier.label,
    priceLabel: formatBrl(tier.annualParceladoCents),
    priceCents: tier.annualParceladoCents,
    installmentNote: `12× de ${formatBrl(pricing.installmentCents)}`,
    modalityLabel: 'Assinatura anual',
    summary: `Assinatura anual NR-01 para ${tier.label}.`,
    features: [...NR01_PACKAGE_DELIVERABLES],
    ctaLabel: 'Assinar plano',
    checkoutEnabled: tier.checkoutEnabled,
    collaboratorsMin: tier.workerMin,
    collaboratorsMax: tier.workerMax,
    assessmentsPerPeriod: 99,
  }
}

export function computeCheckoutTotalCents(
  plan: { priceCents?: number; id?: string },
  addonPentagrama: boolean,
  billingMode: Nr01BillingMode = 'anual_parcelado',
): { baseCents: number; addonCents: number; totalCents: number } {
  const tierId = parseTierPlanId(String(plan.id ?? '')) ?? 't01'
  const p = computeCheckoutPricing({
    tierId,
    billingMode,
    includePentagrama: addonPentagrama,
  })
  return { baseCents: p.baseCents, addonCents: p.gingerCents, totalCents: p.totalCents }
}
