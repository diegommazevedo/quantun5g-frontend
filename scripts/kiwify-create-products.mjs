/**
 * QUANTUM5G — Criação automática de produtos NR-01 na Kiwify
 * Estratégia: screenshot antes de cada ação, coordenadas exatas, log sniper.
 */

import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root   = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE   = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF   = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS  = join(root, 'scripts')

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
// t01–t07 e t10–t15 já criados — reprocessar apenas t08 e t09
const SKIP = new Set(['t01','t02','t03','t04','t05','t06','t07','t10','t11','t12','t13','t14','t15'])

const sleep = ms => new Promise(r => setTimeout(r, ms))
function brl(c) { return (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) }

// ─── helpers de tela ───────────────────────────────────────────────────────

let page

async function snap(label) {
  const path = join(SHOTS, `_k_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
  return path
}

/** Encontra elemento visível por texto (XPath).
 *  preferLast=true → retorna o ÚLTIMO visível (mais abaixo na página) */
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
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height, tag: pick.el.tagName }
  }, text, maxY, minY, preferLast)
}

/** Clica em coordenada exata (centro do elemento) */
async function clickAt(coords, label) {
  console.log(`   🎯  click "${label}" → (${coords.x}, ${coords.y})  [${coords.tag} ${Math.round(coords.w)}×${Math.round(coords.h)}]`)
  await page.mouse.click(coords.x, coords.y)
}

/** Aguarda elemento por texto e clica nele (com screenshot antes) */
async function waitAndClick(text, snapLabel, timeoutMs = 15_000, opts = {}) {
  await page.waitForFunction(
    (text) => {
      const xpath = `//*[normalize-space(.)="${text}"]`
      const iter = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
      let n = iter.iterateNext()
      while (n) {
        const r = n.getBoundingClientRect()
        if (r.width > 0 && r.height > 0 && r.y >= 0) return true
        n = iter.iterateNext()
      }
      return false
    },
    { timeout: timeoutMs, polling: 500 }, text
  )
  await snap(snapLabel)
  const coords = await findByText(text, opts)
  if (!coords) throw new Error(`Elemento "${text}" não encontrado após wait`)
  await clickAt(coords, text)
}

/** Limpa e digita em um input localizado por seletor CSS */
async function fillInput(sel, value, label) {
  const el = await page.$(sel)
  if (!el) throw new Error(`Input não encontrado: ${sel}`)
  const box = await el.boundingBox()
  if (!box || box.width === 0) throw new Error(`Input não visível: ${sel}`)
  console.log(`   ✏️   "${label}" → ${sel}  @(${Math.round(box.x)},${Math.round(box.y)})`)
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { clickCount: 3 })
  await sleep(100)
  await page.keyboard.type(value, { delay: 30 })
}

/** Seleciona opção em <select> por texto parcial */
async function selectOption(sel, optionText, label) {
  const result = await page.evaluate((sel, optionText) => {
    const selects = [...document.querySelectorAll(sel)]
    for (const s of selects) {
      const opt = [...s.options].find(o => new RegExp(optionText, 'i').test(o.text))
      if (opt) {
        s.value = opt.value
        s.dispatchEvent(new Event('change', { bubbles: true }))
        s.dispatchEvent(new Event('input',  { bubbles: true }))
        return { found: true, value: opt.value, text: opt.text }
      }
    }
    return { found: false }
  }, sel, optionText)
  console.log(`   📋  "${label}" → ${JSON.stringify(result)}`)
  return result.found
}

// ─── Login ─────────────────────────────────────────────────────────────────

console.log('\n🚀  Abrindo Edge com perfil real...')
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: false,
  defaultViewport: null,
  userDataDir: PROF,
  args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
})
page = await browser.newPage()
const results = []

