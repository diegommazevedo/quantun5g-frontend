/**
 * Cria produto Kiwify R$10 PIX para simulado 100% real do lead.
 * Atualiza config + product-map + vendas-nr01.
 *
 * Uso: npm run kiwify:sim-lead
 * Se o Edge principal estiver aberto, feche-o antes OU faça login no Edge que abrir.
 */

import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF = join(root, 'scripts', '_edge-kiwify-profile')
const SHOTS = join(root, 'scripts', '_sim')
const OUT = join(root, 'config', 'kiwify-test-product.json')
const MAP = join(root, 'config', 'kiwify-nr01-product-map.json')
const VENDAS_TS = join(root, 'vendas-nr01', 'src', 'constants', 'kiwify-sim-checkout.ts')

const PRODUCT_NAME = 'Quantum5G NR-01 · SIMULADO Lead R$10 PIX'
const PRICE_STR = '10,00'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

mkdirSync(SHOTS, { recursive: true })

let page
async function snap(label) {
  const path = join(SHOTS, `sim_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
  console.log(`📸 ${path}`)
}

async function findByText(text, opts = {}) {
  const { minY = 0, maxY = 9999, preferLast = false } = opts
  return page.evaluate(
    (text, minY, maxY, preferLast) => {
      const xpath = `//*[normalize-space(.)="${text}"]`
      const iter = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
      const items = []
      let n = iter.iterateNext()
      while (n) {
        items.push(n)
        n = iter.iterateNext()
      }
      const visible = items
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { el, r }
        })
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.y >= minY && r.y < maxY)
      if (!visible.length) return null
      const pick = preferLast ? visible[visible.length - 1] : visible[0]
      const { r } = pick
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    },
    text,
    minY,
    maxY,
    preferLast,
  )
}

function upsertMapEntry(productId, checkoutUrl, linkId) {
  const map = JSON.parse(readFileSync(MAP, 'utf8'))
  const entry = {
    tier_id: 't01',
    billing_mode: 'anual_vista',
    include_pentagrama: false,
    kiwify_product_id: productId,
    checkout_url: checkoutUrl,
    kiwify_link_id: linkId,
    label: PRODUCT_NAME,
    sku: 'q5g-nr01-t01-sim-lead-pix',
    price_cents: 1000,
    synced_at: new Date().toISOString(),
    purpose: 'sim_lead_test',
  }
  map.entries = (map.entries ?? []).filter((e) => e.sku !== entry.sku)
  map.entries.push(entry)
  writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n')
}

function writeVendasConstant(checkoutUrl) {
  const ts = `/** Gerado por scripts/kiwify-setup-sim-lead.mjs */\nexport const KIWIFY_SIM_CHECKOUT_URL = '${checkoutUrl}'\nexport const KIWIFY_SIM_PRODUCT_LABEL = '${PRODUCT_NAME}'\n`
  writeFileSync(VENDAS_TS, ts)
}

