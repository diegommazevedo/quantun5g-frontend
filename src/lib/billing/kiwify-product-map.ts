/**
 * Mapa tier/SKU → produto Kiwify (checkout pay.kiwify.com.br).
 * Fonte: config/kiwify-nr01-product-map.json (commitável, sem secrets).
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Nr01BillingMode, Nr01TierId } from '@/lib/billing/nr01-catalog'

export interface KiwifyProductMapEntry {
  tier_id: Nr01TierId
  billing_mode: Nr01BillingMode
  include_pentagrama: boolean
  kiwify_product_id: string
  /** Link curto pay.kiwify.com.br (1 por oferta/preço) */
  kiwify_link_id?: string
  /** UUID da oferta na Kiwify (mesmo produto, várias ofertas) */
  kiwify_offer_id?: string
  checkout_url: string
  /** Centavos esperados — usado para casar webhook quando product_id é compartilhado */
  price_cents?: number
  synced_at?: string
  label?: string
  sku?: string
}

export interface KiwifyMapLookupHint {
  priceCents?: number
  linkId?: string
  offerId?: string
}

interface MapFile {
  entries?: KiwifyProductMapEntry[]
}

let cached: KiwifyProductMapEntry[] | null = null

function mapPath(): string {
  return join(process.cwd(), 'config', 'kiwify-nr01-product-map.json')
}

export function loadKiwifyProductMap(): KiwifyProductMapEntry[] {
  if (cached) return cached
  const path = mapPath()
  if (!existsSync(path)) {
    cached = []
    return cached
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as MapFile
    cached = (raw.entries ?? []).filter(
      (e) => e.checkout_url?.trim() && e.kiwify_product_id?.trim(),
    )
  } catch {
    cached = []
  }
  return cached
}

export function resetKiwifyProductMapCache(): void {
  cached = null
}

export function findKiwifyCheckoutEntry(params: {
  tierId: Nr01TierId
  billingMode: Nr01BillingMode
  includePentagrama: boolean
}): KiwifyProductMapEntry | null {
  return (
    loadKiwifyProductMap().find(
      (e) =>
        e.tier_id === params.tierId &&
        e.billing_mode === params.billingMode &&
        e.include_pentagrama === params.includePentagrama,
    ) ?? null
  )
}

function priceMatches(a: number, b: number): boolean {
  return a === b || Math.abs(a - b) <= 100
}

export function findKiwifyEntryByProductId(
  productId: string,
  hint?: KiwifyMapLookupHint,
): KiwifyProductMapEntry | null {
  const id = productId.trim()
  const matches = loadKiwifyProductMap().filter((e) => e.kiwify_product_id === id)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]

  if (hint?.linkId) {
    const byLink = matches.find((e) => e.kiwify_link_id === hint.linkId)
    if (byLink) return byLink
  }
  if (hint?.offerId) {
    const byOffer = matches.find((e) => e.kiwify_offer_id === hint.offerId)
    if (byOffer) return byOffer
  }
  if (hint?.priceCents != null) {
    const byPrice = matches.find(
      (e) => e.price_cents != null && priceMatches(e.price_cents, hint.priceCents!),
    )
    if (byPrice) return byPrice
  }

  return matches[0]
}

export function findKiwifyEntryByLinkId(linkId: string): KiwifyProductMapEntry | null {
  const id = linkId.trim()
  return loadKiwifyProductMap().find((e) => e.kiwify_link_id === id) ?? null
}

export function isKiwifyProductMapReady(): boolean {
  return loadKiwifyProductMap().length > 0
}
