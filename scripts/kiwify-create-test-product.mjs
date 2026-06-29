/**
 * Cria produto de R$10 de teste no Kiwify (faixa t01, anual_parcelado).
 * Extrai checkout URL e salva em config/kiwify-test-product.json
 * Screenshot a cada passo — sem censura.
 */
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root  = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE  = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF  = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS = join(root, 'scripts', '_sim')
const OUT   = join(root, 'config', 'kiwify-test-product.json')

const sleep = ms => new Promise(r => setTimeout(r, ms))

import { mkdirSync } from 'fs'
mkdirSync(SHOTS, { recursive: true })

let page, step = 0

async function snap(label) {
  step++
  const path = join(SHOTS, `${String(step).padStart(2,'0')}_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
  console.log(`📸 ${path}`)
  return path
}

async function findByText(text, { maxY = 9999, minY = 0, preferLast = false } = {}) {
  return page.evaluate((text, maxY, minY, preferLast) => {
    const xpath = `//*[normalize-space(.)="${text}"]`
    const iter = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    const candidates = []
    let n = iter.iterateNext()
    while (n) { candidates.push(n); n = iter.iterateNext() }
    const visible = candidates
      .map(el => { const r = el.getBoundingClientRect(); return { el, r } })
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.y >= minY && r.y < maxY)
    if (!visible.length) return null
    const pick = preferLast ? visible[visible.length - 1] : visible[0]
    const r = pick.r
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height }
  }, text, maxY, minY, preferLast)
}

async function fillInput(selector, value) {
  await page.click(selector, { clickCount: 3 })
  await page.type(selector, String(value), { delay: 30 })
}

async function fillByPlaceholder(ph, value) {
  const coords = await page.evaluate((ph) => {
    const inputs = [...document.querySelectorAll('input[placeholder]')]
    const el = inputs.find(i => i.placeholder.toLowerCase().includes(ph.toLowerCase()))
    if (!el) return null
    const r = el.getBoundingClientRect()
    return r.width > 0 ? { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) } : null
  }, ph)
  if (!coords) { console.log(`⚠ input "${ph}" não encontrado`); return }
  await page.mouse.click(coords.x, coords.y, { clickCount: 3 })
  await page.keyboard.type(String(value), { delay: 25 })
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF, args: ['--start-maximized', '--no-first-run'],
})
page = await browser.newPage()

