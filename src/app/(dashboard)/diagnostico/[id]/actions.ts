'use server'

/**
 * QUANTUM5G — TELA-04: Actions do detalhe do diagnóstico
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { ensureDiagnosticAccess } from '@/lib/pentagrama/diagnostic-access'

async function edgeErrorDetail(fnError: { message: string; context?: Response }): Promise<string> {
  try {
    const ctx = fnError.context
    if (ctx) {
      const body = (await ctx.json()) as { error?: string; detail?: string }
      if (body?.error) {
        return body.detail ? `${body.error} (${body.detail})` : body.error
      }
    }
  } catch {
    /* body ilegível — cai no message genérico */
  }
  return fnError.message
}

/**
 * encerrarECalcular — chamado pelo modal de confirmação no cliente.
 * 1. Valida ownership (org / consultor / admin)
 * 2. Exige IL respondido (Decisão 003 — IL antes do cálculo)
 * 3. Chama Edge Function calculate_diagnostic
 * 4. Avança status → RELATORIO_GERADO
 * 5. Redireciona para /relatorio/[id]
 */
export async function encerrarECalcular(diagnosticId: string): Promise<{ error: string }> {
  const { db, diagnostic: diagRaw } = await ensureDiagnosticAccess(
    diagnosticId,
    'id, status, consultant_id, il_submitted_at',
  )
  const diag = diagRaw as {
    id: string
    status: string
    consultant_id: string
    il_submitted_at: string | null
  }

  if (!isPentagramaColetaAberta(diag.status)) {
    return { error: 'Status inválido para encerramento.' }
  }

  const { data: ilRow } = await db
    .from('il_responses')
    .select('id')
    .eq('diagnostic_id', diagnosticId)
    .maybeSingle()

  if (!ilRow && !diag.il_submitted_at) {
    return {
      error:
        'A liderança ainda não respondeu o IL. Complete o questionário IL antes de encerrar e calcular o diagnóstico.',
    }
  }

  // Edge Function só aceita COLETANDO_IC | ENCERRADO. Se o IL já foi
  // respondido mas o status ficou em AGUARDANDO_IL (legado/race), alinha.
  if (diag.status === 'AGUARDANDO_IL') {
    await db
      .from('diagnostics')
      .update({ status: 'COLETANDO_IC' } as never)
      .eq('id', diagnosticId)
      .eq('status', 'AGUARDANDO_IL')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: fnError } = await supabaseAdmin.functions.invoke('calculate_diagnostic', {
    body: { diagnostic_id: diagnosticId },
  })

  if (fnError) {
    const detail = await edgeErrorDetail(fnError as { message: string; context?: Response })
    return { error: `Erro no cálculo: ${detail}` }
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
