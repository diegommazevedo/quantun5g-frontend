/**
 * Habilita campo CNPJ no checkout Kiwify (Configurações → campos personalizados).
 * Uso: node --env-file=.env.local scripts/kiwify-configure-checkout-cnpj.mjs [product_id]
 */

import puppeteer from 'puppeteer-core'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF =
  process.env.KIWIFY_EDGE_PROFILE?.trim() ||
  join(root, 'scripts', '_edge-sim-copy')
const SHOTS = join(root, 'scripts', '_sim')
const TEST_PRODUCT = join(root, 'config', 'kiwify-test-product.json')

mkdirSync(SHOTS, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function resolveProductId() {
  const arg = process.argv[2]?.trim()
  if (arg) return arg
  if (existsSync(TEST_PRODUCT)) {
    return JSON.parse(readFileSync(TEST_PRODUCT, 'utf8')).kiwify_product_id
  }
  throw new Error('Informe product_id ou crie config/kiwify-test-product.json')
}

async function findByText(page, text, opts = {}) {
  const { minY = 0, maxY = 99999 } = opts
  return page.evaluate(
    (text, minY, maxY) => {
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
      const { r } = visible[0]
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
    },
    text,
    minY,
    maxY,
  )
}

async function clickSidebarTab(page, label) {
  const pt = await findByText(page, label, { minY: 120, maxY: 420 })
  if (!pt) return false
  await page.mouse.click(pt.x, pt.y)
  await sleep(2000)
  return true
}

async function toggleCustomFields(page) {
  const result = await page.evaluate(() => {
    const label = [...document.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === 'Coletar campos personalizados',
    )
    if (!label) return { ok: false, reason: 'label não encontrado' }
    label.scrollIntoView({ block: 'center' })

    const row = label.closest('.flex.items-center') ?? label.parentElement
    const candidates = row
      ? [...row.querySelectorAll('button, input, [role="switch"], span, div')]
      : []
    for (const el of candidates) {
      if (el === label || el.contains(label)) continue
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && r.x < label.getBoundingClientRect().x) {
        el.click()
        return { ok: true, action: 'toggle_click' }
      }
    }

    // fallback: click à esquerda do label
    const lr = label.getBoundingClientRect()
    return { ok: true, action: 'coords', x: lr.x - 30, y: lr.y + lr.height / 2 }
  })

  if (result.action === 'coords') {
    await page.mouse.click(result.x, result.y)
  }
  await sleep(1500)
  return result.ok
}

async function addCnpjCustomField(page) {
  const filled = await page.evaluate(() => {
    const label = [...document.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === 'Coletar campos personalizados',
    )
    label?.scrollIntoView({ block: 'center' })

    let nomeFilled = false
    for (const inp of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])')) {
      const ph = (inp.placeholder ?? '').toLowerCase()
      const aria = (inp.getAttribute('aria-label') ?? '').toLowerCase()
      const row = inp.closest('div')?.innerText?.toLowerCase() ?? ''
      if (ph.includes('digite aqui') || row.includes('nome') && row.includes('tipo')) {
        inp.focus()
        inp.value = 'CNPJ'
        inp.dispatchEvent(new Event('input', { bubbles: true }))
        inp.dispatchEvent(new Event('change', { bubbles: true }))
        nomeFilled = true
        break
      }
    }

    // Garantir obrigatório (Opcional desmarcado)
    for (const label of document.querySelectorAll('label')) {
      if (label.textContent?.trim() === 'Opcional') {
        const cb = label.closest('div')?.querySelector('input[type="checkbox"]')
        if (cb?.checked) cb.click()
      }
    }

    return {
      nomeFilled,
      bodyHasCnpj: (document.body?.innerText ?? '').includes('CNPJ'),
    }
  })

  return filled
}

async function saveProduct(page) {
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      if (/salvar produto|salvar alterações/i.test(b.textContent?.trim() ?? '')) {
        b.scrollIntoView({ block: 'center' })
      }
    }
  })
  await sleep(800)

  const saved = await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      const t = b.textContent?.trim() ?? ''
      if (/^salvar produto$|^salvar alterações$/i.test(t)) {
        b.click()
        return t
      }
    }
    return null
  })

  if (saved) {
    await sleep(4000)
    return true
  }

  const pt =
    (await findByText(page, 'Salvar produto', { minY: 500 })) ??
    (await findByText(page, 'Salvar alterações', { minY: 500 }))
  if (!pt) return false
  await page.mouse.click(pt.x, pt.y)
  await sleep(4000)
  return true
}

async function enableCnpjOnCheckout(page, productId) {
  await page.goto(`https://dashboard.kiwify.com/products/edit/${productId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await sleep(3000)

  const onSettings = await clickSidebarTab(page, 'Configurações')
  if (!onSettings) {
    return { ok: false, reason: 'Aba Configurações não encontrada — faça login no Edge do perfil Kiwify.' }
  }

  await page.screenshot({ path: join(SHOTS, 'cnpj_config_before.png'), fullPage: false })

  const toggled = await toggleCustomFields(page)
  if (!toggled) {
    return { ok: false, reason: 'Toggle "Coletar campos personalizados" não encontrado.' }
  }

  const field = await addCnpjCustomField(page)
  const saved = await saveProduct(page)

  await page.screenshot({ path: join(SHOTS, 'cnpj_config_after.png'), fullPage: false })

  const body = await page.evaluate(() => document.body?.innerText ?? '')
  const customEnabled = /coletar campos personalizados/i.test(body)

  return {
    ok: customEnabled && field.nomeFilled && saved,
    toggled,
    field,
    saved,
    hint: saved
      ? 'Campo personalizado CNPJ habilitado — valide no checkout de teste.'
      : 'Salvar produto falhou — confira scripts/_sim/cnpj_config_after.png',
  }
}

const productId = resolveProductId()
console.log('Produto:', productId)

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: false,
  userDataDir: PROF,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1400, height: 900 },
})

const page = (await browser.pages())[0] ?? (await browser.newPage())
try {
  const result = await enableCnpjOnCheckout(page, productId)
  console.log(JSON.stringify(result, null, 2))
  if (result.ok) {
    console.log(`\n✓ Checkout configurado — screenshots em scripts/_sim/cnpj_config_*.png`)
  } else {
    console.log(`\n⚠ ${result.reason ?? result.hint}`)
    console.log('Configure manualmente: Produto → Configurações → Coletar campos personalizados → campo CNPJ obrigatório')
  }
  process.exitCode = result.ok ? 0 : 1
} finally {
  await browser.close()
}
