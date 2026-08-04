/**
 * Caminho comercial canônico — Kiwify (self-service).
 * Fatura presencial foi descontinuada na UX; Asaas fica só se BILLING_PROVIDER=asaas.
 */

/** Landing pública / funil de planos → checkout Kiwify. */
export const NR01_PURCHASE_PATH = '/lp/nr01'

/** Checkout autenticado (cria sub + redirect Kiwify/Asaas conforme provider). */
export const NR01_CHECKOUT_PATH = '/checkout/nr01'

export function nr01PurchaseHref(hint?: string): string {
  if (!hint) return NR01_PURCHASE_PATH
  return `${NR01_PURCHASE_PATH}?hint=${encodeURIComponent(hint)}`
}

export function nr01CheckoutHref(hint?: string): string {
  if (!hint) return NR01_CHECKOUT_PATH
  return `${NR01_CHECKOUT_PATH}?hint=${encodeURIComponent(hint)}`
}

/** Destino quando o usuário autenticado precisa de licença. */
export function nr01LicenseRequiredHref(hint = 'licenca'): string {
  return nr01CheckoutHref(hint)
}
