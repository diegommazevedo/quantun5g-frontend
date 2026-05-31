/**
 * Verifica se o Supabase configurado em .env.local responde.
 * Uso: node scripts/check_supabase.mjs
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function loadEnvLocal() {
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

async function main() {
  const env = await loadEnvLocal()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL ou chave anon/publishable no .env.local')
    process.exit(1)
  }

  console.log('URL:', url)
  const host = new URL(url).hostname

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10_000),
    })
    console.log('Auth health:', res.status, res.statusText)
    if (res.ok) {
      console.log('✅ Supabase acessível. Se o login falhar, resete a senha com:')
      console.log('   node scripts/create_admin_user.mjs suporte@quantun5g.com "SUA_SENHA"')
      return
    }
  } catch (err) {
    console.error('❌ Não foi possível ligar ao Supabase:', err.cause?.code ?? err.message)
    console.error('')
    console.error('O host', host, 'provavelmente não existe (projeto apagado/pauso).')
    console.error('1. Abra https://app.supabase.com e confirme o projeto ativo')
    console.error('2. Atualize .env.local com URL + chaves do projeto correto')
    console.error('3. Restaure backup: exports/db-backup-2026-05-03T23-40-22/dump.sql')
    console.error('4. node scripts/create_admin_user.mjs suporte@quantun5g.com "Penta@2026"')
    process.exit(1)
  }
}

main()
