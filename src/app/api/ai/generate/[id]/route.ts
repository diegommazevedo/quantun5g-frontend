/**
 * POST /api/ai/generate/[id]
 * Dispara a geração do super relatório IA para um diagnóstico.
 * Requer autenticação (consultant ou admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { generateAiReport }          from '@/lib/ai/generate-report'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verifica se o usuário tem acesso ao diagnóstico
  const { data: diag } = await supabase
    .from('diagnostics')
    .select('id, consultant_id')
    .eq('id', id)
    .single() as { data: { id: string; consultant_id: string } | null }

  if (!diag) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  const isAdmin      = profile?.role === 'admin'
  const isConsultant = profile?.role === 'consultant' && diag.consultant_id === user.id

  if (!isAdmin && !isConsultant) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const result = await generateAiReport(id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, generated_at: result.report?.generated_at })
}
