/**
 * Simula visibilidade de empresas por perfil (service role).
 * node --env-file=.env.local scripts/audit-rls-visibility.mjs
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: profiles } = await admin
  .from('profiles')
  .select('id, email, role')
  .in('role', ['consultant', 'admin', 'leader'])
  .order('email')

const { data: companies } = await admin
  .from('companies')
  .select('id, name, consultant_id, account_user_id, cnpj, created_at')
  .order('created_at', { ascending: false })

console.log('=== Visibilidade /empresas (filtro consultant_id = user.id) ===\n')

for (const p of profiles ?? []) {
  const visible = (companies ?? []).filter((c) => c.consultant_id === p.id)
  const asAccount = (companies ?? []).filter((c) => c.account_user_id === p.id)
  console.log(`${p.email} [${p.role}]`)
  console.log(`  por consultant_id: ${visible.length} → ${visible.map((c) => c.name).join(', ') || '(nenhuma)'}`)
  console.log(`  por account_user_id: ${asAccount.length} → ${asAccount.map((c) => c.name).join(', ') || '(nenhuma)'}`)
  if (p.role === 'leader' && visible.length === 0 && asAccount.length > 0) {
    console.log('  ⚠ LÍDER vê lista VAZIA em /empresas (bug legado)')
  }
  console.log('')
}

// Policy check
const { data: pol } = await admin.rpc('pg_policies_list').catch(() => ({ data: null }))
if (!pol) {
  const { data: viaSql, error } = await admin
    .from('pg_policies')
    .select('policyname')
    .eq('tablename', 'companies')
  if (error) {
    console.log('(não foi possível listar policies via API — verifique SQL Editor)')
  }
}
