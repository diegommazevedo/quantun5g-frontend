/**
 * Carrega dados da tela pública /nr01/status/[token].
 * O token é o segredo; após validar, usa service role para ler o laudo (RLS do consultor bloqueia anon).
 */

import { loadLaudoData } from '@/lib/nr01/pdf-data'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Nr01PublicStatusToken } from '@/types/nr01'
import type { LaudoData } from '@/lib/nr01/pdf-data'

export async function resolvePublicStatusByToken(
  token: string,
): Promise<{ tokenRow: Nr01PublicStatusToken; laudo: LaudoData } | null> {
  const admin = createServiceRoleClient()

  const { data: tokenRow } = await admin
    .from('nr01_public_status_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle()

  if (!tokenRow) return null

  const laudo = await loadLaudoData(admin, (tokenRow as Nr01PublicStatusToken).assessment_id)
  if (!laudo) return null

  return {
    tokenRow: tokenRow as Nr01PublicStatusToken,
    laudo,
  }
}
