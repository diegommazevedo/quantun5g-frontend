/**
 * Actor da sessão para páginas server — perfil via service role (evita RLS inconsistente).
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { Profile, UserRole } from '@/types/database'
import { supabaseForActorRole } from '@/lib/org/scoped-db'

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

  const admin = createServiceRoleAdmin()
  const { data: profileRaw } = await admin
    .from('profiles')
    .select('role, module_pentagrama, module_nr01, is_active, name')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileRaw as PageActor['profile']
  if (profile?.is_active === false) redirect('/login')

  const role = (profile?.role ?? 'consultant') as UserRole
  const scopedDb = supabaseForActorRole(role, userClient)

  return { user, role, profile, userClient, db: scopedDb }
})
