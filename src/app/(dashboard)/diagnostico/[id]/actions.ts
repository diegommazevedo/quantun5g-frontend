'use server'

/**
 * QUANTUM5G — TELA-04: Actions do detalhe do diagnóstico
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { ensureDiagnosticAccess } from '@/lib/pentagrama/diagnostic-access'

/**
 * encerrarECalcular — chamado pelo modal de confirmação no cliente.
 * 1. Valida ownership (org / consultor / admin)
 * 2. Chama Edge Function calculate_diagnostic
 * 3. Avança status → RELATORIO_GERADO
 * 4. Redireciona para /relatorio/[id]
 */
export async function encerrarECalcular(diagnosticId: string): Promise<{ error: string }> {
  const { db, diagnostic: diagRaw } = await ensureDiagnosticAccess(diagnosticId, 'id, status, consultant_id')
  const diag = diagRaw as { id: string; status: string; consultant_id: string }

  if (!isPentagramaColetaAberta(diag.status)) return { error: 'Status inválido para encerramento.' }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: fnError } = await supabaseAdmin.functions.invoke('calculate_diagnostic', {
    body: { diagnostic_id: diagnosticId },
  })

  if (fnError) {
    return { error: `Erro no cálculo: ${fnError.message}` }
  }

  await db
    .from('diagnostics')
    .update({
      status: 'RELATORIO_GERADO',
      ic_closed_at: new Date().toISOString(),
    } as never)
    .eq('id', diagnosticId)

  revalidatePath(`/diagnostico/${diagnosticId}`)
  redirect(`/relatorio/${diagnosticId}`)
}
