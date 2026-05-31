import { redirect } from 'next/navigation'
import { userHasNr01License } from '@/lib/billing/nr01-license'
import type { UserRole } from '@/types/database'

import { isPlatformStaff } from '@/lib/auth/roles'
import { profileHasModule } from '@/lib/auth/modules'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/** Bloqueia criação de avaliação sem licença (líder/cliente); staff com módulo NR-01 segue liberado. */
export async function requireNr01LicenseOrRedirect(params: {
  userId: string
  role: UserRole
  redirectTo?: string
}): Promise<{ licensed: boolean }> {
  if (params.role === 'admin') return { licensed: true }

  if (isPlatformStaff(params.role)) {
    const admin = createServiceRoleClient()
    const { data } = await admin
      .from('profiles')
      .select('module_nr01')
      .eq('id', params.userId)
      .returns<{ module_nr01: boolean }[]>()
      .maybeSingle()
    if (profileHasModule({ role: params.role, module_pentagrama: true, module_nr01: data?.module_nr01 ?? false }, 'nr01')) {
      return { licensed: true }
    }
  }

  const licensed = await userHasNr01License(params.userId)
  if (!licensed) {
    redirect(
      params.redirectTo ??
        '/faturas?hint=licenca_nr01_emita_fatura_ou_aguarde_pagamento',
    )
  }
  return { licensed: true }
}
