/**
 * Gate de onboarding RT — contratante com empresa sem responsável técnico cadastrado.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { companyHasTechnicalLead } from '@/lib/nr01/technical-lead'
import { isContratanteRole } from '@/lib/org/roles'
import type { UserRole } from '@/types/database'

export const RT_ONBOARDING_PATH = '/nr01/onboarding'

export interface CompanyPendingRt {
  id: string
  name: string
  cnpj: string | null
}

export async function findCompanyPendingRtOnboarding(
  userId: string,
): Promise<CompanyPendingRt | null> {
  const admin = createServiceRoleAdmin()
  const { data: companies } = await admin
    .from('companies')
    .select('id, name, cnpj, technical_lead_name, technical_lead_crp')
    .eq('account_user_id', userId)
    .order('created_at', { ascending: true })

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

export function shouldEnforceRtOnboarding(role: UserRole, pathname: string): boolean {
  if (!isContratanteRole(role)) return false
  if (pathname.startsWith(RT_ONBOARDING_PATH)) return false
  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) return false
  if (pathname.startsWith('/login') || pathname.startsWith('/convite')) return false
  return (
    pathname.startsWith('/nr01/dashboard') ||
    pathname.startsWith('/nr01/avaliacao') ||
    pathname === '/nr01/empresas' ||
    pathname.startsWith('/nr01/empresas/')
  )
}
