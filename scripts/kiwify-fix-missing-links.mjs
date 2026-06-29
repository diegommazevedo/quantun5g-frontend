/**
 * FIX — Salva os 4 produtos sem link e reextrai. Recria t13 PIX.
 */
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root    = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE    = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF    = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS   = join(root, 'scripts')
const MAPFILE = join(root, 'config', 'kiwify-nr01-product-map.json')
const sleep   = ms => new Promise(r => setTimeout(r, ms))

function annualVistaCents(p) { return Math.round(p * 0.9 / 12) * 12 }
function brl(c) { return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

let page

async function snap(label) {
  const path = join(SHOTS, `_fix_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
}

async function findByText(text, { minY = 0, maxY = 9999, preferLast = false } = {}) {
  return page.evaluate((text, minY, maxY, preferLast) => {
    const xpath = `//*[normalize-space(.)="${text}"]`
    const iter = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    const items = []
    let n = iter.iterateNext()
    while (n) { items.push(n); n = iter.iterateNext() }
    const visible = items
      .map(el => { const r = el.getBoundingClientRect(); return { el, r } })
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.y >= minY && r.y < maxY)
    if (!visible.length) return null
    const pick = preferLast ? visible[visible.length - 1] : visible[0]
    const { r } = pick
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height, tag: pick.el.tagName }
  }, text, minY, maxY, preferLast)
}

function loadMap() { return JSON.parse(readFileSync(MAPFILE, 'utf8')) }
function saveMap(m) { writeFileSync(MAPFILE, JSON.stringify(m, null, 2)); console.log('  💾  product-map.json salvo') }

async function extractCheckoutLink(productId, label) {
  await page.goto(
    `https://dashboard.kiwify.com/products/edit/${productId}?tab=links`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 }
  )
  await sleep(3000)
  await snap(`${label}_links`)

  const checkoutUrl = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="text"], input:not([type])')]
    for (const inp of inputs) {
      if (inp.value?.includes('pay.kiwify.com.br/')) return inp.value.trim()
    }
    const nodes = [...document.querySelectorAll('*')]
    for (const el of nodes) {
      const txt = el.textContent?.trim()
      if (txt?.match(/^https:\/\/pay\.kiwify\.com\.br\/[A-Za-z0-9]+$/)) return txt
    }
    return null
  })

  if (checkoutUrl) {
    const linkId = checkoutUrl.replace('https://pay.kiwify.com.br/', '')
    console.log(`  ✓  ${label}  ${checkoutUrl}`)
    return { checkoutUrl, linkId }
  }
  console.log(`  ✗  ${label}  nenhuma URL encontrada`)
  return null
}

async function saveProductAndExtract(productId, label) {
  // Navega para o produto (Geral tab)
  await page.goto(
    `https://dashboard.kiwify.com/products/edit/${productId}`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 }
  )
  await sleep(2500)
  await snap(`${label}_geral`)

  // Clica "Salvar produto" (força geração/regeneração de checkout link)
  const saveBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const visible = btns.filter(b => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && b.textContent?.trim() === 'Salvar produto'
    })
    if (!visible.length) return null
    const last = visible[visible.length - 1]
    const r = last.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })
  if (!saveBtn) { console.log(`  ⚠  ${label}  botão "Salvar produto" não encontrado`); return null }

  console.log(`  🖱  Clicando "Salvar produto" em (${saveBtn.x},${saveBtn.y})`)
  await snap(`${label}_before_save`)
  await page.mouse.click(saveBtn.x, saveBtn.y)
  await sleep(4000)
  await snap(`${label}_after_save`)

  // Verifica Links tab
  return await extractCheckoutLink(productId, label)
}

