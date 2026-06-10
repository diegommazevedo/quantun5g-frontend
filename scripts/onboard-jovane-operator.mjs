/**
 * Operador Jovane — Pasola (7 CNPJs) + Empresa Teste Ltda
 * node --env-file=.env.local scripts/onboard-jovane-operator.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EMAIL = 'jovane@quantun5g.com'
const PASSWORD = '102030'
const NAME = 'Jovane Borline'

const PASOLA_CONSULTANT_ID = 'd88d61f8-19e2-4450-abb0-e43860fffa4b' // gerencia@pasola
const EMPRESA_TESTE_ID = 'aaaaaaaa-0001-0001-0001-000000000001'

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

async function findUserByEmail(admin, email) {
  const target = email.toLowerCase()
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === target)
    if (u) return u
    if (data.users.length < 1000) return null
    page += 1
  }
}

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId
  const existing = await findUserByEmail(admin, EMAIL)
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'consultant', name: NAME },
    })
    if (error) throw error
    userId = data.user.id
    console.log('Auth: atualizado', userId)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'consultant', name: NAME },
    })
    if (error) throw error
    userId = data.user.id
    console.log('Auth: criado', userId)
  }

  const { error: pErr } = await admin.from('profiles').upsert({
    id: userId,
    email: EMAIL,
    name: NAME,
    role: 'consultant',
    module_nr01: true,
    module_pentagrama: true,
    is_active: true,
  })
  if (pErr) throw pErr
  console.log('Profile: consultant + módulos')

  const { data: pasolaCos } = await admin
    .from('companies')
    .select('id, name, cnpj')
    .eq('consultant_id', PASOLA_CONSULTANT_ID)

  const ids = [...(pasolaCos ?? []).map((c) => c.id), EMPRESA_TESTE_ID]
  const { error: upErr } = await admin.from('companies').update({ consultant_id: userId }).in('id', ids)
  if (upErr) throw upErr
  console.log(`Empresas: ${ids.length} vinculadas (${pasolaCos?.length ?? 0} Pasola + Empresa Teste Ltda)`)

  const { data: inv } = await admin
    .from('commercial_invoices')
    .select('id, invoice_number')
    .eq('user_id', PASOLA_CONSULTANT_ID)
    .eq('status', 'paga')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (inv) {
    await admin
      .from('commercial_invoices')
      .update({ user_id: userId, consultant_id: userId, notes: 'Operador: jovane@quantun5g.com (RT Pasola)' })
      .eq('id', inv.id)
    console.log(`Fatura ${inv.invoice_number} transferida para ${EMAIL}`)
  }

  const { count } = await admin
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('consultant_id', userId)

  console.log(`\n✅ ${count} empresas · login ${EMAIL} / ${PASSWORD}`)
}

main().catch((e) => {
  console.error('ERRO:', e.message || e)
  process.exit(1)
})
