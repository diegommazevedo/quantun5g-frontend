import type { KiwifySaleDetails } from '@/lib/billing/kiwify-client'

/**
 * Normaliza valor cobrado da API Kiwify para centavos BRL.
 * A API costuma retornar centavos inteiros (1000 = R$10), mas alguns payloads usam reais.
 */
export function kiwifyChargeAmountCents(sale: KiwifySaleDetails | null | undefined): number {
  if (!sale) return 0
  const raw = sale.payment?.charge_amount ?? sale.net_amount ?? 0
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0

  // Valores fracionários (ex. 10.0, 2460.5) → reais
  if (!Number.isInteger(n)) return Math.round(n * 100)

  // Inteiros pequenos (< 500) tendem a ser reais (10 = R$10)
  if (n < 500) return Math.round(n * 100)

  return Math.round(n)
}