async function extractCheckoutLink(productId) {
  await page.goto(`https://dashboard.kiwify.com/products/edit/${productId}?tab=links`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await sleep(2500)
  const checkoutUrl = await page.evaluate(() => {
    for (const inp of document.querySelectorAll('input')) {
      if (inp.value?.includes('pay.kiwify.com.br/')) return inp.value.trim()
    }
    const m = document.body.innerText.match(/https?:\/\/pay\.kiwify\.com\.br\/[A-Za-z0-9]+/)
    return m?.[0] ?? null
  })
  return checkoutUrl
}

async function createSimProduct() {
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2500)
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')].filter((b) => /^(fechar|×|✕)$/i.test(b.textContent?.trim())).forEach((b) => b.click())
  }).catch(() => {})
  await sleep(500)

  const criar = await findByText('Criar produto', { maxY: 220 })
  if (!criar) throw new Error('Botão "Criar produto" não encontrado — faça login na Kiwify')
  await snap('before_criar')
  await page.mouse.click(criar.x, criar.y)

  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some((b) => /continuar/i.test(b.textContent?.trim())),
    { timeout: 20_000, polling: 400 },
  )
  await sleep(400)

  await page.evaluate(() => {
    for (const s of document.querySelectorAll('select')) {
      const opt = [...s.options].find((o) => /receber pagamentos/i.test(o.text))
      if (opt) {
        s.value = opt.value
        s.dispatchEvent(new Event('change', { bubbles: true }))
      }
    }
  })
  await sleep(400)

  const cont = await findByText('Continuar', { minY: 80 })
  if (!cont) throw new Error('"Continuar" não encontrado no wizard')
  await page.mouse.click(cont.x, cont.y)
  await sleep(3000)
  await snap('form')

  const fields = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]), textarea')]
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          type: el.type,
          ph: el.placeholder,
          w: Math.round(r.width),
          h: Math.round(r.height),
          x: Math.round(r.x),
          y: Math.round(r.y),
        }
      })
      .filter((f) => f.w > 0 && f.h > 0),
  )
  const sorted = [...fields].sort((a, b) => a.y - b.y)

  const nameField = sorted.find((f) => (f.type === 'text' || f.type === '') && !/buscar|search|https/i.test(f.ph))
  if (!nameField) throw new Error('Campo nome não encontrado')
  await page.mouse.click(nameField.x + nameField.w / 2, nameField.y + nameField.h / 2, { clickCount: 3 })
  await page.keyboard.type(PRODUCT_NAME, { delay: 20 })

  const descField = sorted.find((f) => f.type === 'textarea')
  if (descField) {
    await page.mouse.click(descField.x + descField.w / 2, descField.y + descField.h / 2)
    await page.keyboard.type(
      'Produto de teste para simular compra real (PIX R$10). Ativa licença NR-01 faixa 0–5 colaboradores no Quantum5G.',
      { delay: 12 },
    )
  }

  const priceField = sorted.find((f) => f.type === 'tel' || f.type === 'number' || /preço|valor|R\$/i.test(f.ph))
  if (!priceField) throw new Error('Campo preço não encontrado')
  await page.mouse.click(priceField.x + priceField.w / 2, priceField.y + priceField.h / 2, { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.keyboard.type(PRICE_STR, { delay: 25 })
  await sleep(400)
  await snap('price')

  const save = await findByText('Criar produto', { minY: 300, preferLast: true })
  if (!save) throw new Error('Botão final Criar produto não encontrado')
  await page.mouse.click(save.x, save.y)

  await page.waitForFunction(() => window.location.href.includes('/products/edit/'), {
    timeout: 45_000,
    polling: 500,
  })
  await sleep(800)
  const productId = page.url().match(/([0-9a-f-]{36})/i)?.[1]
  if (!productId) throw new Error('product_id não extraído da URL')
  return productId
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: false,
  defaultViewport: null,
  userDataDir: PROF,
  args: ['--start-maximized', '--no-first-run'],
})
page = await browser.newPage()

try {
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2000)

  if (page.url().includes('/login') || page.url().includes('/verify')) {
    console.log('\n🔐 Faça LOGIN na Kiwify na janela do Edge que abriu.')
    console.log('   Aguardando até 5 minutos...\n')
    for (let i = 0; i < 300; i++) {
      await sleep(1000)
      const u = page.url()
      if (!u.includes('/login') && !u.includes('/verify') && !u.includes('/loading')) {
        await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
        break
      }
    }
  }

  if (page.url().includes('/login')) {
    throw new Error('Login não concluído — execute novamente após entrar na Kiwify')
  }

  console.log('✓ Autenticado')
  const productId = await createSimProduct()
  console.log('✓ Produto criado:', productId)

  const checkoutUrl = await extractCheckoutLink(productId)
  if (!checkoutUrl) throw new Error('Checkout URL não encontrada na aba Links')

  const linkId = checkoutUrl.split('/').pop()
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
    label: PRODUCT_NAME,
  }

  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')
  upsertMapEntry(productId, checkoutUrl, linkId)
  writeVendasConstant(checkoutUrl)

  console.log('\n✅ Simulado configurado')
  console.log('   Checkout PIX:', checkoutUrl)
  console.log('   Página vendas: http://localhost:3001/simulado')
} catch (err) {
  await snap('ERROR')
  console.error('❌', err.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
