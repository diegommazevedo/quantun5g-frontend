/**
 * Cria ou atualiza utilizador Supabase Auth + perfil admin.
 *
 * Uso:
 *   node scripts/create_admin_user.mjs <email> <senha>
 *
 * Requer .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 * O trigger handle_new_user usa raw_user_meta_data.role → 'admin'.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

async function loadEnvLocal() {
  const env = {}
  try {
    const text = await readFile(join(root, '.env.local'), 'utf-8')
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
  } catch {
    console.error('Falta .env.local na raiz do projeto.')
    process.exit(1)
  }
  return env
}

async function findUserByEmail(admin, email) {
  const target = email.trim().toLowerCase()
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === target)
    if (u) return u
    if (data.users.length < perPage) return null
    page += 1
  }
}

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  if (!email || !password) {
    console.error('Uso: node scripts/create_admin_user.mjs <email> <senha>')
    process.exit(1)
  }

  const env = await loadEnvLocal()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const meta = { role: 'admin', name: 'Suporte' }
  let userId

  const existing = await findUserByEmail(admin, email)
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, ...meta },
    })
    if (error) throw error
    userId = data.user.id
    console.log('Utilizador já existia: palavra-passe e metadata atualizadas.')
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: meta,
    })
    if (error) throw error
    userId = data.user.id
    console.log('Utilizador criado no Auth.')
  }

  const { error: upErr } = await admin
    .from('profiles')
    .update({
      role: 'admin',
      name: meta.name,
      email: email.trim().toLowerCase(),
    })
    .eq('id', userId)

  if (upErr) {
    console.error('Aviso ao atualizar profiles:', upErr.message)
    process.exit(1)
  }

  console.log('Perfil definido como admin. id:', userId)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
