'use server'

/**
 * QUANTUM5G — TELA-03: Server Action criar diagnóstico
 * Cria empresa (se nova) + diagnóstico + avança status para AGUARDANDO_IL
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CompanyInsert, DiagnosticInsert, DiagnosticUpdate } from '@/types/database'

export async function criarDiagnostico(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nomeEmpresa    = (formData.get('nome_empresa') as string)?.trim()
  const totalColab     = parseInt(formData.get('total_colaboradores') as string) || 0
  const nomeDiag       = (formData.get('nome_diagnostico') as string)?.trim()
  const nomeL          = (formData.get('leader_name') as string)?.trim() || null
  const emailL         = (formData.get('leader_email') as string)?.trim() || null
  const ilDeadline     = (formData.get('il_deadline') as string) || null
  const icDeadline     = (formData.get('ic_deadline') as string) || null

  if (!nomeEmpresa || !nomeDiag) {
    redirect('/diagnostico/novo?error=Preencha+nome+da+empresa+e+do+diagnóstico.')
  }

  // 1. Cria empresa
  const empresaInsert: CompanyInsert = {
    name: nomeEmpresa,
    total_collaborators: totalColab,
    consultant_id: user.id,
  }
  const { data: empresa, error: errEmpresa } = await supabase
    .from('companies')
    .insert(empresaInsert as never)
    .select('id')
    .single()

  if (errEmpresa || !empresa) {
    redirect('/diagnostico/novo?error=Erro+ao+criar+empresa.')
  }

  // 2. Cria diagnóstico com status CRIADO
  const diagInsert: DiagnosticInsert = {
    company_id:    (empresa as { id: string }).id,
    consultant_id: user.id,
    name:          nomeDiag,
    leader_name:   nomeL,
    leader_email:  emailL,
    il_deadline:   ilDeadline,
    ic_deadline:   icDeadline,
  }
  const { data: diag, error: errDiag } = await supabase
    .from('diagnostics')
    .insert(diagInsert as never)
    .select('id')
    .single()

  if (errDiag || !diag) {
    redirect('/diagnostico/novo?error=Erro+ao+criar+diagnóstico.')
  }

  const diagId = (diag as { id: string }).id

  // 3. Avança status para AGUARDANDO_IL (IL liberado)
  const statusUpdate: DiagnosticUpdate = { status: 'AGUARDANDO_IL' }
  await supabase
    .from('diagnostics')
    .update(statusUpdate as never)
    .eq('id', diagId)

  redirect(`/diagnostico/${diagId}`)
}
