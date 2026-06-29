import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const text = await readFile(join(root, '.env.local'), 'utf-8')
const text = await readFile(join(root, '.env.local'), 'utf-8')
const conn =
  text.split('\n').map((l) => l.trim()).find((l) => l.startsWith('postgresql://')) ??
  (() => {
    const env = {}
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
    const host = env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '')
    const pwd = env.SUPABASE_DB_PASSWORD
    if (host && pwd) {
      return `postgresql://postgres:${encodeURIComponent(pwd)}@db.${host}.supabase.co:5432/postgres`
    }
    return null
  })()
if (!conn) throw new Error('connection string não encontrada em .env.local')
const m = conn.match(/^postgresql:\/\/([^:]+):(.+)@([^:/]+):(\d+)\/(.+)$/)
let pwd = m[2]
if (pwd.startsWith('[') && pwd.endsWith(']')) pwd = pwd.slice(1, -1)
const client = new pg.Client({
  user: m[1],
  password: pwd,
  host: m[3],
  port: +m[4],
  database: m[5],
  ssl: { rejectUnauthorized: false },
})
await client.connect()
const r = await client.query(`
  SELECT a.id, a.title, a.status, a.instrument_version, a.collection_token,
         c.name AS company_name,
         (SELECT count(*)::int FROM nr01_responses r WHERE r.assessment_id = a.id) AS responses
  FROM nr01_assessments a
  LEFT JOIN companies c ON c.id = a.company_id
  WHERE a.status IN ('COLETANDO', 'CRIADO')
  ORDER BY a.created_at DESC
  LIMIT 10
`)
console.table(r.rows)
await client.end()
