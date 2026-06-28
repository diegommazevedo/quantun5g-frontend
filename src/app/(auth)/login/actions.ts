'use server'

/**
 * QUANTUM5G — Server Actions de autenticação
 * Login via Supabase Auth email/password com redirect por role.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'
import type { UserRole } from '@/types/database'

// Mapa de destino por role após login bem-sucedido
const ROLE_REDIRECT: Record<UserRole, string> = {
  admin: '/admin',
  consultant: '/dashboard',
  leader: '/dashboard',
  contratante: '/nr01/dashboard',
  gerente: '/dashboard',
  collaborator: '/dashboard',
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = safeRedirectPath(formData.get('redirect') as string | null)

  if (!email || !password) {
    redirect('/login?error=Preencha%20e-mail%20e%20senha.')
  }

  let error: { message: string } | null = null
  const maxAttempts = process.env.NODE_ENV === 'development' ? 3 : 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    error = result.error
    if (!error || error.message !== 'fetch failed' || attempt === maxAttempts) break
    await new Promise((r) => setTimeout(r, attempt * 1500))
  }

  if (error) {
    const msg =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'E-mail ou senha incorretos.'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const meta = user?.user_metadata as { password_set?: boolean } | undefined
  if (!meta?.password_set) {
    await supabase.auth.updateUser({ data: { password_set: true } })
  }

  // Busca role do perfil para redirect correto
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .returns<{ role: UserRole }[]>()
    .single()

  if (redirectTo) {
    revalidatePath(redirectTo, 'page')
    redirect(redirectTo)
  }

  const role = (profile?.role ?? 'consultant') as UserRole
  const dest = ROLE_REDIRECT[role] ?? '/dashboard'
  revalidatePath(dest, 'page')
  redirect(dest)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/login', 'page')
  redirect('/login')
}
