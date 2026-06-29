/**
 * Localiza produto "TESTE R$10" na Kiwify, define preço R$10 e extrai checkout URL.
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const root  = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE  = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF  = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const SHOTS = join(root, 'scripts', '_sim')
mkdirSync(SHOTS, { recursive: true })

const OUT   = join(root, 'config', 'kiwify-test-product.json')
const sleep = ms => new Promise(r => setTimeout(r, ms))

let page, step = 0
async function snap(label) {
  step++
  const path = join(SHOTS, `${String(step+20).padStart(2,'0')}_${label}.png`)
  await page.screenshot({ path, fullPage: false }).catch(() => {})
  console.log(`📸 ${path}`)
}

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF, args: ['--start-maximized', '--no-first-run'],
})
page = await browser.newPage()

try {
  // ── 1. Navega para lista de produtos (filtro Rascunho para achar o novo)
  await page.goto('https://dashboard.kiwify.com/products', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sleep(2500)
  await snap('produtos_lista')

  // ── 2. Muda filtro para "Todos" e busca pelo nome TESTE
  const allStatuses = ['draft', 'under_review', 'active', 'disabled', 'rejected']
  
  // Muda select de status para "Todos"
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'draft'))
    if (sel) { sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true })) }
  })
  await sleep(1000)

  // Busca pelo campo de pesquisa
  const searchInput = await page.evaluate(() => {
    const inp = document.querySelector('input[type="search"],input[placeholder*="Buscar"],input[placeholder*="buscar"]')
    if (!inp) return null
    const r = inp.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })
  if (searchInput) {
    await page.mouse.click(searchInput.x, searchInput.y)
    await page.keyboard.type('TESTE', { delay: 50 })
    await sleep(1500)
    await snap('busca_teste')
  }

  // ── 3. Lista todos os links de produto visíveis
  const productLinks = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href*="/products/edit/"]')].map(a => ({
      href: a.href,
      text: a.closest('tr,div,li')?.innerText?.slice(0, 80) ?? a.textContent
    }))
  })
  console.log('Produtos encontrados na busca:', productLinks)

  // Também verifica todas as linhas da tabela
  const rows = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr,div[class*="product-row"]')]
    return rows.map(r => ({
      text: r.innerText?.slice(0, 100),
      link: r.querySelector('a')?.href
    })).filter(r => r.text?.includes('TESTE'))
  })
  console.log('Linhas com TESTE:', rows)

  // Tenta navegar para a URL de edição encontrada
  let editUrl = productLinks.find(l => l.href?.includes('/edit/'))?.href
                ?? rows.find(r => r.link?.includes('/edit/'))?.link

  if (!editUrl) {
    // Última tentativa: pega todos os produtos edit links da página
    const allLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/products/edit/"]')].map(a => a.href)
    )
    console.log('Todos os edit links:', allLinks.slice(0, 5))
    // Pega o mais recente (primeiro da lista se ordenado por data)
    editUrl = allLinks[0]
  }

  if (!editUrl) throw new Error('Produto TESTE não encontrado na lista')

  console.log('Navegando para:', editUrl)
  await page.goto(editUrl, { waitUntil: 'networkidle2', timeout: 90_000 })
  await sleep(2000)
  await snap('produto_edit')

  // Extrai product_id da URL
  const productIdMatch = editUrl.match(/\/edit\/([0-9a-f-]{36})/i)
  const kiwifyProductId = productIdMatch?.[1]
  console.log('Product ID:', kiwifyProductId)

  // ── 4. Define preço R$10 — localiza campo de preço
  const priceInfo = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')]
    return inputs.map(inp => {
      const r = inp.getBoundingClientRect()
      if (r.width === 0) return null
      return {
        type: inp.type,
        placeholder: inp.placeholder,
        value: inp.value,
        step: inp.step,
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2),
        w: Math.round(r.width)
      }
    }).filter(Boolean)
  })
  console.log('Inputs na página de edição:', JSON.stringify(priceInfo, null, 2))
  await snap('edit_inputs')

  // Tenta encontrar o campo de preço — tipo number ou com step decimal
  const priceCoords = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')]
    const el = inputs.find(i => {
      const r = i.getBoundingClientRect()
      if (r.width === 0) return false
      return i.type === 'number' || i.step === '0.01' || i.step === '0.1' ||
             i.placeholder?.includes('0,00') || i.placeholder?.includes('0.00') ||
             (i.value !== undefined && /^\d+[.,]\d*$/.test(i.value))
    })
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), val: el.value, ph: el.placeholder }
  })

  if (priceCoords) {
    console.log('Campo preço encontrado:', priceCoords)
    await page.mouse.click(priceCoords.x, priceCoords.y, { clickCount: 3 })
    await page.keyboard.selectAll?.()
    await page.keyboard.press('Delete')
    await page.keyboard.type('10', { delay: 30 })
    await sleep(500)
    await snap('preco_preenchido')
  } else {
    console.log('⚠ Campo de preço não encontrado automaticamente')
    console.log('>>> AÇÃO MANUAL: defina o preço como R$10,00 no navegador aberto')
    await snap('preco_nao_encontrado')
    // Aguarda o usuário definir o preço manualmente (30 segundos)
    await sleep(30_000)
    await snap('apos_espera_manual')
  }

  // ── 5. Salva produto
  const saveCoords = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && b.textContent?.trim() === 'Salvar produto' })
      .pop()
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })

  if (saveCoords) {
    await page.mouse.click(saveCoords.x, saveCoords.y)
    await sleep(3000)
    await snap('apos_salvar')
  }

  // ── 6. Navega para aba Links
  const linksTab = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('button,a,span,div')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.y < 250 && el.textContent?.trim() === 'Links' })
    const t = tabs[0]
    if (!t) return null
    const r = t.getBoundingClientRect()
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }
  })

  if (linksTab) {
    await page.mouse.click(linksTab.x, linksTab.y)
    await sleep(2500)
    await snap('links_tab')
  }

  // ── 7. Extrai checkout URL
  const checkoutUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="pay.kiwify.com.br"]')]
    return links.map(a => a.href)[0] ?? null
  })

  // Também tenta pelo conteúdo de texto com URL
  const rawUrlOnPage = await page.evaluate(() => {
    const all = document.body.innerText
    const m = all.match(/https?:\/\/pay\.kiwify\.com\.br\/[A-Za-z0-9]+/)
    return m?.[0] ?? null
  })

  console.log('Checkout URL (link):', checkoutUrl)
  console.log('Checkout URL (text):', rawUrlOnPage)
  await snap('checkout_url_final')

  const finalUrl = checkoutUrl ?? rawUrlOnPage
  const result = {
    kiwify_product_id: kiwifyProductId,
    checkout_url: finalUrl,
    edit_url: editUrl,
    created_at: new Date().toISOString(),
    purpose: 'test_flow_R$10',
    tier_id: 't01',
    billing_mode: 'anual_parcelado',
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2))
  console.log('\n✅ Resultado salvo:', OUT)
  console.log(JSON.stringify(result, null, 2))

} catch (err) {
  await snap('ERROR')
  console.error('❌ Erro:', err.message)
} finally {
  await browser.close()
}
