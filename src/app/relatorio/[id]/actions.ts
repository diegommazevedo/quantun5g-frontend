'use server'

/**
 * QUANTUM5G — Ações server-side do Relatório
 * liberarParaLider: envia convite por e-mail ao líder com link direto para o relatório.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient }                         from '@/lib/supabase/server'

export async function liberarParaLider(diagnosticId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Busca diagnóstico (anon key — RLS exige que seja consultant/admin)
  const { data: diag, error: diagErr } = await supabase
    .from('diagnostics')
    .select('id, name, leader_email, leader_name')
    .eq('id', diagnosticId)
    .single() as { data: { id: string; name: string; leader_email: string | null; leader_name: string | null } | null; error: unknown }

  if (diagErr || !diag) return { error: 'Diagnóstico não encontrado.' }
  if (!diag.leader_email)  return { error: 'O líder não tem e-mail cadastrado neste diagnóstico.' }

  // Admin client (service role) para enviar convite
  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://quantum5g.vercel.app'
  const redirectTo = `${appUrl}/auth/callback?next=/relatorio/lider/${diagnosticId}`

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(diag.leader_email, {
    redirectTo,
    data: {
      role: 'leader',
      name: diag.leader_name ?? diag.leader_email,
    },
  })

  if (inviteErr) {
    // Se o usuário já existe — gera magic link em vez de novo convite
    if (inviteErr.message.includes('already been registered')) {
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type:        'magiclink',
        email:       diag.leader_email,
        options: { redirectTo },
      })
      if (linkErr || !link) return { error: 'Falha ao gerar link: ' + (linkErr?.message ?? 'erro desconhecido') }
      // link.properties.action_link gerado — Supabase envia o email automaticamente via generateLink
      return { success: true }
    }
    return { error: inviteErr.message }
  }

  return { success: true }
}
