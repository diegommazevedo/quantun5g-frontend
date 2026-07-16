/**
 * Registra checkout do simulado lead (após criar produto R$10 na dashboard Kiwify).
 *
 * Uso:
 *   node --env-file=.env.local scripts/kiwify-register-sim-lead.mjs https://pay.kiwify.com.br/AbCdEfG
 *   node --env-file=.env.local scripts/kiwify-register-sim-lead.mjs AbCdEfG
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'config', 'kiwify-test-product.json')
const MAP = join(root, 'config', 'kiwify-nr01-product-map.json')
const VENDAS_TS = join(root, 'vendas-nr01', 'src', 'constants', 'kiwify-sim-checkout.ts')

const PRODUCT_NAME = 'Quantum5G NR-01 · SIMULADO Lead R$10 PIX'
const SKU = 'q5g-nr01-t01-sim-lead-pix'

const rawArg = process.argv[2]?.trim()
if (!rawArg) {
  console.error('Uso: node scripts/kiwify-register-sim-lead.mjs <checkout-url-ou-link-id>')
  process.exit(1)
}

const checkoutUrl = rawArg.startsWith('http')
  ? rawArg.replace(/\/$/, '')
  : `https://pay.kiwify.com.br/${rawArg}`
const linkId = checkoutUrl.split('/').pop()

const base = (process.env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')
const clientId = process.env.KIWIFY_CLIENT_ID?.trim()
const clientSecret =
  process.env.KIWIFY_CLIENT_SECRET?.trim() ?? process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
const accountId = process.env.KIWIFY_ACCOUNT_ID?.trim()

if (!clientId || !clientSecret || !accountId) {
  console.error('Faltam credenciais Kiwify no .env.local')
  process.exit(1)
}

const oauthRes = await fetch(`${base}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
})
const { access_token: token } = await oauthRes.json()
const headers = {
  Authorization: `Bearer ${token}`,
  'x-kiwify-account-id': accountId,
  Accept: 'application/json',
}

let productId = null
let productName = PRODUCT_NAME
let page = 1

while (!productId && page <= 10) {
  const res = await fetch(`${base}/products?page_number=${page}&page_size=50`, { headers })
  const json = await res.json()
  for (const p of json.data ?? []) {
    const detailRes = await fetch(`${base}/products/${p.id}`, { headers })
    const detail = await detailRes.json()
    const hit = (detail.links ?? []).some((l) => l.id === linkId)
    if (hit) {
      productId = detail.id
      productName = detail.name ?? PRODUCT_NAME
      break
    }
  }
  if ((json.data ?? []).length < 50) break
  page++
}

if (!productId) {
  console.error(`Link ${linkId} não encontrado na API. Confira o URL e tente novamente.`)
  process.exit(1)
}

const result = {
  kiwify_product_id: productId,
  checkout_url: checkoutUrl,
  kiwify_link_id: linkId,
  edit_url: `https://dashboard.kiwify.com/products/edit/${productId}`,
  created_at: new Date().toISOString(),
  purpose: 'sim_lead_R$10_pix',
  tier_id: 't01',
  billing_mode: 'anual_vista',
  price_cents: 1000,
  label: productName,
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')

const map = JSON.parse(readFileSync(MAP, 'utf8'))
const entry = {
  tier_id: 't01',
  billing_mode: 'anual_vista',
  include_pentagrama: false,
  kiwify_product_id: productId,
  checkout_url: checkoutUrl,
  kiwify_link_id: linkId,
  label: productName,
  sku: SKU,
  price_cents: 1000,
  synced_at: new Date().toISOString(),
  purpose: 'sim_lead_test',
}
map.entries = (map.entries ?? []).filter((e) => e.sku !== SKU)
map.entries.push(entry)
writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n')

const ts = `/** Gerado por scripts/kiwify-register-sim-lead.mjs */\nexport const KIWIFY_SIM_CHECKOUT_URL = '${checkoutUrl}'\nexport const KIWIFY_SIM_PRODUCT_LABEL = '${productName.replace(/'/g, "\\'")}'\n`
writeFileSync(VENDAS_TS, ts)

console.log('✅ Simulado registrado')
console.log(JSON.stringify(result, null, 2))
console.log('\n→ Abra http://localhost:3001/simulado')
console.log('→ Após deploy, faça commit do product-map e kiwify-sim-checkout.ts')
