/**
 * URLs de checkout NR-01 — contrato público (COERENCIA-LP-SAAS).
 *
 * Canônico: ?plan=nr01_t05
 * Opcional: &addon=pentagrama_ginger · &billing=anual_vista
 *
 * Não usar na URL: tier=, headcount=, plan=nr01_essencial, addon=jovane_rt
 */

import {
  PENTAGRAMA_GINGER_ADDON_ID,
  planDbId,
  parseTierPlanId,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'

export function checkoutOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_CHECKOUT_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://www.quantun5g.app'
  return raw.replace(/\/$/, '')
}

export function buildNr01CheckoutUrl(params: {
  tierId: Nr01TierId
  billingMode?: Nr01BillingMode
  includePentagrama?: boolean
}): string {
  const url = new URL('/checkout/nr01', checkoutOrigin())
  url.searchParams.set('plan', planDbId(params.tierId))
  if (params.billingMode === 'anual_vista') {
    url.searchParams.set('billing', 'anual_vista')
  }
  if (params.includePentagrama) {
    url.searchParams.set('addon', PENTAGRAMA_GINGER_ADDON_ID)
  }
  return url.pathname + url.search
}

/** URL absoluta (LP externa, e-mail, ads). */
export function buildNr01CheckoutAbsoluteUrl(
  params: Parameters<typeof buildNr01CheckoutUrl>[0],
): string {
  const path = buildNr01CheckoutUrl(params)
  if (path.startsWith('http')) return path
  return `${checkoutOrigin()}${path}`
}

export function parseCheckoutPlanId(plan: string | null | undefined): Nr01TierId | null {
  return parseTierPlanId(plan ?? '')
}
