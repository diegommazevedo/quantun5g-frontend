/**
 * QUANTUM5G — Runner SQL via pg
 * Executa arquivos SQL no Supabase em ordem, captura NOTICE/WARNING.
 *
 * Uso: node scripts/run_sql.mjs arquivo1.sql [arquivo2.sql ...]
 *
 * Lê credenciais de .env.local — host/db/user fixos do Supabase, senha
 * extraída da connection string `postgresql://postgres:[SENHA]@...`.
 *
 * Não imprime secrets. Aborta no primeiro erro.
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const root       = resolve(__dirname, '..')

// ---------- Carrega .env.local ----------
async function loadEnv() {
  const env = {}
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    env[key] = val
  }

  // A connection string do Supabase aparece no .env como linha solta:
  //   postgresql://postgres:[SENHA]@db.<ref>.supabase.co:5432/postgres
  // Onde [SENHA] vem entre colchetes (placeholder convertido em valor real).
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('postgresql://')) {
      env.__DATABASE_URL = line
      break
    }
  }
  return env
}

// ---------- Parse connection string ----------
function parseConn(connStr, fallbackHost) {
  // postgresql://postgres:[Bio@44502000]@db.<ref>.supabase.co:5432/postgres
  // O usuário pode ter deixado os colchetes em volta da senha — strip.
  const m = connStr.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
  if (!m) throw new Error('connection string inválida no .env.local')
  let pwd = m[2]
  if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
  return {
    user:     m[1],
    password: pwd,
    host:     m[3] || fallbackHost,
    port:     parseInt(m[4]),
    database: m[5],
    ssl:      { rejectUnauthorized: false },
  }
}

// ---------- Main ----------
const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('uso: node scripts/run_sql.mjs <arquivo.sql> [...]')
  process.exit(2)
}

const env = await loadEnv()
if (!env.__DATABASE_URL) {
  console.error('connection string postgresql:// não encontrada em .env.local')
  process.exit(2)
}

const cfg = parseConn(env.__DATABASE_URL)
console.log(`-> conectando em ${cfg.host}:${cfg.port}/${cfg.database} como ${cfg.user}`)

const client = new pg.Client(cfg)
client.on('notice', (msg) => console.log(`   [NOTICE] ${msg.message}`))

try {
  await client.connect()
} catch (err) {
  console.error(`! falha ao conectar: ${err.message}`)
  process.exit(3)
}

let allOk = true
for (const file of files) {
  const path = resolve(root, file)
  console.log(`\n=== ${file}`)
  let sql
  try {
    sql = await readFile(path, 'utf-8')
  } catch (err) {
    console.error(`! arquivo não encontrado: ${path}`)
    allOk = false
    break
  }
  try {
    const res = await client.query(sql)
    // Se for SELECT no fim, mostra rows
    if (Array.isArray(res)) {
      const last = res[res.length - 1]
      if (last?.rows?.length) {
        console.log('   resultado:')
        console.table(last.rows)
      }
    } else if (res?.rows?.length) {
      console.log('   resultado:')
      console.table(res.rows)
    }
    console.log(`   OK`)
  } catch (err) {
    console.error(`! ERRO em ${file}:`)
    console.error(`  ${err.message}`)
    if (err.position) console.error(`  posição: ${err.position}`)
    if (err.detail)   console.error(`  detalhe: ${err.detail}`)
    if (err.hint)     console.error(`  hint: ${err.hint}`)
    allOk = false
    break
  }
}

await client.end()
process.exit(allOk ? 0 : 1)
