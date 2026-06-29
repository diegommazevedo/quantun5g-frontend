import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const text = await readFile(join(root, '.env.local'), 'utf-8')
const env = {}
for (const raw of text.split('\n')) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue
  const eq = line.indexOf('=')
  if (eq < 0) continue
  env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
}

const id = process.argv[2]
const version = process.argv[3] ?? 'v1.1'
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const body = JSON.stringify({ instrument_version: version })
const out = execFileSync(
  'curl.exe',
  [
    '-sS', '-X', 'PATCH',
    '-H', `apikey: ${key}`,
    '-H', `Authorization: Bearer ${key}`,
    '-H', 'Content-Type: application/json',
    '-H', 'Prefer: return=representation',
    '-d', body,
    `${url}/rest/v1/nr01_assessments?id=eq.${id}`,
  ],
  { encoding: 'utf8' },
)
console.log(out)
