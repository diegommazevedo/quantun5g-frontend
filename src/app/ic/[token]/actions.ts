'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { resolveDiagnosticByIcToken } from '@/lib/pentagrama/public-diagnostic'

export type SubmitIcResult =
  | { ok: true }
  | { ok: false; error: string; duplicate?: boolean }

export async function submitIcResponse(
  token: string,
  respostas: Record<number, number>,
  respondenteAnonimoId: string,
): Promise<SubmitIcResult> {
  const diag = await resolveDiagnosticByIcToken(token)
  if (!diag) return { ok: false, error: 'Link inválido ou expirado.' }
  if (!isPentagramaColetaAberta(diag.status)) {
    return { ok: false, error: 'Coleta encerrada.' }
  }

  for (let i = 1; i <= 125; i++) {
    const v = respostas[i]
    if (v == null || v < 1 || v > 5) {
      return { ok: false, error: `Resposta inválida na questão ${i}.` }
    }
  }

  const payload: Record<string, number | string> = {
    diagnostic_id: diag.id,
    respondente_anonimo_id: respondenteAnonimoId,
  }
  for (let i = 1; i <= 125; i++) {
    payload[`q${i}`] = respostas[i]
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.from('ic_responses').insert(payload as never)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Você já respondeu este instrumento.', duplicate: true }
    }
    return { ok: false, error: 'Erro ao enviar respostas. Tente novamente.' }
  }

  return { ok: true }
}
