'use server'

/**
 * QUANTUM5G — NR-01 · Server actions do link de status público
 *
 * - criarTokenStatusPublico: gera token de 64 chars hex (32 bytes) e salva.
 * - revogarTokenStatusPublico: marca revoked_at = now() (soft delete).
 *
 * Múltiplos tokens podem coexistir; o consultor decide se quer rotacionar
 * (novo + revoga antigos) ou apenas adicionar mais um.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'

async function ensureOwnership(assessmentId: string) {
  const { db, user, role, assessment } = await ensureNr01AssessmentAccess(assessmentId)
  return { supabase: db, user, role, assessment }
}

function generatePublicToken(): string {
  // 32 bytes hex = 64 chars (256 bits de entropia)
  return randomBytes(32).toString('hex')
}

export async function criarTokenStatusPublico(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const revokeOthersRaw = formData.get('revoke_others') as string | null
  const revokeOthers = revokeOthersRaw === 'true' || revokeOthersRaw === 'on'

  const { supabase, user, role } = await ensureOwnership(assessmentId)

  if (revokeOthers) {
    await supabase
      .from('nr01_public_status_tokens')
      .update({ revoked_at: new Date().toISOString() } as never)
      .eq('assessment_id', assessmentId)
      .is('revoked_at', null)
  }

  const token = generatePublicToken()
  const { error } = await supabase
    .from('nr01_public_status_tokens')
    .insert({
      assessment_id: assessmentId,
      token,
      created_by: user.id,
    } as never)
  if (error) {
    redirect(`/nr01/avaliacao/${assessmentId}?error=${encodeURIComponent('Erro ao gerar link: ' + error.message)}`)
  }

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'PUBLIC_STATUS_TOKEN_CREATED',
    payload: { revoke_others: revokeOthers },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}`)
  redirect(`/nr01/avaliacao/${assessmentId}?status=link_gerado`)
}

export async function revogarTokenStatusPublico(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const tokenId      = formData.get('token_id') as string

  const { supabase, user, role } = await ensureOwnership(assessmentId)

  await supabase
    .from('nr01_public_status_tokens')
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq('id', tokenId)
    .eq('assessment_id', assessmentId)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'PUBLIC_STATUS_TOKEN_REVOKED',
    payload: { token_id: tokenId },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}`)
  redirect(`/nr01/avaliacao/${assessmentId}?status=link_revogado`)
}
