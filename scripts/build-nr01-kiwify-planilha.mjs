/**
 * Gera planilha NR-01 Kiwify: config/nr01-kiwify-planilha.xlsx
 * Abas: Faixas_t01-t15 | Checkouts_30
 * Uso: node scripts/build-nr01-kiwify-planilha.mjs
 */

import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import * as XLSX from 'xlsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outXlsx = join(root, 'config', 'nr01-kiwify-planilha.xlsx')
const outCsv1 = join(root, 'config', 'nr01-kiwify-planilha-faixas-t01-t15.csv')
const outCsv2 = join(root, 'config', 'nr01-kiwify-planilha-checkouts-30.csv')

const SHEET_FAIXAS = 'Faixas_t01-t15'
const SHEET_CHECKOUTS = 'Checkouts_30'

const TIERS = [
  { id: 't01', workers: '0–5', parcelado: 2460.0, parcela: 205.0, vista: 2214.0, obs: 'Produto base ja cadastrado na Kiwify; falta oferta a vista' },
  { id: 't02', workers: '6–10', parcelado: 3624.0, parcela: 302.0, vista: 3261.6, obs: '' },
  { id: 't03', workers: '11–15', parcelado: 4212.0, parcela: 351.0, vista: 3790.8, obs: '' },
  { id: 't04', workers: '16–20', parcelado: 4800.0, parcela: 400.0, vista: 4320.0, obs: '' },
  { id: 't05', workers: '21–30', parcelado: 5736.0, parcela: 478.0, vista: 5162.4, obs: '' },
  { id: 't06', workers: '31–40', parcelado: 6552.0, parcela: 546.0, vista: 5896.8, obs: '' },
  { id: 't07', workers: '41–50', parcelado: 7368.0, parcela: 614.0, vista: 6631.2, obs: '' },
  { id: 't08', workers: '51–60', parcelado: 8076.0, parcela: 673.0, vista: 7268.4, obs: '' },
  { id: 't09', workers: '61–80', parcelado: 9600.0, parcela: 800.0, vista: 8640.0, obs: '' },
  { id: 't10', workers: '81–100', parcelado: 11004.0, parcela: 917.0, vista: 9903.6, obs: '' },
  { id: 't11', workers: '101–200', parcelado: 17556.0, parcela: 1463.0, vista: 15800.4, obs: '' },
  { id: 't12', workers: '201–300', parcelado: 22812.0, parcela: 1901.0, vista: 20530.8, obs: '' },
  { id: 't13', workers: '301–500', parcelado: 30420.0, parcela: 2535.0, vista: 27378.0, obs: '' },
  { id: 't14', workers: '501–750', parcelado: 39780.0, parcela: 3315.0, vista: 35802.0, obs: '' },
  { id: 't15', workers: '751–1.000', parcelado: 49140.0, parcela: 4095.0, vista: 44226.0, obs: '' },
]

function productName(workers) {
  return `Quantum5G NR-01 · ${workers} trabalhadores`
}

function offerName(workers) {
  return `${productName(workers)} (à vista −10%)`
}

function fmt2(n) {
  return Number(n).toFixed(2)
}

const HEAD_FAIXAS = [
  'Faixa',
  'Trabalhadores',
  'Nome do produto',
  'Tipo',
  'Moeda',
  'Preço total 12x',
  'Parcela',
  'Nome da oferta (à vista −10%)',
  'Preço total à vista',
  'SKU principal',
  'Observações',
]

const faixasRows = TIERS.map((t) => [
  t.id,
  t.workers,
  productName(t.workers),
  'Pagamento único',
  'BRL',
  t.parcelado,
  t.parcela,
  offerName(t.workers),
  t.vista,
  `nr01_${t.id}`,
  t.obs,
])

const HEAD_CHECKOUTS = [
  'Linha',
  'Faixa',
  'Trabalhadores',
  'Checkout Tipo',
  'Nome do produto',
  'Preço (R$)',
  'Parcela (R$)',
  'SKU A',
  'SKU B',
  'Link Kiwify',
  'product_id',
  'Observações',
]

