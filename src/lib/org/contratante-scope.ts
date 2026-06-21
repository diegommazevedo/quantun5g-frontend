/**
 * Escopo org do contratante — uma leitura de org_accounts + company ids por request (React cache).
 * Evita duplicar lookup de org entre loadOrgActorContext e loadCompanyIdsForContratante.
 */

import { cache } from 'react'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { OrgAccount } from '@/lib/org/access'

export interface ContratanteOrgScope {
  org: OrgAccount | null
  companyIds: string[]
}

async function fetchContratanteOrgScope(userId: string): Promise<ContratanteOrgScope> {
  const admin = createServiceRoleAdmin()
  const { data: orgRaw, error: orgError } = await admin
    .from('org_accounts')
    .select('id, name, owner_user_id, consultant_id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (orgError) {
    console.error('[loadContratanteOrgScope]', orgError.message)
    return { org: null, companyIds: [] }
  }

  const org = (orgRaw as OrgAccount | null) ?? null
  if (!org?.id) return { org: null, companyIds: [] }

  const { data: cos, error: cosError } = await admin
    .from('companies')
    .select('id')
    .eq('org_account_id', org.id)

  if (cosError) {
    console.error('[loadContratanteOrgScope:companies]', cosError.message)
    return { org, companyIds: [] }
  }

  return {
    org,
    companyIds: ((cos ?? []) as { id: string }[]).map((c) => c.id),
  }
}

export const loadContratanteOrgScope = cache(fetchContratanteOrgScope)
