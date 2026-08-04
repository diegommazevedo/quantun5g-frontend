/**
 * Gate de onboarding self-service — empresa (CNPJ) + RT antes do painel NR-01.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { companyHasTechnicalLead } from '@/lib/nr01/technical-lead'
import { isContratanteRole } from '@/lib/org/roles'
import type { UserRole } from '@/types/database'

export const NR01_SELF_SERVICE_ONBOARDING_PATH = '/nr01/onboarding'

export type ContratanteOnboardingGap = 'none' | 'needs_company' | 'needs_rt'

export interface CompanyPendingRt {
  id: string
  name: string
  cnpj: string | null
}

export async function findContratanteOnboardingGap(
  userId: string,
): Promise<ContratanteOnboardingGap> {
  const admin = createServiceRoleAdmin()

  const { data: org } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  const companiesQuery = admin
    .from('companies')
    .select('id, name, cnpj, technical_lead_name, technical_lead_crp')
    .order('created_at', { ascending: true })

  const { data: companies } = org?.id
    ? await companiesQuery.eq('org_account_id', org.id as string)
    : await companiesQuery.eq('account_user_id', userId)

  if (!companies?.length) return 'needs_company'

  for (const row of companies) {
    const c = row as CompanyPendingRt & {
      technical_lead_name: string | null
      technical_lead_crp: string | null
    }
    if (!companyHasTechnicalLead(c)) return 'needs_rt'
  }

  return 'none'
}

/** @deprecated use findContratanteOnboardingGap */
export async function findCompanyPendingRtOnboarding(
  userId: string,
): Promise<CompanyPendingRt | null> {
  const gap = await findContratanteOnboardingGap(userId)
  if (gap !== 'needs_rt') return null

  const admin = createServiceRoleAdmin()
  const { data: org } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()

  const companiesQuery = admin
    .from('companies')
    .select('id, name, cnpj, technical_lead_name, technical_lead_crp')
    .order('created_at', { ascending: true })

  const { data: companies } = org?.id
    ? await companiesQuery.eq('org_account_id', org.id as string)
    : await companiesQuery.eq('account_user_id', userId)

  for (const row of companies ?? []) {
    const c = row as CompanyPendingRt & {
      technical_lead_name: string | null
      technical_lead_crp: string | null
    }
    if (!companyHasTechnicalLead(c)) {
      return { id: c.id, name: c.name, cnpj: c.cnpj }
    }
  }
  return null
}

export function shouldEnforceNr01SelfServiceOnboarding(
  role: UserRole,
  pathname: string,
): boolean {
  if (!isContratanteRole(role)) return false
  if (pathname.startsWith(NR01_SELF_SERVICE_ONBOARDING_PATH)) return false
  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) return false
  if (pathname.startsWith('/login') || pathname.startsWith('/convite')) return false
  return (
    pathname.startsWith('/nr01/dashboard') ||
    pathname.startsWith('/nr01/avaliacao') ||
    pathname === '/nr01/empresas' ||
    pathname.startsWith('/nr01/empresas/')
  )
}

/** @deprecated use shouldEnforceNr01SelfServiceOnboarding */
export function shouldEnforceRtOnboarding(role: UserRole, pathname: string): boolean {
  return shouldEnforceNr01SelfServiceOnboarding(role, pathname)
}
