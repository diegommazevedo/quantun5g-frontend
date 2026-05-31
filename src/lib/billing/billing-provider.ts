/**
 * Provedor de pagamento ativo — default Asaas (produção atual).
 * Kiwify só entra quando BILLING_PROVIDER=kiwify E mapa de produtos configurado.
 */

export type BillingProvider = 'asaas' | 'kiwify'

export function getBillingProvider(): BillingProvider {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  return raw === 'kiwify' ? 'kiwify' : 'asaas'
}

export function isKiwifyBillingEnabled(): boolean {
  return getBillingProvider() === 'kiwify'
}
