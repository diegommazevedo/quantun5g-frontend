/**
 * Garante categoria "Apps & Software" (value=10) em todos os 30 produtos.
 * Estratégia: aguarda a SPA renderizar o select pelo waitForFunction.
 */
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root    = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE    = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF    = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS   = join(root, 'scripts')
const MAPFILE = join(root, 'config', 'kiwify-nr01-product-map.json')
const sleep   = ms => new Promise(r => setTimeout(r, ms))

const map     = JSON.parse(readFileSync(MAPFILE, 'utf8'))
const PRODUCTS = [...new Map(map.entries.map(e => [e.kiwify_product_id, e])).values()]
console.log(`Total de produtos únicos: ${PRODUCTS.length}`)

let page

async function snap(label) {
  const path = join(SHOTS, `_cat_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
}

async function setCategoryAndSave(productId, label) {
  // Navega (retenta em ERR_ABORTED)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // networkidle2 garante que a SPA Vue renderizou completamente antes de prosseguir
      await page.goto(
        `https://dashboard.kiwify.com/products/edit/${productId}`,
        { waitUntil: 'networkidle2', timeout: 90_000 }
      )
      break
    } catch (e) {
      if (attempt === 3) throw e
      console.log(`  ↻  ${label}  retentando navegação (${attempt})`)
      await sleep(3000)
    }
  }
  // Sleep extra para hidratação Vue após networkidle2
  await sleep(3000)

  // Poll: espera o SELECT de categoria com opção value="10"
  const hasSelect = await page.waitForFunction(
    () => [...document.querySelectorAll('select')]
      .some(s => [...s.options].some(o => o.value === '10')),
    { timeout: 20_000, polling: 400 }
  ).then(() => true).catch(() => false)

  if (!hasSelect) {
    await snap(`${label.replace('/', '_')}_noselect`)
    // Log de diagnóstico: lista selects presentes
    const dbgSelects = await page.evaluate(() =>
      [...document.querySelectorAll('select')].map(s => ({
        val: s.value,
        opts: [...s.options].map(o => o.value).slice(0, 4),
        visible: (() => { const r = s.getBoundingClientRect(); return r.width > 0 })()
      }))
    )
    console.log(`  ⚠  ${label}  sem SELECT com value=10. Selects: ${JSON.stringify(dbgSelects)}`)
    return false
  }

  // Lê valor atual
  const currentVal = await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === '10'))
    return sel ? sel.value : null
  })

  if (currentVal === '10') {
    console.log(`  ⏭  ${label}  já é "Apps & Software"`)
    return true
  }

  console.log(`  🔧  ${label}  valor atual="${currentVal}" → mudando para "10"`)

  // Muda o valor
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === '10'))
    if (!sel) return
    sel.value = '10'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    sel.dispatchEvent(new Event('input',  { bubbles: true }))
  })
  await sleep(600)

  // Clica "Salvar produto" (último na página)
  const saveCoords = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
      .filter(b => {
        const r = b.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && b.textContent?.trim() === 'Salvar produto'
      })
    const last = btns[btns.length - 1]
    if (!last) return null
    const r = last.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })

  if (!saveCoords) {
    console.log(`  ⚠  ${label}  botão "Salvar produto" não encontrado`)
    return false
  }

  await page.mouse.click(saveCoords.x, saveCoords.y)
  await sleep(2500)
  console.log(`  ✓  ${label}  salvo`)
  return true
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF, args: ['--start-maximized', '--no-first-run', '--no-default-browser-check'],
})
page = await browser.newPage()

try {
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2000)
  console.log('✓  Autenticado —', page.url())

  let ok = 0, skip = 0, fail = 0

  for (const entry of PRODUCTS) {
    const label = `${entry.tier_id}/${entry.billing_mode.replace('anual_', '')}`
    let result = false
    try {
      result = await setCategoryAndSave(entry.kiwify_product_id, label)
    } catch (err) {
      console.error(`  ❌  ${label}: ${err.message}`)
    }
    if (result === true) {
      const wasSkip = await page.evaluate(() => false).catch(() => false) // só para contagem
      ok++
    } else {
      fail++
    }
  }

  console.log(`\n══ Resumo ══`)
  console.log(`Processados  : ${ok}`)
  console.log(`Falhas       : ${fail}`)

} finally {
  await browser.close()
}
