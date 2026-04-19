/**
 * QUANTUM5G — P6 · Cleanup do fixture de respostas
 *
 * Uso: node scripts/p6_cleanup.mjs <assessment_id>
 *
 * Remove TODAS as respostas e response_answers da avaliação informada.
 * Não toca em nada além disso (assessment, plano, pulsos preservados).
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
  let pwd = m[2]
  if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
  return {
    user: m[1], password: pwd, host: m[3],
    port: parseInt(m[4]), database: m[5],
    ssl: { rejectUnauthorized: false },
  }
}

const assessmentId = process.argv[2]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (!assessmentId || !UUID_RE.test(assessmentId)) {
  console.error('uso: node scripts/p6_cleanup.mjs <assessment_id>')
  process.exit(2)
}

const cfg = parseConn(await loadConn())
const client = new pg.Client(cfg)
await client.connect()
try {
  const res = await client.query('SELECT nr01_p6_cleanup_responses($1) AS summary', [assessmentId])
  console.log(JSON.stringify(res.rows[0].summary, null, 2))
} catch (err) {
  console.error('! ERRO:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
