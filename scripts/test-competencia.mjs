/**
 * Testes da tokenização de competência.
 * Uso: node scripts/test-competencia.mjs
 */

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatPeriodMmYyyy(month, year) {
  return `${pad2(month)}/${year}`
}

function formatCompetenciaLabel(seq, month, year) {
  return `Q${seq} - ${formatPeriodMmYyyy(month, year)}`
}

function formatSurveyName(module, seq, month, year) {
  const MODULE_NAME = { pentagrama: 'PENTAGRAMA', nr01: 'NR01' }
  return `Q${seq} ${MODULE_NAME[module]} ${formatPeriodMmYyyy(month, year)}`
}

function maxSeqFromSurveyNames(names) {
  let max = 0
  for (const name of names) {
    const m = name.trim().match(/^Q(\d+)\b/i)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

function nextCompetenciaSeq(existingSeqs, existingNames) {
  const fromCol = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0
  const fromNames = maxSeqFromSurveyNames(existingNames)
  return Math.max(fromCol, fromNames) + 1
}

function parsePeriodMmYyyy(raw) {
  const t = raw.trim()
  const m = t.match(/^(\d{2})\/(\d{4})$/)
  if (!m) return null
  const month = parseInt(m[1], 10)
  const year = parseInt(m[2], 10)
  if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
  return { month, year }
}

function localDateISO(date = new Date()) {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

function addDaysISO(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return localDateISO(dt)
}

let failed = 0
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else {
    console.log('OK:', msg)
  }
}

ok(formatCompetenciaLabel(1, 5, 2026) === 'Q1 - 05/2026', 'label Q1')
ok(formatSurveyName('pentagrama', 1, 5, 2026) === 'Q1 PENTAGRAMA 05/2026', 'nome Pentagrama')
ok(formatSurveyName('nr01', 2, 6, 2026) === 'Q2 NR01 06/2026', 'nome NR01')
ok(maxSeqFromSurveyNames(['Q1 PENTAGRAMA 05/2026', 'Q3 NR01 01/2027']) === 3, 'max seq nomes')
ok(nextCompetenciaSeq([2], ['Q1 X']) === 3, 'next seq')
ok(parsePeriodMmYyyy('05/2026')?.month === 5, 'parse period')
ok(parsePeriodMmYyyy('13/2026') === null, 'month invalid')
ok(addDaysISO('2026-05-01', 15) === '2026-05-16', 'add days')

if (failed > 0) {
  process.exit(1)
}
console.log('\nTodos os testes de competência passaram.')