try {
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(3000)
  await snap('00_initial')
  const url0 = page.url()
  console.log('URL inicial:', url0)

  // Se não estiver logado, aguarda login manual no Edge (polling 5 min)
  if (url0.includes('/login') || url0.includes('/verify-otp')) {
    console.log('\n⚠️  Sessão inativa. Faça login no Edge aberto. Aguardando automaticamente...\n')
    for (let i = 0; i < 300; i++) {
      await sleep(1000)
      const u = page.url()
      if (!u.includes('/login') && !u.includes('/verify') && !u.includes('/loading')) break
      if (i % 20 === 0) console.log(`   ⏳  ${i}s — URL: ${u}`)
    }
  }

  if (page.url().includes('/login')) {
    console.error('❌  Não foi possível autenticar.')
    await browser.close(); process.exit(1)
  }
  console.log('✓  Autenticado —', page.url())

  // Fecha banner de premiações se aparecer
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    btns.filter(b => /^fechar$/i.test(b.textContent?.trim())).forEach(b => b.click())
  }).catch(() => {})
  await sleep(500)

  // ─── Loop de criação ────────────────────────────────────────────────────
  const toCreate = TIERS.filter(t => !SKIP.has(t.id))
  console.log(`\n📦  Criando ${toCreate.length} produtos...\n`)

  for (const tier of toCreate) {
    const name     = `Quantum5G NR-01 · ${tier.label}`
    const priceStr = (tier.priceCents / 100).toFixed(2).replace('.', ',')
    console.log(`\n▶  ${tier.id}  ${name}  ${brl(tier.priceCents)}`)

    try {

      // ═══ A) Força reload em /products para fechar qualquer form aberto ══
      await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await sleep(2500)
      // Fecha banners/modais residuais
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].filter(b => /^(fechar|×|✕|close)$/i.test(b.textContent?.trim())).forEach(b => b.click())
      }).catch(() => {})
      await sleep(600)
      await snap(`${tier.id}_A_lista`)

      // ═══ B) Encontra e clica em "Criar produto" no topo ═════════════════
      const criarCoords = await findByText('Criar produto', { maxY: 200 })
      if (!criarCoords) throw new Error('"Criar produto" não encontrado na lista (y<200)')
      await snap(`${tier.id}_B_before_criar`)
      await clickAt(criarCoords, 'Criar produto')
      console.log('   ✓  Clicou em "Criar produto"')

      // ═══ C) Aguarda modal wizard e tira screenshot ══════════════════════
      await page.waitForFunction(
        () => [...document.querySelectorAll('button')].some(b => /continuar/i.test(b.textContent?.trim())),
        { timeout: 15_000, polling: 400 }
      )
      await sleep(400)
      await snap(`${tier.id}_C_modal`)
      console.log('   ✓  Modal aberto')

      // ═══ D) Seleciona "Quero apenas receber pagamentos" no dropdown ══════
      // O select de "Entrega do conteúdo" lista opções como "Área de membros...",
      // "Evento presencial", "Quero apenas receber pagamentos"
      await snap(`${tier.id}_D_before_select`)
      const selOk = await selectOption('select', 'receber pagamentos', 'Entrega do conteúdo')
      if (!selOk) console.log('   ⚠  Opção "receber pagamentos" não encontrada — mantém padrão')
      await sleep(400)

      // ═══ E) Clica em "Continuar" ════════════════════════════════════════
      const contCoords = await findByText('Continuar', { minY: 100 })
      if (!contCoords) throw new Error('"Continuar" não encontrado no modal')
      await snap(`${tier.id}_E_before_continuar`)
      await clickAt(contCoords, 'Continuar')
      console.log('   ✓  Clicou "Continuar"')
      await sleep(3000)
      await snap(`${tier.id}_F_after_continuar`)

      // ═══ F) Diagnóstico dos campos visíveis ════════════════════════════
      const visFields = await page.evaluate(() =>
        [...document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea')]
          .map(el => {
            const r = el.getBoundingClientRect()
            return { type: el.type, name: el.name, id: el.id, ph: el.placeholder, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }
          })
          .filter(f => f.w > 0 && f.h > 0)
      )
      console.log('   Campos visíveis:', JSON.stringify(visFields))

      const visBtns = await page.evaluate(() =>
        [...document.querySelectorAll('button:not([disabled])')].map(b => ({ txt: b.textContent?.trim(), disabled: b.disabled })).filter(b => b.txt)
      )
      console.log('   Botões:', JSON.stringify(visBtns.map(b => b.txt)))

      // ═══ G) Preenche nome do produto ════════════════════════════════════
      // Modal "Quero apenas receber pagamentos":
      //   [0] Nome do produto  — text, sem placeholder especial
      //   [1] Descrição        — textarea
      //   [2] Página de vendas — text, ph="https://..."
      //   [3] Preço            — tel (Kiwify usa tel para currency)
      const sortedByY = [...visFields].sort((a, b) => a.y - b.y)
      // Nome = primeiro campo text (não busca, não url)
      const nameField = sortedByY.find(f =>
        (f.type === 'text' || f.type === '') &&
        !/buscar|search|https/i.test(f.ph)
      )
      if (!nameField) throw new Error('Campo de nome não encontrado')

      // ── G1) Nome ──────────────────────────────────────────────────────────
      console.log(`   🎯  Nome → @(${nameField.x},${nameField.y}) type="${nameField.type}"`)
      await snap(`${tier.id}_G_before_name`)
      await page.mouse.click(nameField.x + nameField.w/2, nameField.y + nameField.h/2, { clickCount: 3 })
      await sleep(150)
      await page.keyboard.type(name, { delay: 30 })
      await sleep(300)
      await snap(`${tier.id}_G_after_name`)

      // ── G2) Descrição (textarea — obrigatório: mín. 100 chars) ────────────
      const descField = sortedByY.find(f => f.type === 'textarea')
      if (descField) {
        const descText = `Diagnóstico de Fatores de Risco Psicossocial (FRPRT) conforme NR-01/GRO (Portarias MTE 1.419/2024 e 765/2025). Válido para empresas com ${tier.label}. Inclui acesso ao módulo Pentagrama de Ginger como bônus.`
        console.log(`   🎯  Descrição → @(${descField.x},${descField.y}) textarea`)
        await page.mouse.click(descField.x + descField.w/2, descField.y + descField.h/2, { clickCount: 1 })
        await sleep(100)
        await page.keyboard.type(descText, { delay: 20 })
        await sleep(200)
      }

      // ── G3) Página de vendas (URL — obrigatório) ──────────────────────────
      const urlField = sortedByY.find(f =>
        f.type === 'text' && /https/i.test(f.ph)
      )
      if (urlField) {
        console.log(`   🎯  Página de vendas → @(${urlField.x},${urlField.y}) ph="${urlField.ph}"`)
        await snap(`${tier.id}_G_before_url`)
        await page.mouse.click(urlField.x + urlField.w/2, urlField.y + urlField.h/2, { clickCount: 3 })
        await sleep(100)
        await page.keyboard.type('https://quantum5g.com.br', { delay: 25 })
        await sleep(200)
        await snap(`${tier.id}_G_after_url`)
      }

      // ── G4) Preço (type="tel" com "R$ 0,00" — Kiwify usa tel para currency)
      const priceField = sortedByY.find(f =>
        f.type === 'tel' || f.type === 'number' ||
        /preço|valor|R\$|price/i.test(f.ph + f.name + f.id)
      )
      if (priceField) {
        console.log(`   🎯  Preço → @(${priceField.x},${priceField.y}) type="${priceField.type}"`)
        await snap(`${tier.id}_H_before_price`)
        await page.mouse.click(priceField.x + priceField.w/2, priceField.y + priceField.h/2, { clickCount: 3 })
        await sleep(150)
        await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control')
        await page.keyboard.press('Backspace')
        await page.keyboard.type(priceStr, { delay: 30 })
        await sleep(300)
        await snap(`${tier.id}_H_after_price`)
      } else {
        console.log('   ⚠  Campo de preço não encontrado')
      }

      // ═══ I) Clica no botão "Criar produto" DO MODAL (y > 350, abaixo do header) ═
      const saveCoords = await findByText('Criar produto', { minY: 350, preferLast: true })
      if (!saveCoords) throw new Error('Botão "Criar produto" do modal não encontrado (minY=350)')
      console.log(`   🎯  Botão salvar modal @(${saveCoords.x},${saveCoords.y})`)
      await snap(`${tier.id}_I_before_save`)
      await clickAt(saveCoords, 'Criar produto (modal)')
      // Aguarda URL mudar para /edit/UUID (produto criado) — até 30s
      await page.waitForFunction(
        () => window.location.href.includes('/products/edit/'),
        { timeout: 30_000, polling: 500 }
      ).catch(() => { /* timeout */ })
      await sleep(500)
      await snap(`${tier.id}_I_after_save`)

      // ═══ J) Extrai product_id ════════════════════════════════════════════
      const finalUrl = page.url()
      console.log('   URL final:', finalUrl)
      let productId = finalUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?.[1] ?? null

      if (!productId) {
        // Kiwify pode redirecionar de volta a /products — busca UUID em links da lista
        productId = await page.evaluate((productName) => {
          const links = [...document.querySelectorAll('a[href*="/products/"]')]
          for (const a of links) {
            const m = a.href.match(/\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)
            if (m) return m[1]
          }
          // Tenta pegar da linha do produto recém-criado na listagem
          const rows = [...document.querySelectorAll('tr, [class*="product-row"], [class*="ProductRow"]')]
          for (const row of rows) {
            if (row.textContent?.includes(productName.substring(0, 20))) {
              const link = row.querySelector('a[href*="/products/"]')
              if (link) {
                const m = link.href.match(/\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)
                if (m) return m[1]
              }
            }
          }
          return null
        }, name)
      }

      if (productId) console.log(`   ✓  product_id: ${productId}`)
      else           console.log('   ⚠  product_id não encontrado — verifique screenshot I_after_save')

      results.push({ tierId: tier.id, productId, name, priceCents: tier.priceCents })

    } catch (err) {
      console.error(`   ❌  ${tier.id}: ${err.message}`)
      await snap(`${tier.id}_ERROR`).catch(() => {})
      results.push({ tierId: tier.id, productId: null, error: err.message })
    }
  }

  // ─── Atualiza product-map.json ──────────────────────────────────────────
  const created = results.filter(r => r.productId)
  if (created.length > 0) {
    const mapPath = join(root, 'config', 'kiwify-nr01-product-map.json')
    const map = JSON.parse(readFileSync(mapPath, 'utf8'))
    for (const r of created) {
      const entry = map.entries.find(e => e.tier_id === r.tierId && e.billing_mode === 'anual_parcelado')
      if (entry) { entry.kiwify_product_id = r.productId; entry.synced_at = new Date().toISOString() }
    }
    writeFileSync(mapPath, JSON.stringify(map, null, 2))
    console.log('\n✓  kiwify-nr01-product-map.json atualizado')
  }

  // ─── Resumo ─────────────────────────────────────────────────────────────
  const ok   = results.filter(r => r.productId).length
  const fail = results.filter(r => !r.productId).length
  console.log(`\n══ Resumo ══`)
  console.log(`Criados com sucesso : ${ok}`)
  console.log(`Falhas              : ${fail}`)
  results.filter(r => !r.productId).forEach(r => console.log(`  ❌  ${r.tierId}  ${r.error ?? '—'}`))

} finally {
  await browser.close()
}
