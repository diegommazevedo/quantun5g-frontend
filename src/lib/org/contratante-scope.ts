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
  /** Empresas via account_user_id (líder legado) sem org_accounts */
  isLegacyAccountUser?: boolean
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
  if (org?.id) {
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

  // Fallback: líder legado (account_user_id) ou contratante sem org_accounts ainda
  const { data: legacyCos, error: legacyErr } = await admin
    .from('companies')
    .select('id')
    .eq('account_user_id', userId)

  if (legacyErr) {
    console.error('[loadContratanteOrgScope:legacy]', legacyErr.message)
    return { org: null, companyIds: [] }
  }

  const legacyIds = ((legacyCos ?? []) as { id: string }[]).map((c) => c.id)
  if (legacyIds.length) {
    return { org: null, companyIds: legacyIds, isLegacyAccountUser: true }
  }

  return { org: null, companyIds: [] }
}

export const loadContratanteOrgScope = cache(fetchContratanteOrgScope)
