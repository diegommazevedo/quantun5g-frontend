/**
 * Patch 007 — testes de aceitação (8).
 *
 * Tests 4 e 8 são OBRIGATÓRIOS (hash idêntico + inspeção visual de amostras).
 * Os outros são higiene de código + estado do banco.
 */

import { readFile } from 'node:fs/promises'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function loadConn() {
  const text = await readFile(join(root, '.env.local'), 'utf-8')
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

const results = []
function pass(n, label) { results.push({ n, label, status: 'PASS' }) }
function fail(n, label, detail) { results.push({ n, label, status: 'FAIL', detail }) }

// ============================================================
// TEST 1 — Script de extração rodou sem erro (artefatos existem)
// ============================================================
{
  try {
    const sqlExists = await readFile(resolve(root, 'supabase/nr01_patch_007_questoes_v1.1.sql'), 'utf-8')
    const hashExists = await readFile(resolve(root, 'docs/audit/instrument_v1.1_hash.txt'), 'utf-8')
    if (sqlExists.length > 1000 && /^[a-f0-9]{64}\s*$/i.test(hashExists.trim())) {
      pass(1, 'Script extração: SQL + hash gerados')
    } else {
      fail(1, 'Artefatos de extração', `sql=${sqlExists.length} bytes; hash=${hashExists.trim()}`)
    }
  } catch (err) {
    fail(1, 'Artefatos', err.message)
  }
}

// ============================================================
// TEST 2 — Hash registrado em arquivo de referência
// ============================================================
{
  const hash = (await readFile(resolve(root, 'docs/audit/instrument_v1.1_hash.txt'), 'utf-8')).trim()
  if (/^[a-f0-9]{64}$/.test(hash)) {
    pass(2, `Hash de referência registrado (${hash.slice(0, 12)}…)`)
  } else {
    fail(2, 'Hash format', hash)
  }
}

// ============================================================
// TEST 3 — SQL aplicado: 80 ativas v1.1, 0 ativas v1.0, 0 reverse
// ============================================================
{
  const r = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM nr01_questions WHERE instrument_version='v1.1' AND is_active=true) AS v11_active,
      (SELECT COUNT(*) FROM nr01_questions WHERE instrument_version='v1.0' AND is_active=true) AS v10_active,
      (SELECT COUNT(*) FROM nr01_questions WHERE instrument_version='v1.1' AND is_active=true AND reverse_scored=true) AS v11_reverse,
      (SELECT COUNT(DISTINCT dimension_code) FROM nr01_questions WHERE instrument_version='v1.1' AND is_active=true) AS v11_dims
  `)
  const row = r.rows[0]
  const ok = Number(row.v11_active) === 80 && Number(row.v10_active) === 0 && Number(row.v11_reverse) === 0 && Number(row.v11_dims) === 10
  if (ok) {
    pass(3, 'Banco: 80 v1.1 ativas, 0 v1.0 ativas, 0 reverse, 10 dimensões')
  } else {
    fail(3, 'Estado banco', JSON.stringify(row))
  }
}

// ============================================================
// TEST 4 — OBRIGATÓRIO: hash idêntico (markdown vs banco)
// ============================================================
{
  const refHash = (await readFile(resolve(root, 'docs/audit/instrument_v1.1_hash.txt'), 'utf-8')).trim()
  const r = await client.query(`
    SELECT dimension_code, ord, text
      FROM nr01_questions
     WHERE instrument_version='v1.1' AND is_active=true
     ORDER BY dimension_code, ord
  `)
  const sorted = [...r.rows].sort((a, b) => {
    if (a.dimension_code !== b.dimension_code) return a.dimension_code.localeCompare(b.dimension_code)
    return a.ord - b.ord
  })
  const payload = sorted.map((q) => `${q.dimension_code}|${q.ord}|${q.text}`).join('\n')
  const dbHash = crypto.createHash('sha256').update(payload, 'utf-8').digest('hex')
  if (dbHash === refHash) {
    pass(4, `[OBRIGATÓRIO] Hash idêntico (banco = markdown): ${dbHash.slice(0, 16)}…`)
  } else {
    fail(4, '[OBRIGATÓRIO] Hash divergente',
      `ref=${refHash.slice(0, 16)}… db=${dbHash.slice(0, 16)}…`)
  }
}

// ============================================================
// TEST 5 — View de pulses refeita (executável, escala mean Likert)
// ============================================================
{
  try {
    await client.query(`SELECT * FROM nr01_pulse_weekly_scores LIMIT 1`)
    // Vazia por design (sem dados de pulses); o que importa é executar sem erro.
    // Adicionalmente: a coluna que era score_pct (0-100) agora é mean Likert.
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'nr01_pulse_weekly_scores'
       ORDER BY ordinal_position
    `)
    const names = cols.rows.map((c) => c.column_name)
    if (names.includes('score_pct') && names.includes('n_respondents')) {
      pass(5, `View pulses refeita (cols: ${names.join(', ')})`)
    } else {
      fail(5, 'View pulses cols', names.join(', '))
    }
  } catch (err) {
    fail(5, 'View pulses query', err.message)
  }
}

