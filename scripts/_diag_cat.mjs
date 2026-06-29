/**
 * Diagnóstico: inspeciona o DOM do produto t01 para entender a estrutura de categoria.
 */
import puppeteer from 'puppeteer-core'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root   = join(dirname(fileURLToPath(import.meta.url)), '..')
const EDGE   = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PROF   = 'C:\\Users\\fzeni\\AppData\\Local\\Microsoft\\Edge\\User Data'
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// t01/parcelado
const PRODUCT_ID = '2a82ed80-5d26-11f1-80a8-b56772044fb0'

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: false, defaultViewport: null,
  userDataDir: PROF, args: ['--start-maximized', '--no-first-run'],
})
const page = await browser.newPage()

await page.goto(
  `https://dashboard.kiwify.com/products/edit/${PRODUCT_ID}`,
  { waitUntil: 'networkidle2', timeout: 60_000 }
)
await sleep(3000)

await page.screenshot({ path: join(root, 'scripts', '_diag_cat_t01.png'), fullPage: true })
console.log('Screenshot salvo')

const info = await page.evaluate(() => {
  const selects = [...document.querySelectorAll('select')]
  const divSelects = [...document.querySelectorAll('[class*="select"],[class*="Select"],[role="listbox"],[role="combobox"]')]
  const inputSelects = [...document.querySelectorAll('input[list]')]
  return {
    nativeSelects: selects.map(s => ({
      id: s.id, name: s.name, value: s.value,
      options: [...s.options].map(o => ({ val: o.value, text: o.text })),
      rect: (() => { const r = s.getBoundingClientRect(); return { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) } })(),
      visible: (() => { const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0 })()
    })),
    divSelectCount: divSelects.length,
    inputListCount: inputSelects.length,
    bodyText: document.body.innerText.slice(0, 500),
  }
})

console.log('\n=== Native SELECTs ===')
for (const s of info.nativeSelects) {
  console.log(`  id="${s.id}" name="${s.name}" val="${s.value}" rect=${JSON.stringify(s.rect)} visible=${s.visible}`)
  for (const o of s.options.slice(0, 5)) console.log(`    option val="${o.val}" text="${o.text}"`)
  if (s.options.length > 5) console.log(`    ...mais ${s.options.length - 5} opções`)
}
console.log(`\nDiv selects encontrados: ${info.divSelectCount}`)
console.log(`Input[list] encontrados: ${info.inputListCount}`)
console.log('\nBody text preview:')
console.log(info.bodyText)

await browser.close()
