/**
 * QUANTUM5G — TELA-02: Dashboard do Consultor
 * Lista de diagnósticos com filtro por status.
 */

import { createClient }        from '@/lib/supabase/server'
import Link                    from 'next/link'
import type { UserRole }       from '@/types/database'
import { isPlatformStaff }     from '@/lib/auth/roles'
import { DiagnosticosList }    from '@/components/dashboard/DiagnosticosList'
import type { DiagRow }        from '@/components/dashboard/DiagnosticosList'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // ── Perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, module_pentagrama, module_nr01')
    .eq('id', user!.id)
    .returns<{ name: string | null; role: UserRole; module_pentagrama: boolean; module_nr01: boolean }[]>()
    .single()

  const staff = isPlatformStaff(profile?.role)

  // ── Diagnósticos com empresa (admin vê todos, consultant vê os seus)
  const isAdmin = profile?.role === 'admin'

  const diagQuery = supabase
    .from('diagnostics')
    .select('id, name, status, created_at, leader_name, companies(name)')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    diagQuery.eq('consultant_id', user!.id)
  }

  const { data: diagRaw } = await diagQuery as {
    data: {
      id:          string
      name:        string
      status:      string
      created_at:  string
      leader_name: string | null
      companies:   { name: string } | null
    }[] | null
  }

  const diags = diagRaw ?? []

  // ── Contagem de IC responses — busca apenas IDs distintos por diagnóstico
  let icCountMap: Record<string, number> = {}

  if (diags.length > 0) {
    const diagIds = diags.map(d => d.id)

    // Busca apenas respondente_anonimo_id distinto (1 por respondente, não 1 por questão)
    const { data: icRows } = await supabase
      .from('ic_responses')
      .select('diagnostic_id, respondente_anonimo_id')
      .in('diagnostic_id', diagIds) as { data: { diagnostic_id: string; respondente_anonimo_id: string }[] | null }

    // Conta respondentes únicos por diagnóstico
    const seen = new Set<string>()
    for (const row of (icRows ?? [])) {
      const key = `${row.diagnostic_id}:${row.respondente_anonimo_id}`
      if (!seen.has(key)) {
        seen.add(key)
        icCountMap[row.diagnostic_id] = (icCountMap[row.diagnostic_id] ?? 0) + 1
      }
    }
  }

  // ── Monta DiagRow para o componente
  const diagnosticos: DiagRow[] = diags.map(d => ({
    id:           d.id,
    name:         d.name,
    status:       d.status,
    created_at:   d.created_at,
    leader_name:  d.leader_name,
    company_name: d.companies?.name ?? null,
    ic_count:     icCountMap[d.id] ?? 0,
  }))

  // ── Cards de resumo
  const total    = diagnosticos.length
  const ativos   = diagnosticos.filter(d => ['AGUARDANDO_IL', 'COLETANDO_IC', 'CRIADO'].includes(d.status)).length
  const prontos  = diagnosticos.filter(d => ['RELATORIO_GERADO', 'ENCERRADO'].includes(d.status)).length

  const firstName = profile?.name?.split(' ')[0] ?? 'Consultor'

  return (
    <div className="space-y-8">

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {decodeURIComponent(error)}
        </div>
      )}

      {staff && (
        <div className="grid gap-3 sm:grid-cols-2">
          {profile?.module_pentagrama !== false && (
            <Link
              href="/empresas"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-300"
            >
              <p className="text-sm font-semibold text-zinc-900">Empresas e equipe</p>
              <p className="mt-1 text-xs text-zinc-500">CNPJ, RT, líderes IL, colaboradores IC, listas de e-mail</p>
            </Link>
          )}
          {profile?.module_nr01 !== false && (
            <Link
              href="/nr01/dashboard"
              className="rounded-xl border border-blue-200 bg-blue-50/50 px-5 py-4 hover:border-blue-300"
            >
              <p className="text-sm font-semibold text-blue-900">Módulo NR-01</p>
              <p className="mt-1 text-xs text-blue-800/80">Avaliações, coleta, disparos e laudos</p>
            </Link>
          )}
        </div>
      )}

      {/* Boas-vindas */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Olá, {firstName}</h1>
          <p className="text-zinc-500 mt-1">Painel de diagnósticos organizacionais</p>
        </div>
        <Link
          href="/diagnostico/novo"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors whitespace-nowrap"
        >
          + Novo diagnóstico
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Total</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{total}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Em andamento</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{ativos}</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-6 py-5">
          <p className="text-xs text-purple-500 uppercase tracking-wide">Com relatório</p>
          <p className="text-3xl font-bold text-purple-900 mt-1">{prontos}</p>
        </div>
      </div>

      {/* Lista de diagnósticos */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">Diagnósticos</h2>
        {diagnosticos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
            <p className="text-zinc-400 text-sm">Nenhum diagnóstico ainda.</p>
            <Link
              href="/diagnostico/novo"
              className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Criar primeiro diagnóstico
            </Link>
          </div>
        ) : (
          <DiagnosticosList diagnosticos={diagnosticos} />
        )}
      </div>

    </div>
  )
}
