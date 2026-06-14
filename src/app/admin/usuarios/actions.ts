'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types/database'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (me?.role !== 'admin') return { error: 'Acesso negado' as const }
  return { ok: true as const }
}

export async function criarUsuario(formData: FormData) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = ((formData.get('role') as string) || 'consultant') as UserRole
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'

  if (!name || !email) return { error: 'Nome e e-mail são obrigatórios' }
  if (!['admin', 'consultant', 'leader', 'collaborator', 'contratante', 'gerente'].includes(role)) {
    return { error: 'Papel inválido' }
  }

  const admin = adminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quantum5g.vercel.app'

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/dashboard`,
    data: { role, name },
  })

  if (inviteErr) {
    if (inviteErr.message.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: inviteErr.message }
  }

  const isAdmin = role === 'admin'
  await admin.from('profiles').upsert(
    {
      id: invited.user.id,
      email,
      name,
      role,
      is_active: true,
      module_pentagrama: isAdmin ? true : modulePentagrama,
      module_nr01: isAdmin ? true : moduleNr01,
    } as never,
    { onConflict: 'id' },
  )

  revalidatePath('/admin/usuarios')
  return { success: true, name }
}

export async function atualizarAcessoUsuario(formData: FormData) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const userId = formData.get('user_id') as string
  const role = (formData.get('role') as string) as UserRole
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'

  if (!userId) return { error: 'Usuário inválido' }

  const admin = adminClient()
  const isAdmin = role === 'admin'

  const { error } = await admin
    .from('profiles')
    .update({
      role,
      module_pentagrama: isAdmin ? true : modulePentagrama,
      module_nr01: isAdmin ? true : moduleNr01,
    } as never)
    .eq('id', userId)

  if (error) return { error: error.message }
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function toggleUsuarioAtivo(userId: string, ativo: boolean) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const admin = adminClient()
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ is_active: ativo } as never)
    .eq('id', userId)

  if (profileErr) return { error: profileErr.message }

  await admin.auth.admin.updateUserById(userId, {
    ban_duration: ativo ? 'none' : '876000h',
  })

  revalidatePath('/admin/usuarios')
  return { success: true }
}