const checkoutRows = []
let linha = 1
for (const t of TIERS) {
  const slug = `nr01_${t.id}`
  checkoutRows.push([
    linha++,
    t.id,
    t.workers,
    '12x',
    productName(t.workers),
    t.parcelado,
    t.parcela,
    `${slug}_12x`,
    `${slug}_avista`,
    '',
    '',
    '',
  ])
  checkoutRows.push([
    linha++,
    t.id,
    t.workers,
    'à vista',
    offerName(t.workers),
    t.vista,
    0,
    `${slug}_avista`,
    `${slug}_12x`,
    '',
    '',
    '',
  ])
}

/** Colunas 0-based com numero (ponto decimal no Excel). */
function sheetFromRows(header, rows, numericCols) {
  const ws = {}
  const allRows = [header, ...rows]
  const maxC = header.length - 1

  for (let r = 0; r < allRows.length; r++) {
    for (let c = 0; c <= maxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const raw = allRows[r][c]
      if (r > 0 && numericCols.includes(c) && raw !== '' && raw != null) {
        ws[addr] = { t: 'n', v: Number(raw), z: '0.00' }
      } else {
        ws[addr] = { t: 's', v: raw == null ? '' : String(raw) }
      }
    }
  }

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: allRows.length - 1, c: maxC },
  })
  return ws
}

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(
  wb,
  sheetFromRows(HEAD_FAIXAS, faixasRows, [5, 6, 8]),
  SHEET_FAIXAS,
)
XLSX.utils.book_append_sheet(
  wb,
  sheetFromRows(HEAD_CHECKOUTS, checkoutRows, [0, 5, 6]),
  SHEET_CHECKOUTS,
)
XLSX.writeFile(wb, outXlsx)

function csvEscape(v) {
  const s = v === '' || v == null ? '' : typeof v === 'number' ? fmt2(v) : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rowToCsv(row) {
  return row.map(csvEscape).join(',')
}

function writeCsv(path, header, rows) {
  const csvRows = rows.map((r) =>
    r.map((v, i) => {
      if (typeof v === 'number' && (header === HEAD_FAIXAS ? [5, 6, 8] : [0, 5, 6]).includes(i)) {
        return fmt2(v)
      }
      return v
    }),
  )
  const lines = [rowToCsv(header), ...csvRows.map(rowToCsv)]
  writeFileSync(path, lines.join('\n') + '\n', 'utf8')
}

writeCsv(outCsv1, HEAD_FAIXAS, faixasRows)
writeCsv(outCsv2, HEAD_CHECKOUTS, checkoutRows)

console.log('OK', outXlsx)
console.log('Abas:', SHEET_FAIXAS, '|', SHEET_CHECKOUTS)
console.log(`Faixas: ${faixasRows.length} linhas (t01-t15) | Checkouts: ${checkoutRows.length} linhas`)
console.log('t11:', faixasRows.find((r) => r[0] === 't11')?.slice(0, 3).join(' | '))

let ok = true
for (const t of TIERS) {
  const f = faixasRows.find((r) => r[0] === t.id)
  const c12 = checkoutRows.find((r) => r[1] === t.id && r[3] === '12x')
  const cv = checkoutRows.find((r) => r[1] === t.id && r[3] === 'à vista')
  if (Number(f[5]) !== Number(c12[5]) || Number(f[8]) !== Number(cv[5])) {
    console.error('Divergencia preco', t.id)
    ok = false
  }
}
if (!faixasRows.some((r) => r[0] === 't11')) {
  console.error('FALTA t11')
  ok = false
}
for (const row of faixasRows) {
  const sku = row[9]
  const tier = row[0]
  const expected = `nr01_${tier}`
  if (sku !== expected || /t1l/i.test(sku)) {
    console.error('SKU invalido', tier, sku, 'esperado', expected)
    ok = false
  }
}
process.exit(ok ? 0 : 1)
