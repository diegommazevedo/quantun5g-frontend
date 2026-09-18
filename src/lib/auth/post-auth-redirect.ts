import type { UserRole } from '@/types/database'

interface ProfileRedirectInput {
  role: UserRole
  module_nr01?: boolean | null
  module_pentagrama?: boolean | null
}

/**
 * Destino pós-login/convite.
 * Ambos os módulos estão liberados; o papel define o landing padrão.
 */
export function resolvePostAuthPath(profile: ProfileRedirectInput): string {
  const { role } = profile

  if (role === 'admin') return '/admin'
  if (role === 'contratante') return '/nr01/dashboard'
  return '/dashboard'
}
