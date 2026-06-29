/**
 * Completa cadastro Empresa Teste Ltda + 5 colaboradores fictícios.
 * node --env-file=.env.local scripts/complete-empresa-teste.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMPANY_ID = 'aaaaaaaa-0001-0001-0001-000000000001'

const COMPANY = {
  name: 'Empresa Teste Ltda',
  legal_name: 'Empresa Teste Ltda',
  trade_name: 'Teste Demo',
  cnpj: '11222333000181',
  name_normalized: 'empresa teste ltda',
  total_collaborators: 5,
  rh_contact_name: 'Pedro Alves',
  rh_contact_email: 'rh@empresateste.demo',
  technical_lead_name: 'Jovane Borline da Silva',
  technical_lead_crp: 'CRP 16/4948',
  technical_lead_profession: 'Psicólogo',
  technical_lead_email: 'jovane@quantun5g.com',
  il_leader_name: 'Carla Mendes',
  il_leader_email: 'carla.mendes@empresateste.demo',
}

const IL_LEADERS = [{ name: 'Carla Mendes', email: 'carla.mendes@empresateste.demo' }]

const COLLABORATORS = [
  { full_name: 'Ana Silva', email: 'ana.silva@empresateste.demo', job_title: 'Analista Administrativa', department: 'Administrativo' },
  { full_name: 'Bruno Costa', email: 'bruno.costa@empresateste.demo', job_title: 'Assistente Comercial', department: 'Comercial' },
  { full_name: 'Daniela Souza', email: 'daniela.souza@empresateste.demo', job_title: 'Coordenadora de RH', department: 'RH' },
  { full_name: 'Eduardo Lima', email: 'eduardo.lima@empresateste.demo', job_title: 'Técnico de Operações', department: 'Operações' },
  { full_name: 'Fernanda Rocha', email: 'fernanda.rocha@empresateste.demo', job_title: 'Atendente', department: 'Atendimento' },
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

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: upErr } = await admin.from('companies').update(COMPANY).eq('id', COMPANY_ID)
  if (upErr) throw upErr
  console.log('✓ Empresa atualizada (CNPJ, RT, IL, RH)')

  for (const l of IL_LEADERS) {
    const { data: ex } = await admin
      .from('company_contacts')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('email', l.email)
      .eq('contact_role', 'leader')
      .maybeSingle()
    if (ex) {
      await admin.from('company_contacts').update({ full_name: l.name, is_active: true }).eq('id', ex.id)
    } else {
      await admin.from('company_contacts').insert({
        company_id: COMPANY_ID,
        full_name: l.name,
        email: l.email,
        contact_role: 'leader',
        is_active: true,
      })
    }
  }
  console.log('✓ Contato IL')

  for (const c of COLLABORATORS) {
    const { data: ex } = await admin
      .from('company_contacts')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('email', c.email)
      .maybeSingle()
    const row = {
      company_id: COMPANY_ID,
      full_name: c.full_name,
      email: c.email,
      contact_role: 'collaborator',
      job_title: c.job_title,
      department: c.department,
      is_active: true,
    }
    if (ex) {
      await admin.from('company_contacts').update(row).eq('id', ex.id)
    } else {
      await admin.from('company_contacts').insert(row)
    }
    console.log(`  + ${c.full_name}`)
  }

  const { count } = await admin
    .from('company_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', COMPANY_ID)
    .eq('contact_role', 'collaborator')

  console.log(`\n✅ Empresa Teste Ltda completa — ${count} colaboradores IC`)
}

main().catch((e) => {
  console.error('ERRO:', e.message || e)
  process.exit(1)
})
