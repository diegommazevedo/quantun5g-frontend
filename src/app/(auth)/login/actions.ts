'use server'

/**
 * QUANTUM5G — Server Actions de autenticação
 * Login via Supabase Auth email/password com redirect por role.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

// Mapa de destino por role após login bem-sucedido
const ROLE_REDIRECT: Record<UserRole, string> = {
  admin:         '/dashboard/admin',
  consultant:    '/dashboard',
  leader:        '/dashboard/lider',
  collaborator:  '/dashboard',
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Preencha%20e-mail%20e%20senha.')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=E-mail%20ou%20senha%20incorretos.')
  }

  // Busca role do perfil para redirect correto
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .returns<{ role: UserRole }[]>()
    .single()

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
