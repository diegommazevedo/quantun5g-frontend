'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { resolveDiagnosticByIlToken } from '@/lib/pentagrama/public-diagnostic'
import { resolveDepartmentForSurveySubmit } from '@/lib/companies/departments'

export type SubmitIlResult =
  | { ok: true }
  | { ok: false; error: string; alreadySubmitted?: boolean }

export async function submitIlResponse(
  token: string,
  respostas: Record<number, number>,
  deptOpts?: { inviteToken?: string | null; departmentId?: string | null },
): Promise<SubmitIlResult> {
  const diag = await resolveDiagnosticByIlToken(token)
  if (!diag) return { ok: false, error: 'Link inválido ou expirado.' }
  if (diag.il_submitted_at) {
    return { ok: false, error: 'Este instrumento já foi respondido.', alreadySubmitted: true }
  }
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
    department_id: dept.departmentId,
    department_label: dept.departmentLabel,
  }
  for (let i = 1; i <= 125; i++) {
    payload[`q${i}`] = respostas[i]
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.from('il_responses').insert(payload as never)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Este instrumento já foi respondido.', alreadySubmitted: true }
    }
    return { ok: false, error: 'Erro ao enviar respostas. Tente novamente.' }
  }

  const now = new Date().toISOString()
  await admin
    .from('diagnostics')
    .update({
      il_submitted_at: now,
      ...(diag.status === 'AGUARDANDO_IL' ? { status: 'COLETANDO_IC' as const } : {}),
    } as never)
    .eq('id', diag.id)

  return { ok: true }
}