// ============================================================
// TEST 6 — Metodologia: V1_1 presente, V1_0 ausente em código
// ============================================================
{
  const ev = await readFile(resolve(root, 'src/lib/nr01/evidence.ts'), 'utf-8')
  const tpl = await readFile(resolve(root, 'src/lib/nr01/pdf-template.ts'), 'utf-8')
  const act = await readFile(resolve(root, 'src/app/(nr01)/nr01/avaliacao/[id]/actions.ts'), 'utf-8')
  const newAct = await readFile(resolve(root, 'src/app/(nr01)/nr01/avaliacao/nova/actions.ts'), 'utf-8')

  const v11Defined = /export const METHODOLOGY_TEXT_V1_1\s*=/.test(ev)
  const v10Used = /\bMETHODOLOGY_TEXT_V1_0\b/.test(tpl) || /\bMETHODOLOGY_TEXT_V1_0\b/.test(act) || /\bMETHODOLOGY_TEXT_V1_0\b/.test(newAct)
  const v10ExportRemoved = !/export const METHODOLOGY_TEXT_V1_0\s*=/.test(ev)

  if (v11Defined && !v10Used && v10ExportRemoved) {
    pass(6, 'Metodologia V1_1 publicada; V1_0 removida sem refs órfãs')
  } else {
    fail(6, 'Metodologia migração',
      `v11Defined=${v11Defined} v10ExportRemoved=${v10ExportRemoved} v10StillUsed=${v10Used}`)
  }
}

// ============================================================
// TEST 7 — loadInstrument default v1.1; criarAvaliacao default v1.1
// ============================================================
{
  const inst = await readFile(resolve(root, 'src/lib/nr01/instrument.ts'), 'utf-8')
  const newAct = await readFile(resolve(root, 'src/app/(nr01)/nr01/avaliacao/nova/actions.ts'), 'utf-8')

  const loadDefault11 = /loadInstrument\(version\s*=\s*['"]v1\.1['"]\)/.test(inst)
  const createDefault11 = /instrument_version:\s*['"]v1\.1['"]/.test(newAct)

  if (loadDefault11 && createDefault11) {
    pass(7, 'Defaults v1.1: loadInstrument + criarAvaliacao')
  } else {
    fail(7, 'Defaults v1.1', `loadInstrument=${loadDefault11} criarAvaliacao=${createDefault11}`)
  }
}

// ============================================================
// TEST 8 — OBRIGATÓRIO: inspeção visual de 5 questões aleatórias
// (compara texto do banco com NR01_GRO.md linha-a-linha)
// ============================================================
{
  // Carrega o doc + extrai questões com mesmo método do extrator
  const docContent = await readFile(resolve(root, 'docs/audit/NR01_GRO.md'), 'utf-8')

  // Reusa lógica simplificada de extração (espelho do _extract_oficial_v1.1.mjs)
  const BLOCO_TO_DIMENSION = {
    2: 'carga_trabalho', 3: 'controle_autonomia', 4: 'exigencias_emocionais',
    5: 'reconhecimento', 6: 'relacoes_interpessoais', 7: 'estabilidade_seguranca',
    8: 'assedio_violencia', 9: 'organizacao_trabalho', 10: 'lideranca_gestao',
    11: 'saude_bem_estar',
  }
  const BLOCO_RE = /^BLOCO\s+(\d+)\s*[–-]\s*(.+)$/i
  const isHeader = (line) => {
    const t = line.trim()
    if (!t) return false
    if (BLOCO_RE.test(t)) return false
    const letters = t.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, '')
    if (letters.length < 5) return false
    const upper = letters.replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/g, '')
    return upper.length / letters.length >= 0.7
  }
  const docQs = []
  let curB = null, ord = 0
  for (const raw of docContent.split('\n')) {
    const line = raw.trim()
    const m = line.match(BLOCO_RE)
    if (m) { const n = parseInt(m[1], 10); curB = BLOCO_TO_DIMENSION[n] ? n : null; ord = 0; continue }
    if (curB == null) continue
    if (!line) continue
    if (isHeader(line)) { curB = null; continue }
    ord += 1
    docQs.push({ dim: BLOCO_TO_DIMENSION[curB], ord, text: line })
  }

  // Carrega as 80 do banco
  const r = await client.query(`
    SELECT dimension_code AS dim, ord, text
      FROM nr01_questions
     WHERE instrument_version='v1.1' AND is_active=true
     ORDER BY dimension_code, ord
  `)
  const dbQs = r.rows
  const dbMap = new Map(dbQs.map((q) => [`${q.dim}/${q.ord}`, q.text]))

  // 5 amostras pseudo-aleatórias mas determinísticas
  const indices = [3, 19, 41, 60, 77]
  const mismatches = []
  const samples = []
  for (const i of indices) {
    const docQ = docQs[i]
    if (!docQ) { mismatches.push(`idx=${i} sem doc`); continue }
    const dbText = dbMap.get(`${docQ.dim}/${docQ.ord}`)
    samples.push({ idx: i, dim: docQ.dim, ord: docQ.ord, doc: docQ.text, db: dbText })
    if (docQ.text !== dbText) {
      mismatches.push(`[${docQ.dim}/${docQ.ord}] doc=<${docQ.text}> db=<${dbText}>`)
    }
  }

  if (mismatches.length === 0) {
    pass(8, `[OBRIGATÓRIO] Inspeção visual 5/5 OK (índices ${indices.join(',')})`)
    console.log('\n  Amostras inspecionadas:')
    for (const s of samples) {
      console.log(`    [${s.dim}/${s.ord}] ${s.doc}`)
    }
  } else {
    fail(8, '[OBRIGATÓRIO] Inspeção visual divergente', mismatches.join(' || '))
  }
}

await client.end()

// ============================================================
// REPORT
// ============================================================
console.log('\n=== Patch 007 — testes de aceitacao ===\n')
for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗'
  console.log(`  ${icon} Test ${r.n} [${r.status}] ${r.label}`)
  if (r.detail) console.log(`      → ${r.detail}`)
}
const pass_n = results.filter((r) => r.status === 'PASS').length
const fail_n = results.filter((r) => r.status === 'FAIL').length
console.log(`\n→ ${pass_n}/${pass_n + fail_n} passou\n`)
if (fail_n > 0) process.exit(1)
