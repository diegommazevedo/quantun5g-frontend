/**
 * QUANTUM5G — Sincroniza checkout links Kiwify + cria 15 produtos PIX à vista.
 *
 * FASE 1 — Lê os checkout links auto-gerados de cada produto existente (t01–t15)
 *          e preenche checkout_url + kiwify_link_id no product-map.json.
 *
 * FASE 2 — Cria 15 novos produtos Kiwify com preço = annualVistaCents (PIX −10%)
 *          e insere entradas billing_mode:"anual_vista" no product-map.json.
 */

import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root   = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE   = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF   = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS  = join(root, 'scripts')
const MAPFILE = join(root, 'config', 'kiwify-nr01-product-map.json')

const sleep = ms => new Promise(r => setTimeout(r, ms))
function brl(c) { return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

/** Fórmula PIX: 10% de desconto, arredondado a múltiplo de 12 */
function annualVistaCents(p) { return Math.round(p * 0.9 / 12) * 12 }

let page

async function snap(label) {
  const path = join(SHOTS, `_offer_${label}.png`)
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

// ─── Lê product-map.json ────────────────────────────────────────────────────
function loadMap() {
  return JSON.parse(readFileSync(MAPFILE, 'utf8'))
}
function saveMap(map) {
  writeFileSync(MAPFILE, JSON.stringify(map, null, 2))
  console.log('  💾  product-map.json salvo')
}

// ═══════════════════════════════════════════════════════════════════════════════
// FASE 1 — Extrai checkout URLs dos produtos existentes
// ═══════════════════════════════════════════════════════════════════════════════
async function extractCheckoutLink(productId, tierId) {
  // Navega para aba Links diretamente via URL param
  await page.goto(
    `https://dashboard.kiwify.com/products/edit/${productId}?tab=links`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 }
  )
  await sleep(2500)
  await snap(`${tierId}_links`)

  // Extrai o URL do link tipo "Checkout" da tabela
  const checkoutUrl = await page.evaluate(() => {
    // Procura todos os inputs que contenham pay.kiwify.com.br
    const inputs = [...document.querySelectorAll('input[type="text"], input:not([type])')]
    for (const inp of inputs) {
      if (inp.value?.includes('pay.kiwify.com.br/')) return inp.value.trim()
    }
    // Fallback: procura em qualquer lugar do DOM
    const spans = [...document.querySelectorAll('span, div, p, a')]
    for (const el of spans) {
      const txt = el.textContent?.trim()
      if (txt?.match(/^https:\/\/pay\.kiwify\.com\.br\/[A-Za-z0-9]+$/)) return txt
    }
    return null
  })

  if (checkoutUrl) {
    const linkId = checkoutUrl.replace('https://pay.kiwify.com.br/', '')
    console.log(`  ✓  ${tierId}  ${checkoutUrl}  (${linkId})`)
    return { checkoutUrl, linkId }
  } else {
    console.log(`  ⚠  ${tierId}  checkout URL não encontrada — veja screenshot _offer_${tierId}_links.png`)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FASE 2 — Cria produto PIX (reutiliza a lógica do kiwify-create-products.mjs)
// ═══════════════════════════════════════════════════════════════════════════════
async function createPixProduct(tier) {
  const name     = `Quantum5G NR-01 · ${tier.label} PIX`
  const pixCents = annualVistaCents(tier.priceCents)
  const priceStr = (pixCents / 100).toFixed(2).replace('.', ',')
  console.log(`\n  ▶  Cria PIX ${tier.id}  ${name}  ${brl(pixCents)}`)

  // Navega /products
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2500)
  // Fecha banners
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].filter(b => /^(fechar|×|✕)$/i.test(b.textContent?.trim())).forEach(b => b.click())
  }).catch(() => {})
  await sleep(600)

  // Clica "Criar produto" no header (y < 200)
  const criarCoords = await findByText('Criar produto', { maxY: 200 })
  if (!criarCoords) throw new Error('"Criar produto" não encontrado (y<200)')
  await snap(`${tier.id}_pix_A_before_criar`)
  await page.mouse.click(criarCoords.x, criarCoords.y)

  // Aguarda modal wizard
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')].some(b => /continuar/i.test(b.textContent?.trim())),
    { timeout: 15_000, polling: 400 }
  )
  await sleep(400)
  await snap(`${tier.id}_pix_B_modal`)

  // Seleciona "Quero apenas receber pagamentos"
  await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')]
    for (const s of selects) {
      const opt = [...s.options].find(o => /receber pagamentos/i.test(o.text))
      if (opt) { s.value = opt.value; s.dispatchEvent(new Event('change',{bubbles:true})) }
    }
  })
  await sleep(400)

  // Clica "Continuar" no modal
  const contCoords = await findByText('Continuar', { minY: 100 })
  if (!contCoords) throw new Error('"Continuar" não encontrado')
  await snap(`${tier.id}_pix_C_before_continuar`)
  await page.mouse.click(contCoords.x, contCoords.y)
  await sleep(3000)

  // Diagnóstico dos campos
  const visFields = await page.evaluate(() =>
    [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea')]
      .map(el => {
        const r = el.getBoundingClientRect()
        return { type: el.type, ph: el.placeholder, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }
      })
      .filter(f => f.w > 0 && f.h > 0)
  )
  const sortedByY = [...visFields].sort((a, b) => a.y - b.y)

  // G1) Nome
  const nameField = sortedByY.find(f => (f.type === 'text' || f.type === '') && !/buscar|search|https/i.test(f.ph))
  if (!nameField) throw new Error('Campo nome não encontrado')
  await snap(`${tier.id}_pix_D_before_name`)
  await page.mouse.click(nameField.x + nameField.w/2, nameField.y + nameField.h/2, { clickCount: 3 })
  await sleep(100); await page.keyboard.type(name, { delay: 25 })

  // G2) Descrição
  const descField = sortedByY.find(f => f.type === 'textarea')
  if (descField) {
    const descText = `Diagnóstico de Fatores de Risco Psicossocial (FRPRT) conforme NR-01/GRO (Portarias MTE 1.419/2024 e 765/2025). Válido para empresas com ${tier.label}. Pagamento à vista via PIX com 10% de desconto. Inclui acesso ao módulo Pentagrama de Ginger como bônus.`
    await page.mouse.click(descField.x + descField.w/2, descField.y + descField.h/2)
    await sleep(100); await page.keyboard.type(descText, { delay: 15 })
  }

  // G3) Página de vendas
  const urlField = sortedByY.find(f => f.type === 'text' && /https/i.test(f.ph))
  if (urlField) {
    await page.mouse.click(urlField.x + urlField.w/2, urlField.y + urlField.h/2, { clickCount: 3 })
    await sleep(100); await page.keyboard.type('https://quantum5g.com.br', { delay: 20 })
  }

  // G4) Preço
  const priceField = sortedByY.find(f => f.type === 'tel' || f.type === 'number' || /preço|valor|R\$/i.test(f.ph))
  if (priceField) {
    await snap(`${tier.id}_pix_E_before_price`)
    await page.mouse.click(priceField.x + priceField.w/2, priceField.y + priceField.h/2, { clickCount: 3 })
    await sleep(150)
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control')
    await page.keyboard.press('Backspace')
    await page.keyboard.type(priceStr, { delay: 25 })
    await sleep(300)
    await snap(`${tier.id}_pix_F_after_price`)
  }

  // Botão "Criar produto" do modal (y > 350)
  const saveCoords = await findByText('Criar produto', { minY: 350, preferLast: true })
  if (!saveCoords) throw new Error('Botão salvar não encontrado (minY=350)')
  await snap(`${tier.id}_pix_G_before_save`)
  await page.mouse.click(saveCoords.x, saveCoords.y)

  // Aguarda URL mudar para /edit/UUID
  await page.waitForFunction(
    () => window.location.href.includes('/products/edit/'),
    { timeout: 30_000, polling: 500 }
  ).catch(() => {})
  await sleep(500)
  await snap(`${tier.id}_pix_H_saved`)

  const finalUrl = page.url()
  const productId = finalUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1] ?? null
  if (productId) console.log(`  ✓  PIX product_id: ${productId}`)
  else           console.log('  ⚠  PIX product_id não extraído')
  return productId
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF,
  args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
})
page = await browser.newPage()

