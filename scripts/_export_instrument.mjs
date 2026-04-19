/**
 * QUANTUM5G — Exporta o instrumento NR-01 v1.0 como TXT legível.
 * Uso: node scripts/_export_instrument.mjs > docs/nr01_instrumento_v1.0.txt
 */

import { readFile, writeFile } from 'node:fs/promises'
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
  throw new Error('connection string não encontrada')
}

function parseConn(c) {
  const m = c.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
  let pwd = m[2]; if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
  return {
    user: m[1], password: pwd, host: m[3],
    port: parseInt(m[4]), database: m[5],
    ssl: { rejectUnauthorized: false },
  }
}

const cfg = parseConn(await loadConn())
const client = new pg.Client(cfg)
await client.connect()

const dimsRes = await client.query(`
  SELECT code, ord, name, description, nr01_clause, weight
    FROM nr01_dimensions
   ORDER BY ord
`)
const qsRes = await client.query(`
  SELECT q.dimension_code, q.ord, q.text, q.reverse_scored
    FROM nr01_questions q
   WHERE q.instrument_version = 'v1.0' AND q.is_active = true
   ORDER BY q.dimension_code, q.ord
`)

await client.end()

// Agrupa
const byDim = new Map()
for (const q of qsRes.rows) {
  if (!byDim.has(q.dimension_code)) byDim.set(q.dimension_code, [])
  byDim.get(q.dimension_code).push(q)
}

// Renderiza
const lines = []
const today = new Date().toISOString().split('T')[0]

lines.push('='.repeat(78))
lines.push('QUANTUM5G — INSTRUMENTO NR-01 / GRO  ·  v1.0')
lines.push(`Data de extração: ${today}`)
lines.push(`Origem: nr01_questions (instrument_version = 'v1.0', is_active = true)`)
lines.push('Fundamentação: NR-01 (Portarias MTE 1.419/2024 e 765/2025) + Guia Técnico')
lines.push('               sobre Fatores de Risco Psicossocial (MTE/SIT 2024) + modelo')
lines.push('               de Maslach (Carga, Controle, Recompensa, Comunidade,')
lines.push('               Justiça, Valores).')
lines.push('='.repeat(78))
lines.push('')
lines.push('ESCALA LIKERT (5 pontos)')
lines.push('-'.repeat(78))
lines.push('  1 — Discordo totalmente')
lines.push('  2 — Discordo')
lines.push('  3 — Indiferente')
lines.push('  4 — Concordo')
lines.push('  5 — Concordo totalmente')
lines.push('')
lines.push('NOTA SOBRE QUESTÕES NEGATIVAS [REVERSA]')
lines.push('-'.repeat(78))
lines.push('Questões marcadas com [REVERSA] têm enunciado em sentido negativo.')
lines.push('O motor de cálculo aplica inversão automática (6 - resposta) antes de')
lines.push('agregar, de forma que o score final é monotônico:')
lines.push('  maior score = condição mais saudável (independente do enunciado).')
lines.push('')
lines.push('TOTAL: 80 questões  ·  10 dimensões  ·  8 questões por dimensão')
lines.push('')
lines.push('CLASSIFICAÇÃO DE RISCO (após normalização para 0-100)')
lines.push('-'.repeat(78))
lines.push('  ≥ 80   muito_baixo')
lines.push('  65-79  baixo')
lines.push('  50-64  atenção')
lines.push('  35-49  elevado')
lines.push('  < 35   crítico')
lines.push('')

let totalQuestions = 0

for (const dim of dimsRes.rows) {
  const qs = byDim.get(dim.code) ?? []
  totalQuestions += qs.length

  lines.push('')
  lines.push('━'.repeat(78))
  lines.push(`DIMENSÃO ${dim.ord}/10 — ${dim.name.toUpperCase()}`)
  lines.push('━'.repeat(78))
  lines.push(`Código:        ${dim.code}`)
  lines.push(`Peso no ISO:   ${Number(dim.weight).toFixed(2)}`)
  lines.push(`Norma:         ${dim.nr01_clause}`)
  lines.push('')
  lines.push('Descrição:')
  lines.push(`  ${dim.description}`)
  lines.push('')
  lines.push(`Questões (${qs.length}):`)
  lines.push('-'.repeat(78))

  for (const q of qs) {
    const reverseFlag = q.reverse_scored ? ' [REVERSA]' : ''
    const numero = String(q.ord).padStart(2, ' ')
    lines.push(`  ${numero}.${reverseFlag}`)
    lines.push(`      ${q.text}`)
    lines.push('')
  }
}

lines.push('')
lines.push('='.repeat(78))
lines.push(`FIM — ${totalQuestions} questões em ${dimsRes.rows.length} dimensões`)
lines.push('='.repeat(78))

const txt = lines.join('\n')
const outPath = resolve(root, 'docs/nr01_instrumento_v1.0.txt')
await writeFile(outPath, txt, 'utf-8')

console.log(`✓ ${totalQuestions} questões em ${dimsRes.rows.length} dimensões`)
console.log(`✓ Escrito em: ${outPath}`)
console.log(`  Tamanho: ${txt.length.toLocaleString('pt-BR')} bytes`)
