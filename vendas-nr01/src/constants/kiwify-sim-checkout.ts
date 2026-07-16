/** Checkout Kiwify do simulado lead R$10 — preenchido por scripts/kiwify-setup-sim-lead.mjs */
export const KIWIFY_SIM_CHECKOUT_URL = ''
export const KIWIFY_SIM_PRODUCT_LABEL = 'Quantum5G NR-01 · SIMULADO Lead R$10 PIX'

export function isSimCheckoutReady(): boolean {
  return KIWIFY_SIM_CHECKOUT_URL.startsWith('https://pay.kiwify.com.br/')
}
