import type { Profile } from '@/types/database'

export type AppModule = 'pentagrama' | 'nr01' | 'radar' | 'copiloto'

/**
 * Acesso a módulos: todo usuário cadastrado (com perfil) acessa todos os módulos.
 * Flags no perfil são mantidos por compatibilidade, mas não restringem mais.
 */
export function profileHasModule(
  profile: Pick<Profile, 'role' | 'module_pentagrama' | 'module_nr01'> | null,
  _module: AppModule,
): boolean {
  return profile != null
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
