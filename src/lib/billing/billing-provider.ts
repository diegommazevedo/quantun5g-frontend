/**
 * Provedor de pagamento ativo.
 * Default: Kiwify (self-service + workspace automático).
 * Asaas só entra com BILLING_PROVIDER=asaas (segundo plano / legado).
 */

export type BillingProvider = 'asaas' | 'kiwify'

export function getBillingProvider(): BillingProvider {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  if (raw === 'asaas') return 'asaas'
  return 'kiwify'
}

export function isKiwifyBillingEnabled(): boolean {
  return getBillingProvider() === 'kiwify'
}

export function isAsaasBillingEnabled(): boolean {
  return getBillingProvider() === 'asaas'
}
