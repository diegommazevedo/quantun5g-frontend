/**
 * Actor da sessão para páginas server — perfil via sessão (igual ao dashboard), fallback service role.
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { Profile, UserRole } from '@/types/database'
import { supabaseForActorRole } from '@/lib/org/scoped-db'

const PROFILE_SELECT = 'role, module_pentagrama, module_nr01, is_active, name'

export interface PageActor {
  user: { id: string; email?: string | null }
  role: UserRole
  profile: Pick<Profile, 'role' | 'module_pentagrama' | 'module_nr01' | 'is_active' | 'name'> | null
  userClient: Awaited<ReturnType<typeof createClient>>
  db: ReturnType<typeof supabaseForActorRole>
}

export const getPageActor = cache(async (): Promise<PageActor> => {
  const userClient = await createClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileFromSession } = await userClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .maybeSingle()

  let profile = profileFromSession as PageActor['profile']
  if (!profile) {
    const admin = createServiceRoleAdmin()
    const { data: profileRaw } = await admin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', user.id)
      .maybeSingle()
    profile = profileRaw as PageActor['profile']
  }

  if (profile?.is_active === false) redirect('/login')

  const role = (profile?.role ?? 'consultant') as UserRole
  const scopedDb = supabaseForActorRole(role, userClient)

  return { user, role, profile, userClient, db: scopedDb }
})
