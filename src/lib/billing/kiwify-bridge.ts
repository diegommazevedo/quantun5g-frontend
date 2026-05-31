/**
 * Ponte NR-01 ↔ Kiwify — mapeamento de SKUs internos para produtos Kiwify.
 * Fase atual: validação de conectividade; checkout ainda via Asaas.
 *
 * Próximo passo (pós-validação):
 *   1. Criar produtos/ofertas na Kiwify por faixa t01–t15 (+ Ginger)
 *   2. Preencher KIWIFY_PRODUCT_MAP ou tabela product_plans.kiwify_product_id
 *   3. Webhook compra_aprovada → provisionNr01Subscription
 */

import { NR01_TIERS, buildSku, type Nr01TierId } from '@/lib/billing/nr01-catalog'
import type { KiwifyProduct } from '@/lib/billing/kiwify-client'

export type KiwifyBridgeStatus = 'ready' | 'partial' | 'disconnected'

export interface KiwifyBridgeReport {
  status: KiwifyBridgeStatus
  oauthScopes: string[]
  accountId: string | null
  companyName: string | null
  kiwifyProductsTotal: number
  kiwifyWebhooksTotal: number
  catalogTiers: number
  mappedSkus: number
  unmappedSkus: string[]
  sampleProducts: Array<{ id: string; name: string }>
  notes: string[]
}

/** SKUs internos esperados (base parcelado, sem Ginger). */
export function expectedNr01Skus(): string[] {
  return NR01_TIERS.filter((t) => t.checkoutEnabled).map((t) =>
    buildSku(t.id, 'anual_parcelado', false),
  )
}

/**
 * Heurística: produto Kiwify cujo nome contém tier (t05) ou faixa de workers.
 * Substituir por mapa explícito quando produtos forem criados na dashboard.
 */
export function matchKiwifyProductToTier(
  products: KiwifyProduct[],
  tierId: Nr01TierId,
): KiwifyProduct | null {
  const tier = NR01_TIERS.find((t) => t.id === tierId)
  if (!tier) return null

  const byId = products.find((p) => p.name?.toLowerCase().includes(tierId))
  if (byId) return byId

  const labelPart = tier.label.split(' ')[0]?.replace(/[^\d–-]/g, '')
  if (labelPart) {
    const byLabel = products.find((p) => p.name?.includes(labelPart))
    if (byLabel) return byLabel
  }

  return null
}

export function summarizeProductMapping(products: KiwifyProduct[]): {
  mappedSkus: number
  unmappedSkus: string[]
} {
  const skus = expectedNr01Skus()
  const unmapped: string[] = []
  let mapped = 0

  for (const sku of skus) {
    const tierId = sku.split('-')[2] as Nr01TierId
    if (matchKiwifyProductToTier(products, tierId)) mapped++
    else unmapped.push(sku)
  }

  return { mappedSkus: mapped, unmappedSkus: unmapped }
}
