'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { resolveDiagnosticByIcToken } from '@/lib/pentagrama/public-diagnostic'
import { resolveDepartmentForSurveySubmit } from '@/lib/companies/departments'

export type SubmitIcResult =
  | { ok: true }
  | { ok: false; error: string; duplicate?: boolean }

export async function submitIcResponse(
  token: string,
  respostas: Record<number, number>,
  respondenteAnonimoId: string,
  deptOpts?: { inviteToken?: string | null; departmentId?: string | null },
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

  const dept = await resolveDepartmentForSurveySubmit({
    companyId: diag.companyId,
    inviteToken: deptOpts?.inviteToken,
    clientDepartmentId: deptOpts?.departmentId,
  })
  if (!dept.ok) return { ok: false, error: dept.error }

  const payload: Record<string, number | string | null> = {
    diagnostic_id: diag.id,
    respondente_anonimo_id: respondenteAnonimoId,
    department_id: dept.departmentId,
    department_label: dept.departmentLabel,
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
