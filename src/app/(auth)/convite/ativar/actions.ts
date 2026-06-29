'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolvePostAuthPath } from '@/lib/auth/post-auth-redirect'
import type { UserRole } from '@/types/database'

export async function definirSenhaConvite(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const confirm = (formData.get('confirm') as string) ?? ''

  if (password.length < 8) {
    redirect('/convite/ativar?error=Senha+deve+ter+ao+menos+8+caracteres.')
  }
  if (password !== confirm) {
    redirect('/convite/ativar?error=As+senhas+n%C3%A3o+coincidem.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=Sess%C3%A3o+expirada.+Abra+o+link+do+convite+novamente.')

  const { error } = await supabase.auth.updateUser({
    password,
    data: { password_set: true },
  })
  if (error) {
    redirect(`/convite/ativar?error=${encodeURIComponent(error.message)}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, module_nr01, module_pentagrama')
    .eq('id', user.id)
    .returns<{ role: UserRole; module_nr01: boolean; module_pentagrama: boolean }[]>()
    .single()

  const role = (profile?.role ?? 'consultant') as UserRole
  const base = profile
    ? resolvePostAuthPath({
        role,
        module_nr01: profile.module_nr01,
        module_pentagrama: profile.module_pentagrama,
      })
    : '/dashboard'
  const dest = `${base}?welcome=1`
  redirect(dest)
}
