/**
 * Remove empresas com cadastro pendente (mesmo critério da UI EmpresaGrid unified)
 * e diagnósticos Pentagrama + avaliações NR-01 vinculados.
 *
 * Preview: node --env-file=.env.local scripts/purge-pending-companies.mjs
 * Executar: node --env-file=.env.local scripts/purge-pending-companies.mjs --execute
 */

import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PENDING_COMPANIES_SQL = `
WITH il AS (
  SELECT company_id, count(*)::int AS n
  FROM company_contacts
  WHERE contact_role = 'leader' AND is_active = true
  GROUP BY company_id
)
SELECT c.id, c.name
FROM companies c
LEFT JOIN il ON il.company_id = c.id
WHERE NOT (
  (c.cnpj IS NOT NULL AND length(regexp_replace(c.cnpj, '[^0-9]', '', 'g')) = 14)
  AND (c.technical_lead_name IS NOT NULL AND trim(c.technical_lead_name) <> '')
  AND (c.technical_lead_crp IS NOT NULL AND trim(c.technical_lead_crp) <> '')
  AND (
    COALESCE(il.n, 0) > 0
    OR (
      c.il_leader_name IS NOT NULL AND trim(c.il_leader_name) <> ''
      AND c.il_leader_email IS NOT NULL AND trim(c.il_leader_email) <> ''
    )
  )
)
ORDER BY c.name;
`

async function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const env = {}
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return env
}

const execute = process.argv.includes('--execute')

const env = await loadEnv()
const password = env.SUPABASE_DB_PASSWORD
const dbUrl =
  env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()

try {
  const { rows: pending } = await client.query(PENDING_COMPANIES_SQL)
  const ids = pending.map((r) => r.id)

  if (ids.length === 0) {
    console.log('Nenhuma empresa com cadastro pendente.')
    process.exit(0)
  }

  console.log(`Empresas pendentes (${ids.length}):`)
  for (const r of pending) console.log(`  - ${r.name} (${r.id})`)

  const [{ count: diagCount }] = (
    await client.query('SELECT count(*)::int AS count FROM diagnostics WHERE company_id = ANY($1)', [ids])
  ).rows
  const [{ count: assessCount }] = (
    await client.query('SELECT count(*)::int AS count FROM nr01_assessments WHERE company_id = ANY($1)', [ids])
  ).rows

  console.log(`Diagnósticos Pentagrama: ${diagCount}`)
  console.log(`Avaliações NR-01: ${assessCount}`)

  if (!execute) {
    console.log('\nDry-run. Para excluir: node --env-file=.env.local scripts/purge-pending-companies.mjs --execute')
    process.exit(0)
  }

  await client.query('BEGIN')

  const assessIds = (
    await client.query('SELECT id FROM nr01_assessments WHERE company_id = ANY($1)', [ids])
  ).rows.map((r) => r.id)

  const diagIds = (
    await client.query('SELECT id FROM diagnostics WHERE company_id = ANY($1)', [ids])
  ).rows.map((r) => r.id)

  if (assessIds.length > 0) {
    await client.query('DELETE FROM hybrid_reports WHERE assessment_id = ANY($1)', [assessIds])
    await client.query(
      `DELETE FROM nr01_action_items
       WHERE action_plan_id IN (
         SELECT id FROM nr01_action_plans WHERE assessment_id = ANY($1)
       )`,
      [assessIds],
    )
    await client.query('DELETE FROM nr01_action_plans WHERE assessment_id = ANY($1)', [assessIds])
    await client.query('DELETE FROM nr01_evidence_pack WHERE assessment_id = ANY($1)', [assessIds])
    const delAssess = await client.query('DELETE FROM nr01_assessments WHERE id = ANY($1)', [assessIds])
    console.log(`NR-01 assessments removidas: ${delAssess.rowCount}`)
  }

  if (diagIds.length > 0) {
    await client.query('DELETE FROM hybrid_reports WHERE diagnostic_id = ANY($1)', [diagIds])
    const delDiag = await client.query('DELETE FROM diagnostics WHERE id = ANY($1)', [diagIds])
    console.log(`Diagnósticos removidos: ${delDiag.rowCount}`)
  }

  const delCo = await client.query('DELETE FROM companies WHERE id = ANY($1)', [ids])
  console.log(`Empresas removidas: ${delCo.rowCount}`)

  await client.query('COMMIT')
  console.log('OK — purge concluído.')
} catch (err) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('ERRO:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
