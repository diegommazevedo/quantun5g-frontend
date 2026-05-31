import type { Profile } from '@/types/database'

export type AppModule = 'pentagrama' | 'nr01'

export function profileHasModule(
  profile: Pick<Profile, 'role' | 'module_pentagrama' | 'module_nr01'> | null,
  module: AppModule,
): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  if (module === 'pentagrama') return profile.module_pentagrama !== false
  return profile.module_nr01 !== false
}

export async function requireModule(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string,
  module: AppModule,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role, module_pentagrama, module_nr01')
    .eq('id', userId)
    .single()
  return profileHasModule(data as Profile | null, module)
}
