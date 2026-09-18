/**
 * Contratante/gerente: empresas pertencem ao consultor operador (RLS bloqueia anon).
 * Server components usam service role após validar escopo por org.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'

export function usesOrgScopedServiceReads(role: UserRole | string): boolean {
  // Admin/contratante/gerente/leader: service role após authz no app (evita buracos de RLS).
  return (
    role === 'admin' ||
    role === 'leader' ||
    isContratanteRole(role) ||
    isGerenteRole(role)
  )
}

export function supabaseForActorRole(role: UserRole, userClient: SupabaseClient): SupabaseClient {
  if (usesOrgScopedServiceReads(role)) return createServiceRoleAdmin()
  return userClient
}

/**
 * Escrita após `fetchCompanyForActor` (ou equivalente) ter validado o escopo.
 * Necessário para admin: RLS de insert em diagnostics exige consultant_id = auth.uid()
 * na empresa, o que impede operar empresas de consultores.
 */
export function supabaseWriteAfterCompanyAuthz(): SupabaseClient {
  return createServiceRoleAdmin()
}
