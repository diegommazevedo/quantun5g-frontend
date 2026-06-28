'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

const ROLE_REDIRECT: Record<UserRole, string> = {
  admin: '/admin',
  consultant: '/dashboard',
  leader: '/dashboard',
  // Compradores NR-01 (auto-criados via webhook Kiwify) → módulo NR-01
  contratante: '/nr01/dashboard?welcome=1',
  gerente: '/dashboard',
  collaborator: '/dashboard',
}

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
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()

  const role = (profile?.role ?? 'consultant') as UserRole
  redirect(`${ROLE_REDIRECT[role] ?? '/dashboard'}?welcome=1`)
}
