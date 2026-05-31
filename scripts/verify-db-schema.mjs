/**
 * Verifica colunas/tabelas críticas no Supabase remoto (service role).
 * Uso: node --env-file=.env.local scripts/verify-db-schema.mjs
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function probe(label, fn) {
  try {
    const { error } = await fn()
    if (error) {
      console.log('✗', label, '—', error.message)
      return false
    }
    console.log('✓', label)
    return true
  } catch (e) {
    console.log('✗', label, '—', e.message)
    return false
  }
}

let ok = true

ok &&= await probe('companies.cnpj', () =>
  supabase.from('companies').select('cnpj').limit(1),
)
ok &&= await probe('companies.technical_lead_name', () =>
  supabase.from('companies').select('technical_lead_name').limit(1),
)
ok &&= await probe('profiles.module_nr01', () =>
  supabase.from('profiles').select('module_nr01').limit(1),
)
ok &&= await probe('company_contacts', () =>
  supabase.from('company_contacts').select('id').limit(1),
)
ok &&= await probe('survey_invites', () =>
  supabase.from('survey_invites').select('id').limit(1),
)
ok &&= await probe('diagnostics.competencia_label', () =>
  supabase.from('diagnostics').select('competencia_label').limit(1),
)
ok &&= await probe('nr01_assessments.competencia_label', () =>
  supabase.from('nr01_assessments').select('competencia_label').limit(1),
)
ok &&= await probe('survey_invites.resend_email_id', () =>
  supabase.from('survey_invites').select('resend_email_id').limit(1),
)
ok &&= await probe('email_suppressions', () =>
  supabase.from('email_suppressions').select('id').limit(1),
)
ok &&= await probe('companies.account_user_id', () =>
  supabase.from('companies').select('account_user_id').limit(1),
)
ok &&= await probe('commercial_invoices', () =>
  supabase.from('commercial_invoices').select('id').limit(1),
)

if (!ok) {
  console.log('\nAplique: supabase/apply-pending-remote.sql no SQL Editor OU')
  console.log('  node --env-file=.env.local scripts/apply-pending-migrations.mjs')
  process.exit(1)
}

console.log('\nSchema OK para cadastro de empresa + equipe + disparos.')
process.exit(0)