try {
  // ── Passo 1: ir para lista de produtos e clicar em "Criar produto"
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(3000)
  await snap('01_products_list')

  // Botão "Criar produto" ou "Novo produto"
  const criarBtn = await findByText('Criar produto') ?? await findByText('Novo produto') ?? await findByText('Create product')
  if (!criarBtn) throw new Error('Botão "Criar produto" não encontrado na lista')
  await snap('01b_before_criar')
  await page.mouse.click(criarBtn.x, criarBtn.y)
  await sleep(3000)
  await snap('01c_after_criar')

  // ── Passo 2: novo modal "Criar produto" — configura dropdowns
  // Inspeciona opções de "Entrega do conteúdo"
  const selects = await page.evaluate(() => {
    return [...document.querySelectorAll('select')].map(s => ({
      val: s.value,
      opts: [...s.options].map(o => ({ val: o.value, text: o.text })),
      rect: (() => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) } })()
    })).filter(s => s.rect.w > 0)
  })
  console.log('SELECTs no modal:', JSON.stringify(selects, null, 2))
  await snap('02_modal_selects')

  // Muda "Entrega do conteúdo" para opção de pagamento simples (sem área de membros)
  // Tenta opção "Não", "Nenhuma", "Sem entrega", etc.
  const changed = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')]
    for (const sel of selects) {
      const r = sel.getBoundingClientRect()
      if (r.width === 0) continue
      // Procura opção de pagamento sem entrega de conteúdo
      const noneOpt = [...sel.options].find(o =>
        /n[aã]o|none|sem|apenas|payment|receber/i.test(o.text)
      )
      if (noneOpt) {
        sel.value = noneOpt.value
        sel.dispatchEvent(new Event('change', { bubbles: true }))
        sel.dispatchEvent(new Event('input',  { bubbles: true }))
        return { changed: true, field: sel.id || 'unknown', opt: noneOpt.text }
      }
    }
    return { changed: false }
  })
  console.log('Dropdown alterado:', changed)
  await sleep(800)
  await snap('02b_after_dropdown_change')

  const continuar1 = await findByText('Continuar', { preferLast: true })
    ?? await findByText('Continuar →', { preferLast: true })
  if (!continuar1) throw new Error('"Continuar" não encontrado no modal')
  await snap('03_before_continuar1')
  await page.mouse.click(continuar1.x, continuar1.y)
  await sleep(2500)

  // ── Passo 3: preencher nome do produto (input sem placeholder — pega o 1º visível)
  await snap('04_after_continuar1')

  const nameCoords = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="text"],input:not([type])')]
    const el = inputs.find(i => { const r = i.getBoundingClientRect(); return r.width > 100 && r.height > 0 })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })
  if (nameCoords) {
    await page.mouse.click(nameCoords.x, nameCoords.y, { clickCount: 3 })
    await page.keyboard.type('Quantum5G NR-01 [TESTE R$10]', { delay: 25 })
  } else {
    console.log('⚠ input nome não encontrado')
  }
  await sleep(300)

  // Preço — input com placeholder "R$ 0,00"
  await snap('05_before_price')
  const brlInput = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')]
    const el = inputs.find(i => {
      const r = i.getBoundingClientRect()
      return r.width > 50 && r.height > 0 && (
        i.placeholder === 'R$ 0,00' ||
        i.placeholder?.includes('0,00') ||
        i.type === 'number'
      )
    })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })
  if (brlInput) {
    await page.mouse.click(brlInput.x, brlInput.y, { clickCount: 3 })
    await page.keyboard.type('10', { delay: 30 })
    await sleep(300)
  } else {
    console.log('⚠ campo de preço não encontrado')
  }
  await snap('06_after_price')

  // ── Passo 4: botão final "Criar produto" no modal
  const criarFinal = await findByText('Criar produto', { preferLast: true })
  if (criarFinal) {
    await snap('07_before_criar_final')
    await page.mouse.click(criarFinal.x, criarFinal.y)
    await sleep(4000)
    await snap('08_after_criar_final')
  } else {
    const continuar2 = await findByText('Continuar', { preferLast: true })
    if (continuar2) {
      await page.mouse.click(continuar2.x, continuar2.y)
      await sleep(3000)
      await snap('08_after_continuar2')
    }
  }

  // ── Passo 5: se caiu na página de edição, salvar
  const salvar = await findByText('Salvar produto', { preferLast: true })
  if (salvar) {
    await snap('09_before_salvar')
    await page.mouse.click(salvar.x, salvar.y)
    await sleep(3000)
    await snap('10_after_salvar')
  }

  // ── Passo 6: Extrair checkout URL
  const currentUrl = page.url()
  const productIdMatch = currentUrl.match(/\/edit\/([0-9a-f-]{36})/i)
  const kiwifyProductId = productIdMatch?.[1] ?? null
  console.log('URL atual:', currentUrl)
  console.log('Product ID extraído:', kiwifyProductId)

  // Vai para aba Links para pegar checkout URL
  await page.goto(currentUrl.replace(/\/$/, '') + '', { waitUntil: 'domcontentloaded' })
  await sleep(2000)

  // Clica na aba Links
  const linksTab = await findByText('Links', { minY: 50, maxY: 200 })
  if (linksTab) {
    await snap('11_before_links_tab')
    await page.mouse.click(linksTab.x, linksTab.y)
    await sleep(2000)
    await snap('12_links_tab')
  }

  // Extrai checkout URLs da página
  const checkoutUrls = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="pay.kiwify.com.br"],a[href*="kiwify.com.br/"]')]
    return links.map(a => ({ href: a.href, text: a.textContent?.trim() }))
  })
  console.log('Checkout URLs encontradas:', checkoutUrls)

  await snap('13_final_state')

  // Salva resultado
  const result = {
    kiwify_product_id: kiwifyProductId,
    checkout_urls: checkoutUrls,
    product_url: currentUrl,
    created_at: new Date().toISOString(),
    purpose: 'test_flow_R$10',
    tier_id: 't01',
    billing_mode: 'anual_parcelado',
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2))
  console.log('\n✅ Produto criado. Resultado salvo em:', OUT)
  console.log(JSON.stringify(result, null, 2))

} catch (err) {
  await snap('ERROR_state')
  console.error('❌ Erro:', err.message)
} finally {
  console.log('\n🔍 Verifique os screenshots em:', SHOTS)
  await browser.close()
}
