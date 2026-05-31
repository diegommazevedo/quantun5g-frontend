/**
 * Setup Kiwify: manifesto de produtos + registro de webhook (passos 1–2).
 * Uso: node --env-file=.env.local scripts/kiwify-setup.mjs
 *
 * Não faz deploy. Grava manifest em config/ e imprime KIWIFY_WEBHOOK_TOKEN.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvLocal() {
  const envPath = join(root, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const base = (process.env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')
const clientId = process.env.KIWIFY_CLIENT_ID?.trim() ?? process.env.client_id?.trim()
const clientSecret =
  process.env.KIWIFY_CLIENT_SECRET?.trim() ??
  process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
const accountId = process.env.KIWIFY_ACCOUNT_ID?.trim() ?? process.env.account_id?.trim()
const appUrl = (
  process.env.KIWIFY_WEBHOOK_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://www.quantun5g.app'
).replace(/\/$/, '')

if (!clientId || !clientSecret || !accountId) {
  console.error('Faltam KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID')
  process.exit(1)
}

/** Preços NR-01 t01–t15 (centavos, parcelado) — espelho do catálogo. */
const TIERS = [
  { id: 't01', label: '0–5 trabalhadores', min: 0, max: 5, parcelado: 246000, vista: 221400 },
  { id: 't02', label: '6–10 trabalhadores', min: 6, max: 10, parcelado: 362400, vista: 326160 },
  { id: 't03', label: '11–15 trabalhadores', min: 11, max: 15, parcelado: 421200, vista: 379080 },
  { id: 't04', label: '16–20 trabalhadores', min: 16, max: 20, parcelado: 480000, vista: 432000 },
  { id: 't05', label: '21–30 trabalhadores', min: 21, max: 30, parcelado: 573600, vista: 516240 },
  { id: 't06', label: '31–40 trabalhadores', min: 31, max: 40, parcelado: 655200, vista: 589680 },
  { id: 't07', label: '41–50 trabalhadores', min: 41, max: 50, parcelado: 736800, vista: 663120 },
  { id: 't08', label: '51–60 trabalhadores', min: 51, max: 60, parcelado: 807600, vista: 726840 },
  { id: 't09', label: '61–80 trabalhadores', min: 61, max: 80, parcelado: 960000, vista: 864000 },
  { id: 't10', label: '81–100 trabalhadores', min: 81, max: 100, parcelado: 1100400, vista: 990360 },
  { id: 't11', label: '101–200 trabalhadores', min: 101, max: 200, parcelado: 1755600, vista: 1580040 },
  { id: 't12', label: '201–300 trabalhadores', min: 201, max: 300, parcelado: 2281200, vista: 2053080 },
  { id: 't13', label: '301–500 trabalhadores', min: 301, max: 500, parcelado: 3042000, vista: 2737800 },
  { id: 't14', label: '501–750 trabalhadores', min: 501, max: 750, parcelado: 3978000, vista: 3580200 },
  { id: 't15', label: '751–1.000 trabalhadores', min: 751, max: 1000, parcelado: 4914000, vista: 4422600 },
]

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function oauthToken() {
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret })
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`OAuth ${res.status}: ${text}`)
  return JSON.parse(text)
}

async function kiwifyGet(path, token, query = {}) {
  const url = new URL(`${base}${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': accountId,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`)
  return text ? JSON.parse(text) : {}
}

async function kiwifyDelete(path, token) {
  const res = await fetch(`${base}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': accountId,
      Accept: 'application/json',
    },
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`${path} ${res.status}: ${text}`)
  }
}

async function kiwifyPut(path, token, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': accountId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`)
  return JSON.parse(text)
}

async function kiwifyPost(path, token, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': accountId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`)
  return JSON.parse(text)
}

function buildManifest() {
  const products = []
  for (const t of TIERS) {
    products.push({
      sku: `q5g-nr01-${t.id}-anual_parcelado-base`,
      tier_id: t.id,
      billing_mode: 'anual_parcelado',
      include_pentagrama: false,
      name: `Quantum5G NR-01 · ${t.label}`,
      price_brl: brl(t.parcelado),
      price_cents: t.parcelado,
      installments: 12,
      installment_brl: brl(Math.round(t.parcelado / 12)),
      dashboard_instructions:
        'Produto assinatura anual · 12× cartão · área de membros opcional (acesso via Quantum5G)',
    })
    products.push({
      sku: `q5g-nr01-${t.id}-anual_vista-base`,
      tier_id: t.id,
      billing_mode: 'anual_vista',
      include_pentagrama: false,
      name: `Quantum5G NR-01 · ${t.label} (à vista −10%)`,
      price_brl: brl(t.vista),
      price_cents: t.vista,
      dashboard_instructions: 'Pagamento único anual · desconto 10%',
    })
    const gingerParcelado = Math.round(t.parcelado * 1.5)
    const gingerVista = Math.round(t.vista * 1.5)
    products.push({
      sku: `q5g-nr01-${t.id}-anual_parcelado-com_ginger`,
      tier_id: t.id,
      billing_mode: 'anual_parcelado',
      include_pentagrama: true,
      name: `Quantum5G NR-01 + Pentagrama · ${t.label}`,
      price_brl: brl(gingerParcelado),
      price_cents: gingerParcelado,
      dashboard_instructions: 'Base + 50% Pentagrama de Ginger',
    })
    products.push({
      sku: `q5g-nr01-${t.id}-anual_vista-com_ginger`,
      tier_id: t.id,
      billing_mode: 'anual_vista',
      include_pentagrama: true,
      name: `Quantum5G NR-01 + Pentagrama · ${t.label} (à vista)`,
      price_brl: brl(gingerVista),
      price_cents: gingerVista,
    })
  }
  return {
    generated_at: new Date().toISOString(),
    note: 'API Kiwify não expõe POST /products — criar manualmente na dashboard e preencher config/kiwify-nr01-product-map.json',
    products,
  }
}

