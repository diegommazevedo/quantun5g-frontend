/**
 * Onboarding Pasola — 7 CNPJs + consultor gerencia@pasola.com.br
 * node --env-file=.env.local scripts/onboard-pasola.mjs
 * Dry-run: node --env-file=.env.local scripts/onboard-pasola.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DRY = process.argv.includes('--dry-run')
const EMAIL = 'gerencia@pasola.com.br'
const PASSWORD = 'Pasola@RZ'
const CONSULTANT_NAME = 'Pasola — Gerência'
const SLOTS_KEY = 'company_cnpj_slots'

const COMPANIES = [
  { cnpj: '27536937000132', name: 'Pasola', trade_name: 'Pasola', total: 33 },
  { cnpj: '27536937000302', name: 'Imigrante Peças', trade_name: 'Imigrante Peças', total: 6 },
  { cnpj: '27536937000484', name: 'JM Distribuidora Automotiva', trade_name: 'JM', total: 4 },
  { cnpj: '60642944000194', name: 'Imigrantes Serviços Ltda', trade_name: 'Imigrantes Serviços', total: 9 },
  { cnpj: '32463549000290', name: 'SMAP Auto Peças 02-90', trade_name: 'SMAP 0002-90', total: 10 },
  { cnpj: '32463549000370', name: 'SMAP Auto Peças 03-70', trade_name: 'SMAP 0003-70', total: 27 },
  { cnpj: '32463549000451', name: 'SMAP Auto Peças 04-51', trade_name: 'SMAP 0004-51', total: 5 },
]

const RT = {
  name: 'Jovane Borline da Silva',
  crp: 'CRP 16/4948',
  profession: 'Psicólogo',
  email: 'fzenithbd@outlook.com',
}

const IL = { name: 'Renan Fazolo Falqueto', email: EMAIL }

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

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

async function upsertIlContact(admin, companyId) {
  const { data: ex } = await admin
    .from('company_contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', IL.email)
    .eq('contact_role', 'leader')
    .maybeSingle()
  if (ex) return
  const { error } = await admin.from('company_contacts').insert({
    company_id: companyId,
    full_name: IL.name,
    email: IL.email,
    contact_role: 'leader',
    is_active: true,
  })
  if (error) throw error
}

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(DRY ? '=== DRY RUN ===' : '=== ONBOARD PASOLA ===\n')

  let userId
  const existingUser = await findUserByEmail(admin, EMAIL)

  if (DRY) {
    userId = existingUser?.id ?? '(novo)'
    console.log('1. Usuário:', existingUser ? `existe ${userId}` : 'seria criado')
  } else {
    if (existingUser) {
      const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'consultant', name: CONSULTANT_NAME },
      })
      if (error) throw error
      userId = data.user.id
      console.log('1. Auth: senha/metadata atualizadas')
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'consultant', name: CONSULTANT_NAME },
      })
      if (error) throw error
      userId = data.user.id
      console.log('1. Auth: criado', userId)
    }

    const { error: pErr } = await admin.from('profiles').upsert({
      id: userId,
      email: EMAIL,
      name: CONSULTANT_NAME,
      role: 'consultant',
      module_nr01: true,
      module_pentagrama: true,
      is_active: true,
    })
    if (pErr) throw pErr
    console.log('2. Profile: consultant + NR-01 + Pentagrama ativos')
  }

  const cnpjs = COMPANIES.map((c) => c.cnpj)
  const { data: existingCos } = await admin
    .from('companies')
    .select('id, name, cnpj, consultant_id')
    .in('cnpj', cnpjs)

  console.log('\n3. CNPJs no banco:')
  for (const co of COMPANIES) {
    const row = (existingCos ?? []).find((r) => r.cnpj === co.cnpj)
    if (row) {
      const same = row.consultant_id === userId || userId === '(novo)'
      console.log(`   ${co.cnpj} → ${row.name} (${same ? 'reassign' : 'migrar de outro consultor'})`)
    } else {
      console.log(`   ${co.cnpj} → (novo) ${co.name}`)
    }
  }

  if (!DRY) {
    const { data: paidInv } = await admin
      .from('commercial_invoices')
      .select('id, invoice_number, metadata')
      .eq('user_id', userId)
      .eq('status', 'paga')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const paidSlots = Number(paidInv?.metadata?.[SLOTS_KEY] ?? 0)
    if (paidInv && paidSlots >= 7) {
      console.log(`\n4. Fatura paga já existe: ${paidInv.invoice_number} (${paidSlots} slots)`)
    } else {
      const { data: invNum, error: numErr } = await admin.rpc('next_commercial_invoice_number')
      if (numErr) throw numErr
      const now = new Date().toISOString()
      const { error: invErr } = await admin.from('commercial_invoices').insert({
        invoice_number: String(invNum),
        status: 'paga',
        user_id: userId,
        consultant_id: userId,
        created_by: userId,
        product_id: 'nr01',
        plan_id: 'combo_nr01_t10_pent_operacional',
        amount_cents: 1_580_400,
        billing_mode: 'anual_parcelado',
        include_pentagrama: true,
        headcount_declared: 94,
        metadata: {
          invoice_kind: 'combo',
          modules: { nr01: true, pentagrama: true },
          tier_id: 't10',
          pentagrama_plan_id: 'pent_operacional',
          [SLOTS_KEY]: 7,
          client_cnpj: COMPANIES[0].cnpj,
          client_email: EMAIL,
          onboarding: 'pasola_script_2026-06-09',
        },
        notes: 'Onboarding Pasola — 7 CNPJs (combo NR-01 + Pentagrama)',
        paid_at: now,
        paid_by: userId,
        approved_at: now,
        approved_by: userId,
      })
      if (invErr) throw invErr
      console.log(`\n4. Fatura ${invNum} criada (paga, 7 CNPJs)`)
    }
  } else {
    console.log('\n4. Fatura: criaria combo paga com 7 slots')
  }

  console.log('\n5. Empresas:')
  for (const co of COMPANIES) {
    const existingCo = (existingCos ?? []).find((r) => r.cnpj === co.cnpj)
    const payload = {
      name: co.name,
      trade_name: co.trade_name,
      legal_name: co.name,
      cnpj: co.cnpj,
      name_normalized: normalizeName(co.name),
      total_collaborators: co.total,
      consultant_id: userId,
      account_user_id: null,
      rh_contact_name: IL.name,
      rh_contact_email: IL.email,
      technical_lead_name: RT.name,
      technical_lead_crp: RT.crp,
      technical_lead_profession: RT.profession,
      technical_lead_email: RT.email,
      il_leader_name: IL.name,
      il_leader_email: IL.email,
    }

    if (DRY) {
      console.log(`   ${existingCo ? 'UPDATE' : 'INSERT'} ${co.name} (${co.total}p)`)
      continue
    }

    if (existingCo) {
      const { error } = await admin.from('companies').update(payload).eq('id', existingCo.id)
      if (error) throw error
      console.log(`   ✓ Atualizado: ${co.name}`)
      await upsertIlContact(admin, existingCo.id)
    } else {
      const { data, error } = await admin.from('companies').insert(payload).select('id').single()
      if (error) throw error
      console.log(`   ✓ Criado: ${co.name}`)
      await upsertIlContact(admin, data.id)
    }
  }

  if (!DRY) {
    const { count } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('consultant_id', userId)

    console.log(`\n✅ Concluído: ${count}/7 empresas em ${EMAIL}`)
    console.log('   Login: https://www.quantun5g.app/login')
    console.log(`   Senha: ${PASSWORD}`)
    console.log('   Rota: /empresas (banner 7 CNPJs com LICENSING_V2)')
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message || e)
  process.exit(1)
})
