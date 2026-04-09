'use server'

/**
 * QUANTUM5G — Server Actions /admin/consultores
 * criarConsultor  → invite via Supabase Admin + insert em profiles
 * toggleAtivo     → is_active + ban/unban via Admin API
 */

import { createClient as createBrowserlessAdmin } from '@supabase/supabase-js'
import { createClient }  from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Admin client (service role) — server-only
function adminClient() {
  return createBrowserlessAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── Criar consultor ───────────────────────────────────────────

export async function criarConsultor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (me?.role !== 'admin') return { error: 'Acesso negado' }

  const name  = (formData.get('name')  as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()

  if (!name || !email) return { error: 'Nome e e-mail são obrigatórios' }

  const admin = adminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quantum5g.vercel.app'

  // 1. Invite — cria auth.user e envia e-mail de boas-vindas
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${appUrl}/dashboard`,
      data: { role: 'consultant', name },
    }
  )

  if (inviteErr) {
    // Se já existe: apenas reenviar invite não é possível via API; retorna erro legível
    if (inviteErr.message.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado no sistema.' }
    }
    return { error: inviteErr.message }
  }

  const newUserId = invited.user.id

  // 2. Inserir profile — tolerante a trigger existente (ON CONFLICT DO NOTHING)
  await admin
    .from('profiles')
    .upsert(
      { id: newUserId, email, name, role: 'consultant', is_active: true },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  revalidatePath('/admin/consultores')
  return { success: true, name }
}

// ─── Ativar / Desativar consultor ──────────────────────────────

export async function toggleAtivo(consultorId: string, ativo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (me?.role !== 'admin') return { error: 'Acesso negado' }

  const admin = adminClient()

  // Atualiza flag na tabela profiles
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ is_active: ativo })
    .eq('id', consultorId)

  if (profileErr) return { error: profileErr.message }

  // Ban/unban no Auth para bloquear login de fato
  const { error: banErr } = await admin.auth.admin.updateUserById(consultorId, {
    ban_duration: ativo ? 'none' : '876000h',
  })

  if (banErr) return { error: banErr.message }

  revalidatePath('/admin/consultores')
  return { success: true }
}