function buildMapTemplate(manifest) {
  return {
    _comment: 'Preencher kiwify_product_id e checkout_url após criar cada produto na Kiwify',
    entries: manifest.products.map((p) => ({
      tier_id: p.tier_id,
      billing_mode: p.billing_mode,
      include_pentagrama: p.include_pentagrama,
      kiwify_product_id: '',
      kiwify_link_id: '',
      kiwify_offer_id: '',
      checkout_url: '',
      price_cents: p.price_cents,
      label: p.name,
      sku: p.sku,
    })),
  }
}

console.log('==> Kiwify setup (manifest + webhook)\n')

const oauth = await oauthToken()
const token = oauth.access_token
console.log('✓ OAuth OK\n')

const manifestPath = join(root, 'config', 'kiwify-nr01-catalog-manifest.json')
const manifest = buildManifest()
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`✓ Manifesto ${manifest.products.length} SKUs → config/kiwify-nr01-catalog-manifest.json`)

const mapPath = join(root, 'config', 'kiwify-nr01-product-map.json')
const existingMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : null
if (!existingMap?.entries?.length) {
  writeFileSync(mapPath, JSON.stringify(buildMapTemplate(manifest), null, 2), 'utf8')
  console.log('✓ Template mapa → config/kiwify-nr01-product-map.json (preencher URLs)')
} else {
  console.log('· Mapa existente preservado (entries preenchidas)')
}

const webhookToken =
  process.env.KIWIFY_WEBHOOK_TOKEN?.trim() ?? randomBytes(24).toString('hex')
const webhookUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/billing/webhook/kiwify?token=${webhookToken}`

const existingHooks = await kiwifyGet('/webhooks', token, { page_number: 1, page_size: 20 })
const hooks = existingHooks.data ?? []
const targetName = 'Quantum5G NR-01 Produção'
const already = hooks.find((h) => h.name === targetName || h.url?.includes('/api/billing/webhook/kiwify'))

let webhookResult
if (already) {
  const prodUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/billing/webhook/kiwify?token=${webhookToken}`
  if (already.url !== prodUrl) {
    try {
      webhookResult = await kiwifyPut(`/webhooks/${already.id}`, token, {
        name: targetName,
        url: prodUrl,
        products: already.products ?? 'all',
        triggers: already.triggers ?? [
          'compra_aprovada',
          'compra_reembolsada',
          'subscription_canceled',
          'subscription_renewed',
        ],
        token: webhookToken,
      })
      console.log(`\n✓ Webhook atualizado (URL produção): ${webhookResult.id}`)
    } catch (err) {
      console.warn(`\n⚠ PUT webhook falhou (${err.message}) — recriando…`)
      await kiwifyDelete(`/webhooks/${already.id}`, token)
      webhookResult = await kiwifyPost('/webhooks', token, {
        name: targetName,
        url: prodUrl,
        products: 'all',
        triggers: [
          'compra_aprovada',
          'compra_reembolsada',
          'subscription_canceled',
          'subscription_renewed',
        ],
        token: webhookToken,
      })
      console.log(`\n✓ Webhook recriado: ${webhookResult.id}`)
    }
  } else {
    webhookResult = already
    console.log(`\n✓ Webhook já existe: ${already.id}`)
  }
  console.log(`  url: ${webhookResult.url ?? prodUrl}`)
} else {
  webhookResult = await kiwifyPost('/webhooks', token, {
    name: targetName,
    url: webhookUrl,
    products: 'all',
    triggers: [
      'compra_aprovada',
      'compra_reembolsada',
      'subscription_canceled',
      'subscription_renewed',
    ],
    token: webhookToken,
  })
  console.log(`\n✓ Webhook criado: ${webhookResult.id}`)
  console.log(`  url: ${webhookResult.url}`)
}

console.log('\n── Adicione ao .env.local e Vercel ──')
console.log(`KIWIFY_WEBHOOK_TOKEN=${webhookToken}`)
console.log('# BILLING_PROVIDER=kiwify  # só após preencher product-map')
console.log('\n── Próximo passo manual (dashboard Kiwify) ──')
console.log('1. Por faixa (t01–t15): 1 produto base + 3 ofertas (vista, +Pentagrama parcelado/vista)')
console.log('   Referência de preços: config/kiwify-nr01-catalog-manifest.json')
console.log('2. npm run kiwify:sync-map  → preenche config/kiwify-nr01-product-map.json via API')
console.log('3. npm run kiwify:validate && BILLING_PROVIDER=kiwify em produção')

const products = await kiwifyGet('/products', token, { page_number: 1, page_size: 5 })
console.log(`\nProdutos na conta: ${products.pagination?.count ?? 0}`)
