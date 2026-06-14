/**
 * Grupo Pasola: org + gerencia@ contratante + 7 CNPJs
 * node --env-file=.env.local scripts/setup-pasola-org.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONTRATANTE_EMAIL = 'gerencia@pasola.com.br'
const ORG_NAME = 'Grupo Pasola'
const PASOLA_CNPJS = [
  '27536937000132',
  '27536937000302',
  '27536937000484',
  '60642944000194',
  '32463549000290',
  '32463549000370',
  '32463549000451',
]

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

const env = await loadEnv()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const contratante = await findUserByEmail(admin, CONTRATANTE_EMAIL)
if (!contratante) throw new Error(`Usuário ${CONTRATANTE_EMAIL} não encontrado`)

const { data: jovane } = await admin
  .from('profiles')
  .select('id')
  .eq('email', 'jovane@quantun5g.com')
  .maybeSingle()

const consultantId = jovane?.id
if (!consultantId) throw new Error('Consultor jovane@ não encontrado')

await admin.from('profiles').update({
  role: 'contratante',
  module_pentagrama: true,
  module_nr01: true,
  is_active: true,
  name: 'Pasola — Gerência',
}).eq('id', contratante.id)

console.log('Profile contratante:', contratante.id)

const { data: existingOrg } = await admin
  .from('org_accounts')
  .select('id')
  .eq('owner_user_id', contratante.id)
  .maybeSingle()

let orgId = existingOrg?.id
if (!orgId) {
  const { data: created, error } = await admin
    .from('org_accounts')
    .insert({
      name: ORG_NAME,
      owner_user_id: contratante.id,
      consultant_id: consultantId,
    })
    .select('id')
    .single()
  if (error) throw error
  orgId = created.id
  console.log('Org criada:', orgId)
} else {
  await admin.from('org_accounts').update({
    name: ORG_NAME,
    consultant_id: consultantId,
  }).eq('id', orgId)
  console.log('Org existente:', orgId)
}

const { data: companies } = await admin
  .from('companies')
  .select('id, name, cnpj')
  .in('cnpj', PASOLA_CNPJS)

const linked = (companies ?? []).map((c) => c.id)
const { error: linkErr } = await admin
  .from('companies')
  .update({ org_account_id: orgId })
  .in('id', linked)

if (linkErr) throw linkErr
console.log(`CNPJs vinculados à org: ${linked.length}`)
for (const c of companies ?? []) console.log(' -', c.name, c.cnpj)

console.log('OK Pasola org')
