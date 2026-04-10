/**
 * POST /api/ai/generate-expanded/[id]
 * Gera relatório expandido a partir da conversa com o agente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateExpandedReport } from '@/lib/ai/generate-expanded-report'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Permissão: consultant (dono) ou admin
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: diag } = await admin
    .from('diagnostics')
    .select('consultant_id')
    .eq('id', id)
    .single()

  if (!diag) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin && diag.consultant_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Gera
  const result = await generateExpandedReport(id)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    success:      true,
    generated_at: result.report?.generated_at,
  })
}
