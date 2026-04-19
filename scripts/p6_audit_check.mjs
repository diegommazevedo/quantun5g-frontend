/**
 * QUANTUM5G — P6 · Estação 14 (verificação do audit log)
 *
 * Uso: node scripts/p6_audit_check.mjs <assessment_id>
 *
 * Imprime: (a) contagem por event_type para o assessment;
 *          (b) checklist 14 vs eventos esperados;
 *          (c) eventos faltantes (se houver).
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const root       = resolve(__dirname, '..')

async function loadConn() {
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('postgresql://')) return line
  }
  throw new Error('connection string postgresql:// não encontrada em .env.local')
}

function parseConn(c) {
  const m = c.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
  if (!m) throw new Error('connection string inválida')
  let pwd = m[2]; if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
  return {
    user: m[1], password: pwd, host: m[3],
    port: parseInt(m[4]), database: m[5],
    ssl: { rejectUnauthorized: false },
  }
}

const EXPECTED_EVENTS = [
  'ASSESSMENT_CREATED',
  'COLLECTION_OPENED',
  'RESPONSE_SUBMITTED',
  'COLLECTION_CLOSED',
  'RESULTS_PROCESSED',
  'ECONOMIC_RECALCULATED',
  'ACTION_PLAN_CREATED',
  'ACTION_ITEM_ADDED',
  'ACTION_ITEMS_AUTO_SUGGESTED',
  'ACTION_PLAN_APPROVED',
  'PULSE_MONITORING_ACTIVATED',
  'MICRO_PULSE_DISPATCHED',
  'MICRO_PULSE_RESPONDED',
  'EVIDENCE_PACK_GENERATED',
  'PDF_GENERATED',
  'PUBLIC_STATUS_TOKEN_CREATED',
  'PUBLIC_STATUS_ACCESSED',
  'PUBLIC_STATUS_PDF_DOWNLOADED',
]

const assessmentId = process.argv[2]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!assessmentId || !UUID_RE.test(assessmentId)) {
  console.error('uso: node scripts/p6_audit_check.mjs <assessment_id>')
  process.exit(2)
}

const cfg = parseConn(await loadConn())
const client = new pg.Client(cfg)
await client.connect()
try {
  const res = await client.query(
    `SELECT event_type, COUNT(*)::int AS n,
            MIN(created_at) AS first_at, MAX(created_at) AS last_at
       FROM nr01_audit_log
      WHERE assessment_id = $1
      GROUP BY event_type
      ORDER BY first_at`,
    [assessmentId],
  )

  const seen = new Set(res.rows.map((r) => r.event_type))

  console.log(`\n=== Audit log da avaliação ${assessmentId} ===\n`)
  if (res.rows.length === 0) {
    console.log('(nenhum evento registrado para este assessment_id)')
  } else {
    console.table(res.rows)
  }

  console.log('\n=== Checklist eventos esperados ===\n')
  let presentCount = 0
  for (const ev of EXPECTED_EVENTS) {
    const ok = seen.has(ev)
    if (ok) presentCount += 1
    console.log(`  ${ok ? '✓' : '✗'}  ${ev}`)
  }
  console.log(`\n→ ${presentCount}/${EXPECTED_EVENTS.length} eventos presentes`)

  const missing = EXPECTED_EVENTS.filter((ev) => !seen.has(ev))
  if (missing.length > 0) {
    console.log('\nEventos faltantes (estações não executadas ou falhas):')
    for (const ev of missing) console.log('  - ' + ev)
  } else {
    console.log('\n✓ Todos os eventos esperados estão presentes.')
  }
} catch (err) {
  console.error('! ERRO:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
