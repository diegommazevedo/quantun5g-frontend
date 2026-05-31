import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isPlatformStaff } from '@/lib/auth/roles'
import type { UserRole } from '@/types/database'

/** Bloqueia líder/colaborador de telas operacionais (empresas, diagnósticos, etc.). */
export async function requirePlatformStaff(redirectTo = '/dashboard'): Promise<{
  userId: string
  role: UserRole
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: UserRole; is_active: boolean } | null

  if (profile && profile.is_active === false) redirect('/login')

  const role = (profile?.role ?? 'consultant') as UserRole
  if (!isPlatformStaff(role)) {
    redirect(`${redirectTo}?error=${encodeURIComponent('Seu perfil é de liderança (IL), não de consultor. Peça ao administrador para alterar seu papel em Usuários.')}`)
  }

  return { userId: user.id, role }
}
