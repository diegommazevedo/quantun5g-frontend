/** Gerado por scripts/kiwify-update-sim-price.mjs */
export const KIWIFY_SIM_CHECKOUT_URL = 'https://pay.kiwify.com.br/87dXrZy'
export const KIWIFY_SIM_PRODUCT_LABEL = 'Quantum5G NR-01 · SIMULADO Lead R$5 PIX'
export const KIWIFY_SIM_PRICE_CENTS = 500

export function isSimCheckoutReady(): boolean {
  return Boolean(KIWIFY_SIM_CHECKOUT_URL?.trim())
}
