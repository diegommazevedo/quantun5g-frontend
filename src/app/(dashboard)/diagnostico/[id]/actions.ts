'use server'

/**
 * QUANTUM5G — TELA-04: Actions do detalhe do diagnóstico
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * encerrarECalcular — chamado pelo modal de confirmação no cliente.
 * 1. Valida ownership
 * 2. Chama Edge Function calculate_diagnostic
 * 3. Avança status → RELATORIO_GERADO
 * 4. Redireciona para /relatorio/[id]
 */
export async function encerrarECalcular(diagnosticId: string): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Valida ownership + status
  const { data: diagRaw } = await supabase
    .from('diagnostics')
    .select('id, status, consultant_id')
    .eq('id', diagnosticId)
    .single()

  const diag = diagRaw as { id: string; status: string; consultant_id: string } | null
  if (!diag || diag.consultant_id !== user.id) return { error: 'Diagnóstico não encontrado.' }
  if (diag.status !== 'COLETANDO_IC') return { error: 'Status inválido para encerramento.' }

  // Chama a Edge Function com service role (a função exige autorização admin)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: fnError } = await supabaseAdmin.functions.invoke('calculate_diagnostic', {
    body: { diagnostic_id: diagnosticId },
  })

  if (fnError) {
    return { error: `Erro no cálculo: ${fnError.message}` }
  }

  // Avança status → RELATORIO_GERADO
  await supabase
    .from('diagnostics')
    .update({
      status: 'RELATORIO_GERADO',
      ic_closed_at: new Date().toISOString(),
    } as never)
    .eq('id', diagnosticId)

  revalidatePath(`/diagnostico/${diagnosticId}`)
  redirect(`/relatorio/${diagnosticId}`)
}
