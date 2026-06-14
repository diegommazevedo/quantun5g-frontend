/** node --env-file=.env.local scripts/audit-dispatch-invites.mjs [reference_id] */
import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const env = await loadEnv()
const dbUrl =
  env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const refId = process.argv[2]
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()

let assessmentId = refId
if (!assessmentId) {
  const { rows } = await client.query(`
    SELECT a.id, a.name, c.name AS company
    FROM nr01_assessments a
    JOIN companies c ON c.id = a.company_id
    WHERE a.status = 'COLETANDO'
    ORDER BY a.updated_at DESC NULLS LAST
    LIMIT 1
  `)
  if (!rows[0]) {
    console.log('Nenhuma avaliacao COLETANDO')
    await client.end()
    process.exit(0)
  }
  assessmentId = rows[0].id
  console.log('Avaliacao:', rows[0].name, '|', rows[0].company, '|', assessmentId)
}

const { rows: invites } = await client.query(
  `
  SELECT cc.full_name, cc.email, si.email_status, si.email_sent_at, si.email_delivered_at,
         si.email_opened_at, si.opened_at, si.email_error
  FROM survey_invites si
  JOIN company_contacts cc ON cc.id = si.contact_id
  WHERE si.reference_id = $1 AND si.module = 'nr01' AND si.survey_kind = 'nr01_coleta'
  ORDER BY cc.email
  `,
  [assessmentId],
)

const label = (st) => {
  if (st === 'delivered') return 'ENTREGUE'
  if (st === 'sent') return 'ENVIADO (aguardando entrega)'
  if (st === 'failed') return 'FALHA'
  if (st === 'bounced') return 'REJEITADO (bounce)'
  if (st === 'complained') return 'SPAM'
  if (st === 'pending') return 'PENDENTE'
  return st ?? '—'
}

console.log('\n--- Por convite ---')
for (const r of invites) {
  console.log(`${label(r.email_status)} | ${r.full_name} <${r.email}>`)
  if (r.email_sent_at) console.log('  enviado:', r.email_sent_at)
  if (r.email_delivered_at) console.log('  entregue:', r.email_delivered_at)
  if (r.email_error) console.log('  erro:', r.email_error)
}

const { rows: batches } = await client.query(
  `
  SELECT b.id, b.sent_count, b.failed_count, b.created_at,
         json_agg(json_build_object('email', i.email, 'status', i.status, 'error', i.error_message) ORDER BY i.created_at) AS items
  FROM email_dispatch_batches b
  LEFT JOIN email_dispatch_items i ON i.batch_id = b.id
  WHERE b.reference_id = $1 AND b.module = 'nr01'
  GROUP BY b.id
  ORDER BY b.created_at DESC
  LIMIT 3
  `,
  [assessmentId],
)

for (const b of batches) {
  console.log('\n--- Lote', b.created_at, `(${b.sent_count} ok, ${b.failed_count} falha) ---`)
  for (const item of b.items ?? []) {
    if (!item?.email) continue
    console.log(`${item.status} | ${item.email}${item.error ? ' — ' + item.error : ''}`)
  }
}

await client.end()
