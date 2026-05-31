/**
 * QUANTUM5G — Painel Pentagrama
 * Dashboard gerencial: KPIs + lista de diagnósticos com filtros.
 */

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'
import { DiagnosticosList, type DiagRow } from '@/components/dashboard/DiagnosticosList'
import {
  DashboardEmptyState,
  ModuleDashboardShell,
} from '@/components/dashboard/ModuleDashboardShell'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user!.id)
    .returns<{ name: string | null; role: UserRole }[]>()
    .single()

  const isAdmin = profile?.role === 'admin'

  const diagQuery = supabase
    .from('diagnostics')
    .select('id, name, status, created_at, leader_name, companies(name)')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    diagQuery.eq('consultant_id', user!.id)
  }

  const { data: diagRaw } = (await diagQuery) as {
    data: {
      id: string
      name: string
      status: string
      created_at: string
      leader_name: string | null
      companies: { name: string } | null
    }[] | null
  }

  const diags = diagRaw ?? []
  let icCountMap: Record<string, number> = {}

  if (diags.length > 0) {
    const diagIds = diags.map((d) => d.id)
    const { data: icRows } = (await supabase
      .from('ic_responses')
      .select('diagnostic_id, respondente_anonimo_id')
      .in('diagnostic_id', diagIds)) as {
      data: { diagnostic_id: string; respondente_anonimo_id: string }[] | null
    }

    const seen = new Set<string>()
    for (const row of icRows ?? []) {
      const key = `${row.diagnostic_id}:${row.respondente_anonimo_id}`
      if (!seen.has(key)) {
        seen.add(key)
        icCountMap[row.diagnostic_id] = (icCountMap[row.diagnostic_id] ?? 0) + 1
      }
    }
  }

  const diagnosticos: DiagRow[] = diags.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    created_at: d.created_at,
    leader_name: d.leader_name,
    company_name: d.companies?.name ?? null,
    ic_count: icCountMap[d.id] ?? 0,
  }))

  const total = diagnosticos.length
  const ativos = diagnosticos.filter((d) =>
    ['AGUARDANDO_IL', 'COLETANDO_IC', 'CRIADO'].includes(d.status),
  ).length
  const prontos = diagnosticos.filter((d) =>
    ['RELATORIO_GERADO', 'ENCERRADO'].includes(d.status),
  ).length

  const firstName = profile?.name?.split(' ')[0]

  return (
    <ModuleDashboardShell
      module="pentagrama"
      firstName={firstName}
      primaryAction={{ href: '/diagnostico/novo', label: '+ Novo diagnóstico' }}
      sectionTitle="Diagnósticos"
      stats={[
        { label: 'Total', value: total },
        {
          label: 'Em andamento',
          value: ativos,
          tone: 'active',
          hint: 'IL pendente ou IC em coleta',
        },
        {
          label: 'Com relatório',
          value: prontos,
          tone: 'success',
          hint: 'Encerrados ou laudo gerado',
        },
      ]}
      alert={
        error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {decodeURIComponent(error)}
          </div>
        ) : undefined
      }
    >
      {diagnosticos.length === 0 ? (
        <DashboardEmptyState
          message="Nenhum diagnóstico ainda."
          hint="Cadastre uma empresa, defina a competência e dispare os convites IL/IC."
          action={{ href: '/diagnostico/novo', label: 'Criar primeiro diagnóstico' }}
        />
      ) : (
        <DiagnosticosList diagnosticos={diagnosticos} />
      )}
    </ModuleDashboardShell>
  )
}
