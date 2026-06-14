'use server'

/**
 * QUANTUM5G — Ações server-side do Relatório
 * liberarParaLider: envia convite por e-mail ao líder com link direto para o relatório.
 */

import { createClient } from '@/lib/supabase/server'
import { invitePlatformUser } from '@/lib/auth/user-invite'

export async function liberarParaLider(diagnosticId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: diag, error: diagErr } = await supabase
    .from('diagnostics')
    .select('id, name, leader_email, leader_name')
    .eq('id', diagnosticId)
    .single() as { data: { id: string; name: string; leader_email: string | null; leader_name: string | null } | null; error: unknown }

  if (diagErr || !diag) return { error: 'Diagnóstico não encontrado.' }
  if (!diag.leader_email) return { error: 'O líder não tem e-mail cadastrado neste diagnóstico.' }

  const result = await invitePlatformUser({
    email: diag.leader_email,
    name: diag.leader_name ?? diag.leader_email,
    role: 'leader',
    modulePentagrama: true,
    moduleNr01: false,
  })

  if (result.error && !result.userId) return { error: result.error }
  if (!result.emailSent) {
    return { error: result.error ?? 'Falha ao enviar e-mail de acesso ao líder.' }
  }

  return { success: true }
}
