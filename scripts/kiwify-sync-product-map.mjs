/**
 * Sincroniza config/kiwify-nr01-product-map.json a partir da API Kiwify.
 *
 * Fluxo esperado na dashboard (por faixa t01–t15):
 *   1. Criar 1 produto base: "Quantum5G NR-01 · {faixa}" (preço parcelado base)
 *   2. Em Preços → adicionar ofertas: à vista −10%, + Pentagrama parcelado, + Pentagrama à vista
 *   3. Cada oferta gera um link em Links — este script casa preço ↔ SKU
 *
 * Uso:
 *   node --env-file=.env.local scripts/kiwify-sync-product-map.mjs
 *   node --env-file=.env.local scripts/kiwify-sync-product-map.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

const TIERS = [
  { id: 't01', label: '0–5 trabalhadores' },
  { id: 't02', label: '6–10 trabalhadores' },
  { id: 't03', label: '11–15 trabalhadores' },
  { id: 't04', label: '16–20 trabalhadores' },
  { id: 't05', label: '21–30 trabalhadores' },
  { id: 't06', label: '31–40 trabalhadores' },
  { id: 't07', label: '41–50 trabalhadores' },
  { id: 't08', label: '51–60 trabalhadores' },
  { id: 't09', label: '61–80 trabalhadores' },
  { id: 't10', label: '81–100 trabalhadores' },
  { id: 't11', label: '101–200 trabalhadores' },
  { id: 't12', label: '201–300 trabalhadores' },
  { id: 't13', label: '301–500 trabalhadores' },
  { id: 't14', label: '501–750 trabalhadores' },
  { id: 't15', label: '751–1.000 trabalhadores' },
]

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
const clientId = process.env.KIWIFY_CLIENT_ID?.trim()
const clientSecret =
  process.env.KIWIFY_CLIENT_SECRET?.trim() ?? process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
const accountId = process.env.KIWIFY_ACCOUNT_ID?.trim()

if (!clientId || !clientSecret || !accountId) {
  console.error('Faltam KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID')
  process.exit(1)
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
  return JSON.parse(text).access_token
}

async function kiwifyGet(path, token, query = {}) {
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

async function listAllProducts(token) {
  const all = []
  let page = 1
  const pageSize = 50
  while (true) {
    const res = await kiwifyGet('/products', token, { page_number: page, page_size: pageSize })
    const batch = res.data ?? []
    all.push(...batch)
    const total = res.pagination?.count ?? all.length
    if (all.length >= total || batch.length < pageSize) break
    page++
  }
  return all
}

function brl(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function tierFromProductName(name) {
  const n = String(name ?? '')
  if (!n.includes('Quantum5G') && !n.includes('NR-01') && !n.includes('NR01')) return null
  if (/pentagrama|ginger|à vista|a vista/i.test(n)) return null
  for (const t of TIERS) {
    if (n.includes(t.label)) return t.id
  }
  return null
}

function collectCheckoutCandidates(product) {
  const candidates = []
  const linksByPrice = new Map()

  for (const link of product.links ?? []) {
    if (link.is_sales_page || link.status !== 'active') continue
    const price = Number(link.price ?? product.price ?? 0)
    const item = {
      kind: 'link',
      linkId: link.id,
      offerId: null,
      price,
      name: String(link.custom_name ?? ''),
      checkoutUrl: `https://pay.kiwify.com.br/${link.id}`,
    }
    candidates.push(item)
    if (!linksByPrice.has(price)) linksByPrice.set(price, [])
    linksByPrice.get(price).push(item)
  }

  for (const offer of product.offers ?? []) {
    if (offer.active === false) continue
    const price = Number(offer.price ?? 0)
    const linked = linksByPrice.get(price)?.[0]
    candidates.push({
      kind: linked ? 'link' : 'offer',
      linkId: linked?.linkId ?? null,
      offerId: offer.id,
      price,
      name: String(offer.name ?? ''),
      checkoutUrl: linked?.checkoutUrl ?? null,
    })
  }

  return candidates
}

function scoreCandidateForEntry(candidate, entry) {
  let score = 0
  const name = candidate.name.toLowerCase()
  const label = String(entry.label ?? '').toLowerCase()

  if (candidate.price === entry.price_cents) score += 100
  else if (Math.abs(candidate.price - entry.price_cents) <= 100) score += 80

  if (entry.include_pentagrama) {
    if (/pentagrama|ginger/.test(name) || /pentagrama|ginger/.test(label)) score += 30
    else score -= 20
  } else if (/pentagrama|ginger/.test(name)) {
    score -= 40
  }

  if (entry.billing_mode === 'anual_vista') {
    if (/vista|à vista|a vista/.test(name) || /vista/.test(label)) score += 25
  } else if (/vista|à vista|a vista/.test(name)) {
    score -= 15
  }

  if (entry.billing_mode === 'anual_parcelado' && !entry.include_pentagrama) {
    if (!/pentagrama|ginger|vista|à vista/.test(name)) score += 10
  }

  return score
}

function pickCandidate(candidates, entry, usedLinkIds) {
  const ranked = candidates
    .filter((c) => c.checkoutUrl && (!c.linkId || !usedLinkIds.has(c.linkId)))
    .map((c) => ({ c, score: scoreCandidateForEntry(c, entry) }))
    .filter((x) => x.score >= 80)
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.c ?? null
}

function loadManifestBySku() {
  const path = join(root, 'config', 'kiwify-nr01-catalog-manifest.json')
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const map = new Map()
  for (const p of raw.products ?? []) {
    map.set(p.sku, p)
  }
  return map
}

console.log(`==> Kiwify sync product-map${dryRun ? ' (dry-run)' : ''}\n`)

const token = await oauthToken()
console.log('✓ OAuth OK\n')

const manifestBySku = loadManifestBySku()
const mapPath = join(root, 'config', 'kiwify-nr01-product-map.json')
const mapFile = JSON.parse(readFileSync(mapPath, 'utf8'))
const entries = mapFile.entries ?? []

const productList = await listAllProducts(token)
console.log(`Produtos na conta: ${productList.length}\n`)

const syncedAt = new Date().toISOString()
let filled = 0
let skipped = 0
let pending = 0
const report = []

for (const summary of productList) {
  const tierId = tierFromProductName(summary.name)
  if (!tierId) {
    report.push({ product: summary.name, status: 'ignorado', reason: 'nome não mapeia faixa NR-01' })
    continue
  }

  const product = await kiwifyGet(`/products/${encodeURIComponent(summary.id)}`, token)
  const candidates = collectCheckoutCandidates(product)
  const tierEntries = entries.filter((e) => e.tier_id === tierId)
  const usedLinkIds = new Set()

  console.log(`── ${tierId} · ${product.name}`)
  console.log(`   id: ${product.id}`)
  console.log(`   links checkout: ${candidates.filter((c) => c.checkoutUrl).length} · ofertas API: ${(product.offers ?? []).length}`)

  for (const entry of tierEntries) {
    const manifest = manifestBySku.get(entry.sku)
    if (!manifest) continue

    entry.price_cents = manifest.price_cents

    const candidate = pickCandidate(candidates, { ...entry, price_cents: manifest.price_cents }, usedLinkIds)

    if (candidate) {
      entry.kiwify_product_id = product.id
      entry.kiwify_link_id = candidate.linkId ?? ''
      entry.kiwify_offer_id = candidate.offerId ?? ''
      entry.checkout_url = candidate.checkoutUrl
      entry.synced_at = syncedAt
      if (candidate.linkId) usedLinkIds.add(candidate.linkId)
      filled++
      console.log(`   ✓ ${entry.sku}`)
      console.log(`     ${brl(manifest.price_cents)} → ${entry.checkout_url}`)
    } else if (entry.kiwify_product_id && entry.checkout_url) {
      skipped++
      console.log(`   · ${entry.sku} — mantido (${entry.checkout_url})`)
    } else {
      pending++
      console.log(`   ⚠ ${entry.sku} — pendente (${brl(manifest.price_cents)})`)
      console.log(`     Crie oferta na dashboard com este preço; rode sync de novo.`)
    }
  }
  console.log()
}

if (!dryRun) {
  mapFile.synced_at = syncedAt
  mapFile._comment =
    'Preenchido via npm run kiwify:sync-map após cadastro mínimo + ofertas na dashboard Kiwify'
  writeFileSync(mapPath, JSON.stringify(mapFile, null, 2) + '\n', 'utf8')
  console.log(`✓ Gravado ${mapPath}`)
} else {
  console.log('(dry-run — arquivo não alterado)')
}

const ready = entries.filter((e) => e.checkout_url?.trim() && e.kiwify_product_id?.trim())
const tiersReady = new Set(ready.map((e) => e.tier_id))

console.log('\n── Resumo ──')
console.log(`  Entradas preenchidas nesta execução: ${filled}`)
console.log(`  Mantidas (já OK): ${skipped}`)
console.log(`  Pendentes (criar oferta): ${pending}`)
console.log(`  Total mapa pronto: ${ready.length}/${entries.length}`)
console.log(`  Faixas com ≥1 link: ${tiersReady.size}/15`)

if (pending > 0) {
  console.log('\nOfertas pendentes por faixa — na Kiwify, aba Geral → Preços:')
  for (const e of entries.filter((x) => !x.checkout_url?.trim())) {
    const m = manifestBySku.get(e.sku)
    if (!m) continue
    console.log(`  · ${e.tier_id} ${e.billing_mode}${e.include_pentagrama ? ' +Pentagrama' : ''}: ${m.name} (${m.price_brl})`)
  }
}

process.exit(pending > 0 && filled === 0 && ready.length === 0 ? 1 : 0)

