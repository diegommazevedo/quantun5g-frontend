/**
 * QUANTUM5G — TELA-ADMIN: Gestão de Consultores
 * SSR: busca todos os profiles role='consultant' + contagem de diagnósticos.
 * Client: ConsultoresClient gerencia modal e toggle de status.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ConsultoresClient } from './ConsultoresClient'

export const dynamic = 'force-dynamic'

export default async function ConsultoresPage() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Busca todos os consultores
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, email, is_active, created_at')
    .eq('role', 'consultant')
    .order('created_at', { ascending: false })

  // Conta diagnósticos por consultor
  const { data: diagCounts } = await admin
    .from('diagnostics')
    .select('consultant_id')

  const countMap: Record<string, number> = {}
  for (const d of diagCounts ?? []) {
    countMap[d.consultant_id] = (countMap[d.consultant_id] ?? 0) + 1
  }

  const consultores = (profiles ?? []).map(p => ({
    ...p,
    n_diagnosticos: countMap[p.id] ?? 0,
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <ConsultoresClient consultores={consultores} />
    </div>
  )
}