// ─── Cria produto PIX t13 ─────────────────────────────────────────────────────
async function createPixT13() {
  const tier = { id: 't13', label: '301–500 trabalhadores', priceCents: 3_042_000 }
  const name     = `Quantum5G NR-01 · ${tier.label} PIX`
  const pixCents = annualVistaCents(tier.priceCents)
  const priceStr = (pixCents / 100).toFixed(2).replace('.', ',')
  console.log(`\n  ▶  Recria PIX t13  ${name}  ${brl(pixCents)}`)

  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2500)
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].filter(b => /^(fechar|×|✕)$/i.test(b.textContent?.trim())).forEach(b => b.click())
  }).catch(() => {})
  await sleep(600)

  const criarCoords = await findByText('Criar produto', { maxY: 200 })
  if (!criarCoords) throw new Error('"Criar produto" não encontrado')
  await page.mouse.click(criarCoords.x, criarCoords.y)

  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some(b => /continuar/i.test(b.textContent?.trim())),
    { timeout: 15_000, polling: 400 }
  )
  await sleep(400)

  await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')]
    for (const s of selects) {
      const opt = [...s.options].find(o => /receber pagamentos/i.test(o.text))
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change',{bubbles:true})) }
    }
  })
  await sleep(400)

  const contCoords = await findByText('Continuar', { minY: 100 })
  if (!contCoords) throw new Error('"Continuar" não encontrado')
  await page.mouse.click(contCoords.x, contCoords.y)
  await sleep(3000)
  await snap('t13pix_form')

  const visFields = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea')]
      .map(el => { const r = el.getBoundingClientRect(); return { type: el.type, ph: el.placeholder, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) } })
      .filter(f => f.w > 0 && f.h > 0)
  )
  const sortedByY = [...visFields].sort((a, b) => a.y - b.y)

  const nameField = sortedByY.find(f => (f.type === 'text' || f.type === '') && !/buscar|search|https/i.test(f.ph))
  if (nameField) {
    await page.mouse.click(nameField.x + nameField.w/2, nameField.y + nameField.h/2, { clickCount: 3 })
    await sleep(100); await page.keyboard.type(name, { delay: 25 })
  }

  const descField = sortedByY.find(f => f.type === 'textarea')
  if (descField) {
    const descText = `Diagnóstico de Fatores de Risco Psicossocial (FRPRT) conforme NR-01/GRO (Portarias MTE 1.419/2024 e 765/2025). Válido para empresas com ${tier.label}. Pagamento à vista via PIX com 10% de desconto. Inclui acesso ao módulo Pentagrama de Ginger como bônus.`
    await page.mouse.click(descField.x + descField.w/2, descField.y + descField.h/2)
    await sleep(100); await page.keyboard.type(descText, { delay: 15 })
  }

  const urlField = sortedByY.find(f => f.type === 'text' && /https/i.test(f.ph))
  if (urlField) {
    await page.mouse.click(urlField.x + urlField.w/2, urlField.y + urlField.h/2, { clickCount: 3 })
    await sleep(100); await page.keyboard.type('https://quantum5g.com.br', { delay: 20 })
  }

  const priceField = sortedByY.find(f => f.type === 'tel' || f.type === 'number')
  if (priceField) {
    await page.mouse.click(priceField.x + priceField.w/2, priceField.y + priceField.h/2, { clickCount: 3 })
    await sleep(150)
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control')
    await page.keyboard.press('Backspace')
    await page.keyboard.type(priceStr, { delay: 25 })
    await sleep(300)
  }

  const saveCoords = await findByText('Criar produto', { minY: 350, preferLast: true })
  if (!saveCoords) throw new Error('Botão salvar não encontrado')
  await page.mouse.click(saveCoords.x, saveCoords.y)
  await page.waitForFunction(() => window.location.href.includes('/products/edit/'), { timeout: 30_000, polling: 500 }).catch(() => {})
  await sleep(500)

  const productId = page.url().match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1] ?? null
  if (productId) console.log(`  ✓  t13 PIX product_id: ${productId}`)
  return productId
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF, args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
})
page = await browser.newPage()

try {
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2500)
  console.log('✓  Autenticado —', page.url())

  const map = loadMap()

  // ─── Fix 4 parcelado sem link ─────────────────────────────────────────────
  const fixes = [
    { tier_id: 't02', kiwify_product_id: '47f5ead0-701c-11f1-805b-4385727a028b' },
    { tier_id: 't03', kiwify_product_id: '5818ede0-701c-11f1-99e3-537c6b0626c2' },
    { tier_id: 't11', kiwify_product_id: 'cf9d6530-701c-11f1-bde4-03b0c4769c2b' },
    { tier_id: 't13', kiwify_product_id: 'f30348f0-701c-11f1-9163-b37a1993913c' },
  ]

  console.log('\n════ FIX — Tenta gerar links via Salvar produto ════')
  for (const fix of fixes) {
    const entry = map.entries.find(e => e.tier_id === fix.tier_id && e.billing_mode === 'anual_parcelado')
    if (!entry) continue
    const result = await saveProductAndExtract(fix.kiwify_product_id, fix.tier_id)
    if (result) {
      entry.checkout_url = result.checkoutUrl
      entry.kiwify_link_id = result.linkId
      entry.synced_at = new Date().toISOString()
    }
  }
  saveMap(map)

  // ─── Cria t13 PIX ─────────────────────────────────────────────────────────
  console.log('\n════ FIX — Cria t13 PIX ════')
  const t13PixExists = map.entries.some(e => e.tier_id === 't13' && e.billing_mode === 'anual_vista' && e.kiwify_product_id)
  if (!t13PixExists) {
    try {
      const productId = await createPixT13()
      if (productId) {
        const result = await extractCheckoutLink(productId, 't13_pix')
        if (result) {
          map.entries.push({
            tier_id: 't13',
            billing_mode: 'anual_vista',
            include_pentagrama: false,
            kiwify_product_id: productId,
            checkout_url: result.checkoutUrl,
            kiwify_link_id: result.linkId,
            label: 'Quantum5G NR-01 · 301–500 trabalhadores (PIX −10%)',
            sku: 'q5g-nr01-t13-anual_vista-base',
            price_cents: annualVistaCents(3_042_000),
            synced_at: new Date().toISOString(),
          })
          saveMap(map)
        }
      }
    } catch (err) {
      console.error('  ❌  t13 PIX:', err.message)
      await snap('t13pix_ERROR').catch(() => {})
    }
  } else {
    console.log('  ⏭  t13 PIX já existe')
  }

  // ─── Resumo ─────────────────────────────────────────────────────────────────
  const parceladoOk = map.entries.filter(e => e.billing_mode === 'anual_parcelado' && e.checkout_url?.trim()).length
  const pixOk       = map.entries.filter(e => e.billing_mode === 'anual_vista'     && e.checkout_url?.trim()).length
  console.log(`\n══ Resumo ══`)
  console.log(`anual_parcelado : ${parceladoOk}/15`)
  console.log(`anual_vista PIX : ${pixOk}/15`)

} finally {
  await browser.close()
}
