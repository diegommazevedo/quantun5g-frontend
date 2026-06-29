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

function rest(method, path, body) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`
  const args = [
    '-sS', '--connect-timeout', '30', '-X', method,
    '-H', `apikey: ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', `Authorization: Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', 'Content-Type: application/json',
    '-H', 'Prefer: return=representation',
  ]
  if (body !== undefined) args.push('-d', JSON.stringify(body))
  args.push(url)
  return execFileSync('curl.exe', args, { encoding: 'utf8' })
}

const id = 'fcfbde40-e767-41e1-93aa-3c46a5d878cb'
console.log('1) status -> CRIADO')
console.log(rest('PATCH', `nr01_assessments?id=eq.${id}`, { status: 'CRIADO' }))
console.log('2) instrument_version -> v1.1')
console.log(rest('PATCH', `nr01_assessments?id=eq.${id}`, { instrument_version: 'v1.1' }))
console.log('3) status -> COLETANDO')
console.log(rest('PATCH', `nr01_assessments?id=eq.${id}`, { status: 'COLETANDO' }))