try {
  // Verifica autenticação
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(3000)
  if (page.url().includes('/login') || page.url().includes('/verify')) {
    console.log('\n⚠  Sessão inativa — faça login no Edge. Aguardando...\n')
    for (let i = 0; i < 300; i++) {
      await sleep(1000)
      const u = page.url()
      if (!u.includes('/login') && !u.includes('/verify') && !u.includes('/loading')) break
    }
  }
  console.log('✓  Autenticado —', page.url())

  const map = loadMap()

  // ─── FASE 1: Extrai checkout links ─────────────────────────────────────────
  console.log('\n════ FASE 1 — Extrai checkout links ════')
  const parceladoEntries = map.entries.filter(e => e.billing_mode === 'anual_parcelado' && e.kiwify_product_id)

  for (const entry of parceladoEntries) {
    // Pula se já tem checkout_url
    if (entry.checkout_url?.trim()) {
      console.log(`  ⏭  ${entry.tier_id}  já tem URL → ${entry.checkout_url}`)
      continue
    }
    const result = await extractCheckoutLink(entry.kiwify_product_id, entry.tier_id)
    if (result) {
      entry.checkout_url = result.checkoutUrl
      entry.kiwify_link_id = result.linkId
      entry.synced_at = new Date().toISOString()
    }
  }
  saveMap(map)

  // ─── FASE 2: Cria produtos PIX ─────────────────────────────────────────────
  console.log('\n════ FASE 2 — Cria produtos PIX à vista (-10%) ════')

  // Dados dos tiers (mesmos do kiwify-create-products.mjs)
  const TIERS = [
    { id: 't01', label: '0–5 trabalhadores',      priceCents: 246_000 },
    { id: 't02', label: '6–10 trabalhadores',      priceCents: 362_400 },
    { id: 't03', label: '11–15 trabalhadores',     priceCents: 421_200 },
    { id: 't04', label: '16–20 trabalhadores',     priceCents: 480_000 },
    { id: 't05', label: '21–30 trabalhadores',     priceCents: 573_600 },
    { id: 't06', label: '31–40 trabalhadores',     priceCents: 655_200 },
    { id: 't07', label: '41–50 trabalhadores',     priceCents: 736_800 },
    { id: 't08', label: '51–60 trabalhadores',     priceCents: 807_600 },
    { id: 't09', label: '61–80 trabalhadores',     priceCents: 960_000 },
    { id: 't10', label: '81–100 trabalhadores',    priceCents: 1_100_400 },
    { id: 't11', label: '101–200 trabalhadores',   priceCents: 1_755_600 },
    { id: 't12', label: '201–300 trabalhadores',   priceCents: 2_281_200 },
    { id: 't13', label: '301–500 trabalhadores',   priceCents: 3_042_000 },
    { id: 't14', label: '501–750 trabalhadores',   priceCents: 3_978_000 },
    { id: 't15', label: '751–1.000 trabalhadores', priceCents: 4_914_000 },
  ]

  const pixResults = []
  for (const tier of TIERS) {
    // Pula se já existe entrada anual_vista
    const existsPix = map.entries.some(e => e.tier_id === tier.id && e.billing_mode === 'anual_vista' && e.kiwify_product_id)
    if (existsPix) {
      console.log(`  ⏭  PIX ${tier.id} já existe — pulando`)
      continue
    }

    try {
      const productId = await createPixProduct(tier)
      pixResults.push({ tierId: tier.id, productId, ok: !!productId })
    } catch (err) {
      console.error(`  ❌  PIX ${tier.id}: ${err.message}`)
      await snap(`${tier.id}_pix_ERROR`).catch(() => {})
      pixResults.push({ tierId: tier.id, productId: null, ok: false, error: err.message })
    }
  }

  // Extrai checkout links dos produtos PIX e insere no mapa
  console.log('\n════ FASE 3 — Extrai checkout links dos produtos PIX ════')
  for (const res of pixResults) {
    if (!res.productId) continue
    const tier = TIERS.find(t => t.id === res.tierId)
    const pixCents = annualVistaCents(tier.priceCents)
    const result = await extractCheckoutLink(res.productId, `${res.tierId}_pix`)
    if (result) {
      // Insere nova entrada anual_vista no mapa
      const newEntry = {
        tier_id: res.tierId,
        billing_mode: 'anual_vista',
        include_pentagrama: false,
        kiwify_product_id: res.productId,
        checkout_url: result.checkoutUrl,
        kiwify_link_id: result.linkId,
        label: `Quantum5G NR-01 · ${tier.label} (PIX −10%)`,
        sku: `q5g-nr01-${res.tierId}-anual_vista-base`,
        price_cents: pixCents,
        synced_at: new Date().toISOString(),
      }
      map.entries.push(newEntry)
      console.log(`  ✓  ${res.tierId} PIX → ${result.checkoutUrl}`)
    }
  }
  saveMap(map)

  // ─── Resumo ─────────────────────────────────────────────────────────────────
  const parceladoOk = map.entries.filter(e => e.billing_mode === 'anual_parcelado' && e.checkout_url).length
  const pixOk       = map.entries.filter(e => e.billing_mode === 'anual_vista'     && e.checkout_url).length
  console.log(`\n══ Resumo final ══`)
  console.log(`anual_parcelado com URL : ${parceladoOk}/15`)
  console.log(`anual_vista (PIX) com URL: ${pixOk}/15`)

} finally {
  await browser.close()
}
