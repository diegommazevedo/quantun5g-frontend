/**
 * QUANTUM5G — P6 · Injeção de fixture de respostas
 *
 * Uso:  node scripts/p6_inject.mjs <assessment_id>
 *
 * Pré-requisito: aplicar antes scripts/p6_fixture_responses.sql (cria as
 * funções nr01_p6_inject_responses e nr01_p6_cleanup_responses).
 *
 * Imprime jsonb de resumo retornado pela função.
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const root       = resolve(__dirname, '..')

async function loadEnv() {
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  let conn
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('postgresql://')) { conn = line; break }
  }
  if (!conn) throw new Error('connection string postgresql:// não encontrada em .env.local')
  return conn
}

function parseConn(connStr) {
  const m = connStr.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
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

if (!assessmentId) {
  console.error('uso: node scripts/p6_inject.mjs <assessment_id>')
  process.exit(2)
}
if (!UUID_RE.test(assessmentId)) {
  console.error('assessment_id não é um UUID válido')
  process.exit(2)
}

const cfg = parseConn(await loadEnv())
console.log(`-> conectando em ${cfg.host}:${cfg.port}/${cfg.database}`)

const client = new pg.Client(cfg)
await client.connect()

try {
  const res = await client.query('SELECT nr01_p6_inject_responses($1) AS summary', [assessmentId])
  console.log('\n✓ Fixture injetado com sucesso:\n')
  console.log(JSON.stringify(res.rows[0].summary, null, 2))
  console.log('\nPróximos passos manuais:')
  console.log('  1. /nr01/avaliacao/' + assessmentId + ' → Encerrar coleta')
  console.log('  2. → Processar resultados')
  console.log('  3. Continuar P6 (estações 8-13)')
} catch (err) {
  console.error('! ERRO:', err.message)
  if (err.detail) console.error('  detalhe:', err.detail)
  process.exit(1)
} finally {
  await client.end()
}
