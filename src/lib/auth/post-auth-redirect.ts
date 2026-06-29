import type { UserRole } from '@/types/database'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'

interface ProfileRedirectInput {
  role: UserRole
  module_nr01?: boolean | null
  module_pentagrama?: boolean | null
}

/**
 * Destino pós-login/convite alinhado ao middleware.
 * NR-01-only (sem Pentagrama) → painel NR-01 para contratante, gerente e leader.
 */
export function resolvePostAuthPath(profile: ProfileRedirectInput): string {
  const { role, module_nr01, module_pentagrama } = profile

  if (role === 'admin') return '/admin'
  if (role === 'consultant') return '/dashboard'
  if (role === 'contratante') return '/nr01/dashboard'

  const nr01Primary =
    module_nr01 === true &&
    module_pentagrama !== true

  if (isGerenteRole(role) && nr01Primary) return '/nr01/dashboard'

  if (isContratanteRole(role) && nr01Primary) {
    return '/nr01/dashboard'
  }

  if (role === 'collaborator') return '/dashboard'
  return '/dashboard'
}
