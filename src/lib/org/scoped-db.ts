/**
 * Contratante/gerente: empresas pertencem ao consultor operador (RLS bloqueia anon).
 * Server components usam service role após validar escopo por org.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'

export function usesOrgScopedServiceReads(role: UserRole | string): boolean {
  return isContratanteRole(role) || isGerenteRole(role)
}

export function supabaseForActorRole(role: UserRole, userClient: SupabaseClient): SupabaseClient {
  if (usesOrgScopedServiceReads(role)) return createServiceRoleAdmin()
  return userClient
}
