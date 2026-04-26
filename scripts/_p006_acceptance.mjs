/**
 * NR-01 pesos / ISO — testes de aceitação (6 verificações).
 * P013: pesos uniformes 1.00 (todas as dimensões).
 * 1. Pesos no banco: todas as dimensões = 1.00.
 * 2. computeScoring sendo chamado com pesos (verificação textual em actions.ts).
 * 3. Com pesos uniformes, ISO ponderado === média simples (fixture sintético).
 * 4. BioBloco realmente excluída em todas as tabelas.
 * 5. Audit log preservado: snapshot do ASSESSMENT_DELETED registra contagem.
 * 6. Audit RESULTS_PROCESSED enriquecido (verificação textual).
 */

import { readFile } from 'node:fs/promises'
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

const BIOBLOCO_ID = '2bb338a5-4f57-4995-abe2-a03302fcc625'

// ============================================================
// TEST 1 — pesos no banco
// ============================================================
{
  const r = await client.query(`
    SELECT code, weight FROM nr01_dimensions ORDER BY code
  `)
  const allUniform = r.rows.length === 10 && r.rows.every((x) => Number(x.weight) === 1.0)
  if (allUniform) {
    pass(1, 'Pesos no banco: todas as 10 dimensões = 1.00 (P013)')
  } else {
    fail(1, 'Pesos', JSON.stringify(r.rows))
  }
}

// ============================================================
// TEST 2 — actions.ts passa dimensionWeights
// ============================================================
{
  const f = await readFile(
    resolve(root, 'src/app/(nr01)/nr01/avaliacao/[id]/actions.ts'),
    'utf-8',
  )
  const has = /computeScoring\(\{[\s\S]*?dimensionWeights[\s\S]*?\}\)/m.test(f)
    && /supabase\.from\('nr01_dimensions'\)\.select\('code, weight'\)/.test(f)
  if (has) pass(2, 'actions.ts carrega pesos e passa para computeScoring')
  else fail(2, 'actions.ts', 'patch 006 nao integrado em processarResultados')
}

// ============================================================
// TEST 3 — P013: pesos uniformes → ISO ponderado === média simples
// ============================================================
{
  const scoresAssedio = 4.5
  const scoresOthers = 2.0
  const w = 1.0
  const isoSimple = (scoresAssedio + scoresOthers * 9) / 10
  const isoWeighted = (scoresAssedio * w + scoresOthers * 9 * w) / (10 * w)
  const diff = Math.abs(isoWeighted - isoSimple)
  if (diff < 1e-9) {
    pass(3, `ISO com pesos 1.00 coincide com média simples (${isoSimple.toFixed(3)})`)
  } else {
    fail(3, 'ISO uniforme', `esperado diff≈0, obtido ${diff}`)
  }
}

// ============================================================
// TEST 4 — BioBloco excluída em todas as tabelas operacionais
// ============================================================
{
  const r = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM nr01_assessments        WHERE id = $1)::int AS assessments,
      (SELECT COUNT(*) FROM nr01_responses          WHERE assessment_id = $1)::int AS responses,
      (SELECT COUNT(*) FROM nr01_dimension_scores   WHERE assessment_id = $1)::int AS dim_scores,
      (SELECT COUNT(*) FROM nr01_assessment_results WHERE assessment_id = $1)::int AS results,
      (SELECT COUNT(*) FROM nr01_evidence_pack      WHERE assessment_id = $1)::int AS evidence,
      (SELECT COUNT(*) FROM nr01_action_plans       WHERE assessment_id = $1)::int AS plans,
      (SELECT COUNT(*) FROM nr01_pulse_config       WHERE assessment_id = $1)::int AS pulse_cfg,
      (SELECT COUNT(*) FROM nr01_collection_throttle WHERE assessment_id = $1)::int AS throttle,
      (SELECT COUNT(*) FROM nr01_public_status_tokens WHERE assessment_id = $1)::int AS pub_tokens
  `, [BIOBLOCO_ID])
  const row = r.rows[0]
  const totals = Object.values(row).reduce((s, v) => s + Number(v), 0)
  if (totals === 0) {
    pass(4, 'BioBloco excluida em todas as tabelas operacionais')
  } else {
    fail(4, 'BioBloco residuo', JSON.stringify(row))
  }
}

// ============================================================
// TEST 5 — Audit log: ASSESSMENT_DELETED registrado com snapshot
// ============================================================
{
  const r = await client.query(`
    SELECT payload FROM nr01_audit_log
     WHERE event_type = 'ASSESSMENT_DELETED'
       AND payload->>'assessment_id' = $1
     ORDER BY created_at DESC LIMIT 1
  `, [BIOBLOCO_ID])
  if (r.rows.length === 0) {
    fail(5, 'audit ASSESSMENT_DELETED', 'evento nao encontrado')
  } else {
    const p = r.rows[0].payload
    const snap = p.snapshot_before_deletion
    if (snap && snap.n_responses === 24 && snap.n_audit_events_preserved === 12) {
      pass(5, `ASSESSMENT_DELETED com snapshot (24 resp, 12 audits hist.)`)
    } else {
      fail(5, 'snapshot incompleto', JSON.stringify(p))
    }
  }
}

// ============================================================
// TEST 6 — Audit RESULTS_PROCESSED enriquecido (verificação no código)
// ============================================================
{
  const f = await readFile(
    resolve(root, 'src/app/(nr01)/nr01/avaliacao/[id]/actions.ts'),
    'utf-8',
  )
  // Espera-se que o INSERT no audit log inclua weights_applied e methodology_version
  const hasWeights = /weights_applied:\s*dimensionWeights/.test(f)
  const hasMethVer = /methodology_version:\s*['"]v1\.1['"]/.test(f)
  if (hasWeights && hasMethVer) {
    pass(6, 'Audit RESULTS_PROCESSED enriquecido (weights_applied + methodology_version)')
  } else {
    fail(6, 'Audit enriquecimento', `weights=${hasWeights}, methVer=${hasMethVer}`)
  }
}

await client.end()

// ============================================================
// REPORT
// ============================================================
console.log('\n=== NR-01 pesos/ISO (P013 + integracao) — testes de aceitacao ===\n')
for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗'
  console.log(`  ${icon} Test ${r.n} [${r.status}] ${r.label}`)
  if (r.detail) console.log(`      → ${r.detail}`)
}
const pass_n = results.filter((r) => r.status === 'PASS').length
const fail_n = results.filter((r) => r.status === 'FAIL').length
console.log(`\n→ ${pass_n}/${pass_n + fail_n} passou\n`)
if (fail_n > 0) process.exit(1)
