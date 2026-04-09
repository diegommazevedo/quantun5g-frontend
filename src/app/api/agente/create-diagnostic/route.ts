/**
 * POST /api/agente/create-diagnostic
 * Cria empresa + diagnóstico via fluxo do agente IA.
 * Body: { company_name, leader_name, leader_email, n_collaborators? }
 * Retorna: { diagnosticId, il_url, ic_url }
 */

import { NextRequest, NextResponse }          from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient }                       from '@supabase/supabase-js'
import { randomUUID }                         from 'crypto'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function generateToken(): string {
  return randomUUID().replace(/-/g, '').slice(0, 32)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Apenas consultores e admin podem criar
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['admin', 'consultant'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json() as {
    company_name:    string
    leader_name:     string
    leader_email:    string
    n_collaborators?: number
  }

  const { company_name, leader_name, leader_email } = body

  if (!company_name?.trim() || !leader_name?.trim() || !leader_email?.trim()) {
    return NextResponse.json({ error: 'Dados incompletos (empresa, líder e e-mail são obrigatórios)' }, { status: 400 })
  }

  const admin = adminClient()

  // 1. Cria empresa
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .insert({ name: company_name.trim(), consultant_id: user.id })
    .select()
    .single()

  if (companyErr || !company) {
    return NextResponse.json(
      { error: 'Erro ao criar empresa: ' + (companyErr?.message ?? 'desconhecido') },
      { status: 500 },
    )
  }

  // 2. Gera tokens
  const token_il = generateToken()
  const token_ic = generateToken()

  // 3. Cria diagnóstico
  const { data: diagnostic, error: diagErr } = await admin
    .from('diagnostics')
    .insert({
      company_id:   company.id,
      name:         `Diagnóstico ${company_name.trim()}`,
      token_il,
      token_ic,
      status:       'collecting',
      leader_name:  leader_name.trim(),
      leader_email: leader_email.trim(),
    })
    .select()
    .single()

  if (diagErr || !diagnostic) {
    return NextResponse.json(
      { error: 'Erro ao criar diagnóstico: ' + (diagErr?.message ?? 'desconhecido') },
      { status: 500 },
    )
  }

  // 4. Convida líder por e-mail (não bloqueia se falhar — token é suficiente)
  try {
    await admin.auth.admin.inviteUserByEmail(leader_email.trim(), {
      data: {
        name:       leader_name.trim(),
        role:       'leader',
        company_id: company.id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/il/${token_il}`,
    })
  } catch { /* invite é best-effort */ }

  return NextResponse.json({
    diagnosticId: diagnostic.id,
    il_url:       token_il,
    ic_url:       token_ic,
  })
}
