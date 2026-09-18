/**
 * Atualiza preço do produto simulado na Kiwify (dashboard → Links → editar checkout).
 * Uso: node --env-file=.env.local scripts/kiwify-update-sim-price.mjs [price_reais]
 */

import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF = process.env.KIWIFY_EDGE_PROFILE?.trim() || join(root, 'scripts', '_edge-sim-copy')
const TEST_PRODUCT = join(root, 'config', 'kiwify-test-product.json')
const MAP = join(root, 'config', 'kiwify-nr01-product-map.json')
const VENDAS_TS = join(root, 'vendas-nr01', 'src', 'constants', 'kiwify-sim-checkout.ts')
const SKU = 'q5g-nr01-t01-sim-lead-pix'

const priceReais = Number(process.argv[2] ?? '5')
if (!Number.isFinite(priceReais) || priceReais <= 0) {
  console.error('Informe preço válido, ex: 5')
  process.exit(1)
}
const priceCents = Math.round(priceReais * 100)
const priceStr = priceReais.toFixed(2).replace('.', ',')
const PRODUCT_LABEL = `Quantum5G NR-01 · SIMULADO Lead R$${priceReais} PIX`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadProductConfig() {
  if (!existsSync(TEST_PRODUCT)) throw new Error('config/kiwify-test-product.json ausente')
  return JSON.parse(readFileSync(TEST_PRODUCT, 'utf8'))
}

function updateLocalConfigs(cfg, checkoutUrl, linkId) {
  const next = {
    ...cfg,
    checkout_url: checkoutUrl,
    kiwify_link_id: linkId,
    price_cents: priceCents,
    label: PRODUCT_LABEL,
    purpose: `sim_lead_R$${priceReais}_pix`,
    updated_at: new Date().toISOString(),
  }
  writeFileSync(TEST_PRODUCT, JSON.stringify(next, null, 2) + '\n')

  const map = JSON.parse(readFileSync(MAP, 'utf8'))
  map.entries = (map.entries ?? []).map((e) =>
    e.sku === SKU
      ? {
          ...e,
          checkout_url: checkoutUrl,
          kiwify_link_id: linkId,
          price_cents: priceCents,
          label: PRODUCT_LABEL,
          synced_at: new Date().toISOString(),
        }
      : e,
  )
  writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n')

  const ts = `/** Gerado por scripts/kiwify-update-sim-price.mjs */\nexport const KIWIFY_SIM_CHECKOUT_URL = '${checkoutUrl}'\nexport const KIWIFY_SIM_PRODUCT_LABEL = '${PRODUCT_LABEL}'\nexport const KIWIFY_SIM_PRICE_CENTS = ${priceCents}\n\nexport function isSimCheckoutReady(): boolean {\n  return Boolean(KIWIFY_SIM_CHECKOUT_URL?.trim())\n}\n`
  writeFileSync(VENDAS_TS, ts)
  return next
}

async function clickSidebarTab(page, name) {
  await page.evaluate((name) => {
    for (const el of document.querySelectorAll('*')) {
      if (el.textContent?.trim() === name && el.children.length === 0) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.y > 100 && r.y < 450) el.click()
      }
    }
  }, name)
  await sleep(2500)
}

async function updatePriceOnDashboard(page, productId, linkId, oldPriceLabel) {
  await page.goto(`https://dashboard.kiwify.com/products/edit/${productId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await sleep(4000)

  await clickSidebarTab(page, 'Links')

  // Abre editor do link checkout (clica no preço ou na linha SIMULADO)
  await page.evaluate((oldPriceLabel) => {
    for (const el of document.querySelectorAll('td, span, div')) {
      const t = el.textContent?.trim() ?? ''
      if (t === oldPriceLabel && el.children.length === 0) {
        el.click()
        return
      }
    }
    for (const el of document.querySelectorAll('*')) {
      if (/SIMULADO Lead R\$10/i.test(el.textContent ?? '') && el.children.length === 0) {
        el.click()
        return
      }
    }
  }, `R$ ${priceReais === 5 ? '10,00' : `${priceReais},00`}`.replace('5,00', '10,00'))
  await sleep(2000)

  const edited = await page.evaluate(({ priceStr, PRODUCT_LABEL }) => {
    let priceOk = false
    let nameOk = false
    for (const inp of document.querySelectorAll('input[type="tel"]')) {
      const v = (inp.value ?? '').trim()
      if (/^\d{1,3},\d{2}$/.test(v) && v !== '0,00') {
        inp.focus()
        inp.value = priceStr
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        inp.dispatchEvent(new Event('change', { bubbles: true }))
        priceOk = true
        break
      }
    }
    for (const inp of document.querySelectorAll('input[type="text"]')) {
      if (/SIMULADO Lead R\$/i.test(inp.value ?? '')) {
        inp.focus()
        inp.value = PRODUCT_LABEL
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        nameOk = true
      }
    }
    for (const b of document.querySelectorAll('button')) {
      const t = b.textContent?.trim() ?? ''
      if (/^salvar$|^confirmar$|^atualizar$/i.test(t)) {
        b.click()
        return { priceOk, nameOk, saved: t }
      }
    }
    return { priceOk, nameOk, saved: null }
  }, { priceStr, PRODUCT_LABEL })

  await sleep(2500)

  // Salvar produto
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      if (/salvar produto/i.test(b.textContent?.trim() ?? '')) {
        b.scrollIntoView({ block: 'center' })
        b.click()
      }
    }
  })
  await sleep(3500)

  return edited
}

const cfg = loadProductConfig()
const productId = cfg.kiwify_product_id
const linkId = cfg.kiwify_link_id
const checkoutUrl = cfg.checkout_url

console.log(`Atualizando ${productId} → R$ ${priceStr} (${priceCents} centavos)`)

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: false,
  userDataDir: PROF,
  args: ['--no-sandbox'],
  defaultViewport: { width: 1400, height: 900 },
})
const page = (await browser.pages())[0] ?? (await browser.newPage())

let edited = { priceOk: false, nameOk: false }
try {
  edited = await updatePriceOnDashboard(page, productId, linkId, 'R$ 10,00')
  updateLocalConfigs(cfg, checkoutUrl, linkId)
  console.log('Edição dashboard:', edited)
} finally {
  await browser.close()
}

const base = (process.env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')
const secret = process.env.KIWIFY_CLIENT_SECRET?.trim() ?? process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
const oauth = await (
  await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.KIWIFY_CLIENT_ID, client_secret: secret }),
  })
).json()
const prod = await (
  await fetch(`${base}/products/${productId}`, {
    headers: {
      Authorization: `Bearer ${oauth.access_token}`,
      'x-kiwify-account-id': process.env.KIWIFY_ACCOUNT_ID,
      Accept: 'application/json',
    },
  })
).json()
const link = (prod.links ?? []).find((l) => l.id === linkId)
console.log('\nAPI Kiwify:')
console.log('  product.price:', prod.price, '| name:', prod.name)
console.log('  link.price:', link?.price)
if (prod.price === priceCents || link?.price === priceCents) {
  console.log('✓ Preço confirmado na API Kiwify')
} else {
  console.warn('⚠ API ainda não reflete o novo preço — configs locais OK para deploy de teste')
}

console.log('\n✓ Configs locais:')
console.log('  checkout:', checkoutUrl)
console.log('  label:', PRODUCT_LABEL)
console.log('  price_cents:', priceCents)
