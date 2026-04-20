#!/usr/bin/env node
/**
 * Patch 008 — Verificação pós-aplicação dos laudos canônicos.
 * Lê 50 micros + 5 macros do banco, recalcula hash com mesma fórmula
 * do extrator, compara com docs/audit/laudos_v1.1_hash.txt.
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REF_HASH_PATH = resolve(root, 'docs/audit/laudos_v1.1_hash.txt')

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
  const { rows: micros } = await client.query(`
    SELECT dimension_code, nivel_risco, texto_principal, texto_recomendacao
      FROM nr01_laudo_textos
     WHERE instrument_version = 'v1.1' AND is_active = true
     ORDER BY dimension_code, nivel_risco
  `)
  const { rows: macros } = await client.query(`
    SELECT nivel_risco, texto_principal, texto_recomendacao
      FROM nr01_laudo_macros
     WHERE instrument_version = 'v1.1' AND is_active = true
     ORDER BY nivel_risco
  `)

  if (micros.length !== 50) {
    console.error(`✗ Banco tem ${micros.length} laudos micro v1.1, esperado 50`)
    process.exit(1)
  }
  if (macros.length !== 5) {
    console.error(`✗ Banco tem ${macros.length} laudos macro v1.1, esperado 5`)
    process.exit(1)
  }

  const sm = [...micros].sort((a, b) =>
    a.dimension_code === b.dimension_code
      ? a.nivel_risco.localeCompare(b.nivel_risco)
      : a.dimension_code.localeCompare(b.dimension_code),
  )
  const sM = [...macros].sort((a, b) => a.nivel_risco.localeCompare(b.nivel_risco))

  const microPayload = sm
    .map((l) => `MICRO|${l.dimension_code}|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')
  const macroPayload = sM
    .map((l) => `MACRO|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')

  const dbHash = crypto
    .createHash('sha256')
    .update(microPayload + '\n---\n' + macroPayload, 'utf-8')
    .digest('hex')

  const refHash = (await fs.promises.readFile(REF_HASH_PATH, 'utf-8')).trim()

  console.log(`Hash referência (markdown):  ${refHash}`)
  console.log(`Hash banco (após aplicação): ${dbHash}`)

  if (dbHash !== refHash) {
    console.error(`\n✗ HASH DIVERGE — TRANSCRIÇÃO COMPROMETIDA`)
    process.exit(1)
  }

  console.log(`\n✓ Hash idêntico — 50 micros + 5 macros fielmente transcritos`)
  console.log(`✓ 10 dimensões × 5 níveis cobertas em micros`)
} finally {
  await client.end()
}
