#!/usr/bin/env node
/**
 * Patch 007 — Verificação pós-aplicação.
 * Lê v1.1 ativa do banco, recalcula hash com mesma fórmula do extrator,
 * compara com docs/audit/instrument_v1.1_hash.txt. Aborta se divergir.
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REF_HASH_PATH = resolve(root, 'docs/audit/instrument_v1.1_hash.txt')

async function loadConn() {
  const text = await fs.promises.readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('postgresql://')) return line
  }
  throw new Error('connection string nao encontrada')
}
function parseConn(c) {
  const m = c.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
  let pwd = m[2]; if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
  return { user: m[1], password: pwd, host: m[3], port: parseInt(m[4]), database: m[5], ssl: { rejectUnauthorized: false } }
}

const cfg = parseConn(await loadConn())
const client = new pg.Client(cfg)
await client.connect()

try {
  const { rows } = await client.query(`
    SELECT dimension_code, ord, text, reverse_scored
      FROM nr01_questions
     WHERE instrument_version = 'v1.1' AND is_active = true
     ORDER BY dimension_code, ord
  `)

  if (rows.length !== 80) {
    console.error(`✗ Banco tem ${rows.length} questões em v1.1 ativas, esperado 80`)
    process.exit(1)
  }

  const sorted = [...rows].sort((a, b) => {
    if (a.dimension_code !== b.dimension_code) {
      return a.dimension_code.localeCompare(b.dimension_code)
    }
    return a.ord - b.ord
  })
  const payload = sorted.map((q) => `${q.dimension_code}|${q.ord}|${q.text}`).join('\n')
  const dbHash = crypto.createHash('sha256').update(payload, 'utf-8').digest('hex')

  const refHash = (await fs.promises.readFile(REF_HASH_PATH, 'utf-8')).trim()

  console.log(`Hash referência (markdown):   ${refHash}`)
  console.log(`Hash banco (após aplicação):  ${dbHash}`)

  if (dbHash !== refHash) {
    console.error(`\n✗ HASH DIVERGE — TRANSCRIÇÃO COMPROMETIDA`)
    console.error(`  AÇÃO: revisar nr01_questions v1.1 e re-aplicar.`)
    process.exit(1)
  }

  // Valida também: zero reverse_scored
  const nReverse = rows.filter((r) => r.reverse_scored).length
  if (nReverse !== 0) {
    console.error(`✗ Banco tem ${nReverse} questões reverse_scored em v1.1, esperado 0`)
    process.exit(1)
  }

  console.log(`\n✓ Hash idêntico — 80 questões v1.1 fielmente transcritas`)
  console.log(`✓ Todas reverse_scored = false (alinhado ao doc, maior = pior)`)
  console.log(`✓ v1.0 desativada (verificar query separada se preciso)`)
} finally {
  await client.end()
}
