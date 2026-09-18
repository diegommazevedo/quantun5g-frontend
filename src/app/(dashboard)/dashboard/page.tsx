/**
 * QUANTUM5G — Painel Pentagrama
 * Dashboard gerencial: KPIs + lista de diagnósticos com filtros.
 */

import { getPageActor } from '@/lib/org/page-actor'
import {
  loadIcRespondentCounts,
  loadPentagramaDashboardDiagnostics,
} from '@/lib/pentagrama/dashboard-data'
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
  const { user, role, profile, db } = await getPageActor()

  // Ambos os módulos liberados para qualquer usuário cadastrado.
  const canCreateDiagnostic = true

  const diags = await loadPentagramaDashboardDiagnostics(role, user.id, db)
  const diagIds = diags.map((d) => d.id)
  const icCountMap = await loadIcRespondentCounts(role, db, diagIds)

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
      primaryActionEnabled={canCreateDiagnostic}
      primaryActionLockedHref="/checkout/nr01"
      sectionTitle="Diagnósticos"
      alert={
        error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        ) : undefined
      }
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
    >
      {diagnosticos.length === 0 ? (
        <DashboardEmptyState
          message="Nenhum diagnóstico ainda."
          hint="Cadastre uma empresa, defina a competência e dispare os convites IL/IC."
          action={{
            href: canCreateDiagnostic ? '/diagnostico/novo' : '/checkout/nr01',
            label: canCreateDiagnostic ? 'Criar primeiro diagnóstico' : 'Contratar Pentagrama',
          }}
        />
      ) : (
        <DiagnosticosList diagnosticos={diagnosticos} />
      )}
    </ModuleDashboardShell>
  )
}
