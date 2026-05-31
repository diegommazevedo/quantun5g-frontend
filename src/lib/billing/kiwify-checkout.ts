/**
 * Checkout NR-01 via Kiwify — redirect para pay.kiwify.com.br com tracking.
 */

import type { Nr01BillingMode, Nr01TierId } from '@/lib/billing/nr01-catalog'
import { findKiwifyCheckoutEntry } from '@/lib/billing/kiwify-product-map'

export function buildKiwifyCheckoutRedirectUrl(params: {
  subscriptionId: string
  tierId: Nr01TierId
  billingMode: Nr01BillingMode
  includePentagrama: boolean
  customerEmail?: string
}): string {
  const entry = findKiwifyCheckoutEntry({
    tierId: params.tierId,
    billingMode: params.billingMode,
    includePentagrama: params.includePentagrama,
  })
  if (!entry) {
    throw new Error(
      `Produto Kiwify não mapeado para ${params.tierId} / ${params.billingMode}` +
        (params.includePentagrama ? ' + Ginger' : ''),
    )
  }

  const url = new URL(entry.checkout_url)
  url.searchParams.set('utm_source', 'quantum5g')
  url.searchParams.set('utm_medium', 'checkout')
  url.searchParams.set('utm_campaign', 'nr01')
  url.searchParams.set('utm_content', params.subscriptionId)
  if (params.customerEmail) {
    url.searchParams.set('email', params.customerEmail)
  }
  return url.toString()
}
