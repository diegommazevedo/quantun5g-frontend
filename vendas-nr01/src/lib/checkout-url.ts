import { JOVANE_RT_UPSELL, type PlanId } from '@/constants/plans'

const DEFAULT_ORIGIN = 'http://localhost:3000'

export function checkoutOrigin(): string {
  return (process.env.NEXT_PUBLIC_CHECKOUT_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, '')
}

export function buildCheckoutUrl(planId: PlanId, addonJovaneRt: boolean): string {
  const url = new URL('/checkout/nr01', checkoutOrigin())
  url.searchParams.set('plan', planId)
  if (addonJovaneRt) url.searchParams.set('addon', JOVANE_RT_UPSELL.id)
  return url.toString()
}

export const PROPOSAL_MAILTO =
  'mailto:contato@quantun5g.com?subject=Proposta%20NR-01%20Corporativo&body=Ol%C3%A1%2C%20gostaria%20de%20uma%20proposta%20para%20o%20plano%20Corporativo.'
