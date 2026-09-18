/**
 * Onboard OSS Assessoria Contábil — contratante Rafaela + 1 CNPJ
 * NR-01 + Pentagrama permanentes (subscriptions active, expires_at NULL).
 *
 * Decisões:
 * - Marcus = metaassessoriadp@gmail.com; Oscar = dp@ossassessoria.com.br
 *   (e-mails distintos; UNIQUE company_id+email).
 * - RT = Jovane Borlini CRP 16/4948.
 *
 * node --env-file=.env.local scripts/onboard-oss-assessoria.mjs --dry-run
 * node --env-file=.env.local scripts/onboard-oss-assessoria.mjs
 */

import { randomBytes, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')

const CONTRATANTE = {
  email: 'rafaelafc@ossassessoria.com.br',
  name: 'Rafaela Peruchi Passos',
  phone: '27 99968-6728',
}

const COMPANY = {
  cnpj: '33035046000103',
  name: 'OSS ASSESSORIA CONTABIL',
  trade_name: 'OSS Assessoria Contábil',
  legal_name: 'OSS ASSESSORIA CONTABIL',
  total_collaborators: 6,
}

const RT = {
  name: 'Jovane Borlini da Silva',
  crp: 'CRP 16/4948',
  profession: 'Psicólogo',
  email: 'jovane@quantun5g.com',
}

const CONSULTANT_EMAIL = 'jovane@quantun5g.com'
const ORG_NAME = 'OSS Assessoria Contábil'
const SLOTS_KEY = 'company_cnpj_slots'

/** Telefones só para log — company_contacts não tem coluna phone. */
const CONTACTS = [
  {
    full_name: 'Rafaela Peruchi Passos',
    email: 'rafaelafc@ossassessoria.com.br',
    contact_role: 'collaborator',
    job_title: 'Encarregada do Setor Fiscal',
    department: 'Fiscal',
    phone: '27 99968-6728',
  },
  {
    full_name: 'Marcus Vinícius Marassati',
    email: 'metaassessoriadp@gmail.com',
    contact_role: 'collaborator',
    job_title: 'Encarregado setor departamento de pessoal',
    department: 'Departamento Pessoal',
    phone: '27 99950-0303',
  },
  {
    full_name: 'Oscar David Varon',
    email: 'dp@ossassessoria.com.br',
    contact_role: 'collaborator',
    job_title: 'Analista de Departamento de Pessoal',
    department: 'Departamento Pessoal',
    phone: '27 99262-1841',
  },
  {
    full_name: 'Luiz Felipe Crispim',
    email: 'legalizacao1@ossassessoria.com.br',
    contact_role: 'collaborator',
    job_title: 'Auxiliar administrativo',
    department: 'Administrativo',
    phone: '27 99623-6497',
  },
  {
    full_name: 'Matheus Molina Muniz',
    email: 'legalizacao@ossassessoria.com.br',
    contact_role: 'collaborator',
    job_title: 'Analista de legalização',
    department: 'Legalização',
    phone: '27 99984-8782',
  },
  {
    full_name: 'Giovanna Bastos',
    email: 'contabil3@ossassessoria.com.br',
    contact_role: 'collaborator',
    job_title: 'Analista contábil',
    department: 'Contábil',
    phone: '27 99984-0308',
  },
]

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function genTempPassword() {
  return `Oss@${randomBytes(6).toString('base64url')}`
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

async function resolveConsultantId(admin) {
  const { data: jovane } = await admin
    .from('profiles')
    .select('id')
    .eq('email', CONSULTANT_EMAIL)
    .maybeSingle()
  if (jovane?.id) return jovane.id

  const { data: adminProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (adminProfile?.id) {
    console.warn('⚠ jovane@ não encontrado — usando admin ativo como consultant_id')
    return adminProfile.id
  }
  throw new Error('Nenhum consultant/admin para companies.consultant_id')
}

async function upsertContact(admin, companyId, contact) {
  const email = contact.email.toLowerCase()
  const { data: ex } = await admin
    .from('company_contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', email)
    .maybeSingle()

  const row = {
    company_id: companyId,
    full_name: contact.full_name,
    email,
    contact_role: contact.contact_role,
    job_title: contact.job_title,
    department: contact.department,
    is_active: true,
  }

  if (ex) {
    const { error } = await admin.from('company_contacts').update(row).eq('id', ex.id)
    if (error) throw error
    return { id: ex.id, action: 'update' }
  }
  const { data, error } = await admin.from('company_contacts').insert(row).select('id').single()
  if (error) throw error
  return { id: data.id, action: 'insert' }
}

async function ensureInvoice(admin, userId, consultantId) {
  const { data: existing } = await admin
    .from('commercial_invoices')
    .select('id, invoice_number, metadata, subscription_id, company_id')
    .eq('user_id', userId)
    .eq('status', 'paga')
    .contains('metadata', { onboarding: 'oss_assessoria_script' })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log(`4. Fatura já existe: ${existing.invoice_number}`)
    return existing
  }

  const { data: invNum, error: numErr } = await admin.rpc('next_commercial_invoice_number')
  if (numErr) throw numErr
  const now = new Date().toISOString()
  const insert = {
    invoice_number: String(invNum),
    status: 'paga',
    user_id: userId,
    consultant_id: consultantId,
    created_by: consultantId,
    product_id: 'nr01',
    plan_id: 'combo_nr01_t10_pent_operacional',
    amount_cents: 1,
    billing_mode: 'anual_parcelado',
    include_pentagrama: true,
    headcount_declared: COMPANY.total_collaborators,
    metadata: {
      invoice_kind: 'combo',
      modules: { nr01: true, pentagrama: true },
      tier_id: 't10',
      pentagrama_plan_id: 'pent_operacional',
      [SLOTS_KEY]: 1,
      client_cnpj: COMPANY.cnpj,
      client_email: CONTRATANTE.email,
      onboarding: 'oss_assessoria_script',
      grant_reason: 'manual_onboard_oss_assessoria',
    },
    notes: 'Onboarding OSS Assessoria Contábil — combo NR-01 + Pentagrama (manual)',
    paid_at: now,
    paid_by: consultantId,
    approved_at: now,
    approved_by: consultantId,
  }

  const { data, error } = await admin.from('commercial_invoices').insert(insert).select('*').single()
  if (error) throw error
  console.log(`4. Fatura ${data.invoice_number} criada (paga, 1 slot)`)
  return data
}

async function ensureSubscriptions(admin, userId, companyId, invoice) {
  const now = new Date().toISOString()
  const { data: existingSubs } = await admin
    .from('subscriptions')
    .select('id, product_id, status, expires_at, metadata, company_id')
    .eq('user_id', userId)

  const results = {}

  for (const productId of ['nr01', 'pentagrama']) {
    const already = (existingSubs ?? []).find((s) => s.product_id === productId && s.status === 'active')
    const baseMeta =
      productId === 'nr01'
        ? {
            gateway: 'commercial_invoice',
            commercial_invoice_id: invoice.id,
            commercial_invoice_number: invoice.invoice_number,
            customer_cnpj: COMPANY.cnpj,
            needs_company_onboarding: false,
            tier_id: 't10',
            entitlements: [
              'core_nr01',
              'email_broadcast',
              'pdca',
              'evidence_pack',
              'support_email',
              'pentagrama_ginger',
            ],
            grant_reason: 'manual_onboard_oss_assessoria',
            provisioned_at: now,
          }
        : {
            gateway: 'commercial_invoice',
            commercial_invoice_id: invoice.id,
            commercial_invoice_number: invoice.invoice_number,
            grant_reason: 'manual_onboard_oss_assessoria',
            provisioned_at: now,
          }

    if (already) {
      const prevMeta = already.metadata && typeof already.metadata === 'object' ? already.metadata : {}
      const { error } = await admin
        .from('subscriptions')
        .update({
          expires_at: null,
          status: 'active',
          company_id: companyId ?? already.company_id,
          metadata: { ...prevMeta, ...baseMeta },
        })
        .eq('id', already.id)
      if (error) throw error
      console.log(`5. [${productId}] subscription ativa atualizada (${already.id})`)
      results[productId] = already.id
      continue
    }

    const subId = randomUUID()
    const { error } = await admin.from('subscriptions').insert({
      id: subId,
      user_id: userId,
      product_id: productId,
      plan_id: productId === 'nr01' ? 'nr01_t10' : 'pent_operacional',
      company_id: companyId,
      status: 'active',
      starts_at: now,
      expires_at: null,
      assessments_remaining: productId === 'nr01' ? 99 : 1,
      metadata: baseMeta,
    })
    if (error) throw error
    console.log(`5. [${productId}] subscription criada (${subId})`)
    results[productId] = subId
  }

  if (!invoice.subscription_id && results.nr01) {
    const { error } = await admin
      .from('commercial_invoices')
      .update({ subscription_id: results.nr01, company_id: companyId })
      .eq('id', invoice.id)
    if (error) throw error
  }

  return results
}

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(DRY ? '=== DRY RUN — OSS ASSESSORIA ===\n' : '=== ONBOARD OSS ASSESSORIA ===\n')
  console.log('Telefones (não persistem no BD):')
  for (const c of CONTACTS) {
    console.log(`  - ${c.full_name}: ${c.phone}${c.note ? ` [${c.note}]` : ''}`)
  }
  console.log('')

  const consultantId = await resolveConsultantId(admin)
  console.log('Consultor operacional:', consultantId)

  const existingUser = await findUserByEmail(admin, CONTRATANTE.email)
  const resetPassword = process.argv.includes('--reset-password') || !existingUser
  const tempPassword = genTempPassword()
  let userId = existingUser?.id ?? null
  let passwordPrinted = null

  if (DRY) {
    console.log('1. Auth:', existingUser ? `existe ${userId}` : 'seria criado')
    console.log('2. Profile: contratante + modules')
    console.log('3. Org:', ORG_NAME)
    console.log('4. Fatura combo paga (1 slot)')
    console.log('5. Subs nr01 + pentagrama permanentes')
    console.log('6. Company CNPJ', COMPANY.cnpj)
    console.log('7. Contacts:', CONTACTS.length)
    return
  }

  if (existingUser) {
    const patch = {
      email_confirm: true,
      user_metadata: { role: 'contratante', name: CONTRATANTE.name },
    }
    if (resetPassword) {
      patch.password = tempPassword
      passwordPrinted = tempPassword
    }
    const { data, error } = await admin.auth.admin.updateUserById(existingUser.id, patch)
    if (error) throw error
    userId = data.user.id
    console.log(
      resetPassword
        ? '1. Auth: usuário existente atualizado (senha resetada)'
        : '1. Auth: usuário existente atualizado (senha mantida)',
    )
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: CONTRATANTE.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: 'contratante', name: CONTRATANTE.name },
    })
    if (error) throw error
    userId = data.user.id
    passwordPrinted = tempPassword
    console.log('1. Auth: criado', userId)
  }

  const { error: pErr } = await admin.from('profiles').upsert({
    id: userId,
    email: CONTRATANTE.email,
    name: CONTRATANTE.name,
    role: 'contratante',
    module_nr01: true,
    module_pentagrama: true,
    is_active: true,
  })
  if (pErr) throw pErr
  console.log('2. Profile: contratante + NR-01 + Pentagrama')

  const { data: existingOrg } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  let orgId = existingOrg?.id
  if (!orgId) {
    const { data: created, error } = await admin
      .from('org_accounts')
      .insert({
        name: ORG_NAME,
        owner_user_id: userId,
        consultant_id: consultantId,
      })
      .select('id')
      .single()
    if (error) throw error
    orgId = created.id
    console.log('3. Org criada:', orgId)
  } else {
    const { error } = await admin
      .from('org_accounts')
      .update({ name: ORG_NAME, consultant_id: consultantId })
      .eq('id', orgId)
    if (error) throw error
    console.log('3. Org existente:', orgId)
  }

  const invoice = await ensureInvoice(admin, userId, consultantId)

  const { data: existingCo } = await admin
    .from('companies')
    .select('id, cnpj')
    .eq('cnpj', COMPANY.cnpj)
    .maybeSingle()

  const companyPayload = {
    name: COMPANY.name,
    trade_name: COMPANY.trade_name,
    legal_name: COMPANY.legal_name,
    cnpj: COMPANY.cnpj,
    name_normalized: normalizeName(COMPANY.name),
    total_collaborators: COMPANY.total_collaborators,
    consultant_id: consultantId,
    account_user_id: userId,
    org_account_id: orgId,
    rh_contact_name: CONTRATANTE.name,
    rh_contact_email: CONTRATANTE.email,
    technical_lead_name: RT.name,
    technical_lead_crp: RT.crp,
    technical_lead_profession: RT.profession,
    technical_lead_email: RT.email,
    il_leader_name: CONTRATANTE.name,
    il_leader_email: CONTRATANTE.email,
  }

  let companyId
  if (existingCo) {
    const { error } = await admin.from('companies').update(companyPayload).eq('id', existingCo.id)
    if (error) throw error
    companyId = existingCo.id
    console.log('6. Company atualizada:', companyId)
  } else {
    const { data, error } = await admin.from('companies').insert(companyPayload).select('id').single()
    if (error) throw error
    companyId = data.id
    console.log('6. Company criada:', companyId)
  }

  await ensureSubscriptions(admin, userId, companyId, invoice)

  console.log('\n7. Contatos:')
  for (const c of CONTACTS) {
    const r = await upsertContact(admin, companyId, c)
    console.log(`   ${r.action === 'insert' ? '+' : '~'} ${c.full_name} [${c.department}] <${c.email}>`)
  }

  // --- Verificação final ---
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, role, module_nr01, module_pentagrama, is_active')
    .eq('id', userId)
    .single()

  const { data: activeSubs } = await admin
    .from('active_subscriptions')
    .select('id, product_id, expires_at')
    .eq('user_id', userId)

  const { data: company } = await admin
    .from('companies')
    .select(
      'id, name, cnpj, technical_lead_name, technical_lead_crp, account_user_id, org_account_id, consultant_id',
    )
    .eq('id', companyId)
    .single()

  const { data: contacts } = await admin
    .from('company_contacts')
    .select('id, full_name, email, contact_role, department, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const leaders = (contacts ?? []).filter((c) => c.contact_role === 'leader')
  const hasRt = Boolean(company?.technical_lead_name?.trim() && company?.technical_lead_crp?.trim())
  const gap =
    !company ? 'needs_company' : !hasRt ? 'needs_rt' : 'none'

  const emails = (contacts ?? []).map((c) => c.email)
  const uniqueEmails = new Set(emails)

  console.log('\n=== VERIFICAÇÃO ===')
  console.log('Profile:', profile)
  console.log('active_subscriptions:', activeSubs?.length ?? 0, activeSubs)
  console.log('Company RT:', company?.technical_lead_name, company?.technical_lead_crp)
  console.log('Contacts ativos:', contacts?.length ?? 0, '| leaders:', leaders.length)
  console.log('Emails únicos:', uniqueEmails.size === emails.length)
  console.log('Onboarding gap:', gap)

  const ok =
    profile?.role === 'contratante' &&
    profile?.module_nr01 === true &&
    profile?.module_pentagrama === true &&
    profile?.is_active === true &&
    (activeSubs ?? []).some((s) => s.product_id === 'nr01') &&
    (activeSubs ?? []).some((s) => s.product_id === 'pentagrama') &&
    gap === 'none' &&
    (contacts?.length ?? 0) === 6 &&
    leaders.length === 1 &&
    uniqueEmails.size === emails.length

  console.log('\n=== CREDENCIAIS ===')
  console.log('Login:', CONTRATANTE.email)
  if (passwordPrinted) {
    console.log('Senha temporária:', passwordPrinted)
  } else {
    console.log('Senha: mantida (use --reset-password para gerar nova)')
  }
  console.log('company_id:', companyId)
  console.log('org_id:', orgId)
  console.log('Marcus: metaassessoriadp@gmail.com · Oscar: dp@ossassessoria.com.br')
  console.log(ok ? '\n✅ ONBOARD OK — pronto para diagnósticos / coleta' : '\n❌ ONBOARD INCOMPLETO — revisar logs')
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error('ERRO:', e.message ?? e)
  process.exit(1)
})
