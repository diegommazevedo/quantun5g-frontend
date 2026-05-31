import { redirect } from 'next/navigation'
import { userHasPentagramaLicense } from '@/lib/billing/pentagrama-license'
import { isPlatformStaff } from '@/lib/auth/roles'
import { profileHasModule } from '@/lib/auth/modules'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'

export async function requirePentagramaLicenseOrRedirect(params: {
  userId: string
  role: UserRole
  redirectTo?: string
}): Promise<{ licensed: boolean }> {
  if (params.role === 'admin') return { licensed: true }

  if (isPlatformStaff(params.role)) {
    const admin = createServiceRoleClient()
    const { data } = await admin
      .from('profiles')
      .select('module_pentagrama')
      .eq('id', params.userId)
      .returns<{ module_pentagrama: boolean }[]>()
      .maybeSingle()
    if (
      profileHasModule(
        { role: params.role, module_pentagrama: data?.module_pentagrama ?? false, module_nr01: true },
        'pentagrama',
      )
    ) {
      return { licensed: true }
    }
  }

  const licensed = await userHasPentagramaLicense(params.userId)
  if (!licensed) {
    redirect(params.redirectTo ?? '/faturas?hint=licenca_pentagrama')
  }
  return { licensed: true }
}
