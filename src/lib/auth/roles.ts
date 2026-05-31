import type { UserRole } from '@/types/database'

/** Papéis que operam o SaaS (empresas, diagnósticos, NR-01, disparos). */
export function isPlatformStaff(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'consultant'
}

export const ROLE_LABEL_PT: Record<UserRole, string> = {
  admin: 'Administrador',
  consultant: 'Consultor',
  leader: 'Liderança (IL)',
  collaborator: 'Colaborador',
}

export function sidebarRoleLabel(role: string): string {
  return ROLE_LABEL_PT[role as UserRole] ?? role
}
