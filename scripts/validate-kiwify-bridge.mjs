/**
 * Valida ponte Kiwify ↔ Quantum5G (sem deploy).
 * Uso: node --env-file=.env.local scripts/validate-kiwify-bridge.mjs
 */

import { readFileSync, existsSync } from 'fs'
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

function creds() {
  const clientId = process.env.KIWIFY_CLIENT_ID?.trim() ?? process.env.client_id?.trim()
  const clientSecret =
    process.env.KIWIFY_CLIENT_SECRET?.trim() ??
    process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
  const accountId = process.env.KIWIFY_ACCOUNT_ID?.trim() ?? process.env.account_id?.trim()
  const missing = []
  if (!clientId) missing.push('KIWIFY_CLIENT_ID')
  if (!clientSecret) missing.push('KIWIFY_CLIENT_SECRET')
  if (!accountId) missing.push('KIWIFY_ACCOUNT_ID')
  if (missing.length) {
    console.error('✗ Credenciais ausentes:', missing.join(', '))
    process.exit(1)
  }
  return { clientId, clientSecret, accountId }
}

const base = (process.env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')

async function oauthToken({ clientId, clientSecret }) {
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

async function kiwifyGet(path, token, accountId, query = {}) {
  const url = new URL(`${base}${path}`)
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.set(k, String(v))
  }
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

function maskSecret(s) {
  if (!s || s.length < 8) return '***'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

console.log('==> Validação ponte Kiwify (local, sem deploy)\n')

const { clientId, clientSecret, accountId } = creds()
console.log('Config:')
console.log('  base_url      ', base)
console.log('  client_id     ', clientId)
console.log('  client_secret ', maskSecret(clientSecret))
console.log('  account_id    ', accountId)
console.log()

let ok = true

try {
  console.log('1/4 OAuth /oauth/token …')
  const oauth = await oauthToken({ clientId, clientSecret })
  const scopes = String(oauth.scope ?? '').split(/\s+/).filter(Boolean)
  console.log('✓ Token obtido')
  console.log('  token_type   ', oauth.token_type)
  console.log('  expires_in   ', oauth.expires_in, 's')
  console.log('  scopes       ', scopes.join(', ') || '(vazio)')
  console.log()

  const token = oauth.access_token

  console.log('2/4 GET /account-details …')
  const account = await kiwifyGet('/account-details', token, accountId)
  console.log('✓ Conta:', account.company_name ?? account.id)
  console.log('  store_id     ', account.id)
  if (account.company_cnpj) console.log('  cnpj         ', account.company_cnpj)
  console.log()

  console.log('3/4 GET /products …')
  const products = await kiwifyGet('/products', token, accountId, {
    page_number: 1,
    page_size: 50,
  })
  const productList = products.data ?? []
  console.log('✓ Produtos:', products.pagination?.count ?? productList.length)
  for (const p of productList.slice(0, 5)) {
    console.log(`  · ${p.id?.slice(0, 8)}… ${p.name ?? '(sem nome)'}`)
  }
  if (productList.length > 5) console.log(`  … +${productList.length - 5} produtos`)
  console.log()

  console.log('4/5 GET /webhooks …')
  const webhooks = await kiwifyGet('/webhooks', token, accountId, {
    page_number: 1,
    page_size: 10,
  })
  const hookList = webhooks.data ?? []
  console.log('✓ Webhooks:', webhooks.pagination?.count ?? hookList.length)
  for (const h of hookList) {
    console.log(`  · ${h.name} → ${h.url}`)
    console.log(`    triggers: ${(h.triggers ?? []).join(', ')}`)
  }
  if (hookList.length === 0) {
    console.log('  ⚠ Nenhum webhook — necessário para compra_aprovada → entitlements')
  }
  console.log()

  console.log('5/5 Mapa produtos (config/kiwify-nr01-product-map.json) …')
  const mapPath = join(root, 'config', 'kiwify-nr01-product-map.json')
  let mapReady = 0
  let mapTotal = 0
  if (existsSync(mapPath)) {
    const map = JSON.parse(readFileSync(mapPath, 'utf8'))
    const entries = map.entries ?? []
    mapTotal = entries.length
    mapReady = entries.filter((e) => e.checkout_url?.trim() && e.kiwify_product_id?.trim()).length
    const tiers = new Set(
      entries.filter((e) => e.checkout_url?.trim()).map((e) => e.tier_id),
    )
    console.log(`✓ Mapa: ${mapReady}/${mapTotal} SKUs · ${tiers.size}/15 faixas`)
    if (mapReady < mapTotal) {
      console.log('  ⚠ Rode npm run kiwify:sync-map após criar ofertas na dashboard')
    }
  } else {
    console.log('  ⚠ Arquivo ausente — rode npm run kiwify:setup')
  }
  console.log()

  console.log('── Resumo da ponte ──')
  console.log('  OAuth + account + products + webhooks: OK')
  console.log(`  Mapa checkout: ${mapReady}/${mapTotal} SKUs`)
  console.log('  Checkout Quantum5G ainda: Asaas (Kiwify = após mapa completo)')
  if (productList.length === 0) {
    console.log('  ⚠ Crie produtos NR-01 na Kiwify antes de trocar o checkout')
  }
  const hasApprovedHook = hookList.some((h) =>
    (h.triggers ?? []).includes('compra_aprovada'),
  )
  if (!hasApprovedHook) {
    console.log('  ⚠ Configure webhook compra_aprovada → /api/billing/webhook/kiwify')
  }
} catch (err) {
  ok = false
  console.error('✗ Falha:', err.message)
}

process.exit(ok ? 0 : 1)
