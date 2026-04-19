'use server'

/**
 * Registra acesso à tela pública de status (incrementa counter + audit log).
 * Best-effort — falhas silenciam (não devem bloquear renderização).
 */

import { createClient } from '@/lib/supabase/server'

interface RegisterAccessArgs {
  tokenId: string
  assessmentId: string
  ipHash: string | null
  userAgent: string | null
}

export async function registerAccess(args: RegisterAccessArgs): Promise<void> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Incrementa counter via UPDATE com COALESCE — funciona sob a policy update_anon (revoked_at IS NULL).
    // Faz fetch do valor atual para evitar dependência de RPC. Race condition é aceitável (counter
    // aproximado; se duas vistas concorrentes registrarem +1 simultâneo, vira +1 em vez de +2 — irrelevante).
    const { data: current } = await supabase
      .from('nr01_public_status_tokens')
      .select('accessed_count')
      .eq('id', args.tokenId)
      .maybeSingle()
    const next = ((current as { accessed_count?: number } | null)?.accessed_count ?? 0) + 1

    await supabase
      .from('nr01_public_status_tokens')
      .update({
        accessed_count: next,
        last_accessed_at: now,
      } as never)
      .eq('id', args.tokenId)

    await supabase.from('nr01_audit_log').insert({
      assessment_id: args.assessmentId,
      actor_id: null,
      actor_role: 'collaborator',
      event_type: 'PUBLIC_STATUS_ACCESSED',
      payload: { token_id: args.tokenId },
      ip_hash: args.ipHash,
      user_agent: args.userAgent,
    } as never)
  } catch {
    // best-effort
  }
}
