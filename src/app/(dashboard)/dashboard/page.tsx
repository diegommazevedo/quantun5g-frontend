/**
 * QUANTUM5G — Painel Pentagrama
 * Dashboard gerencial: KPIs + lista de diagnósticos com filtros.
 */

import Link from 'next/link'
import { userHasPentagramaLicense } from '@/lib/billing/pentagrama-license'
import { isPlatformStaff } from '@/lib/auth/roles'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
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

  const isAdmin = role === 'admin'
  const isLeader = role === 'leader'
  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)

  let canCreateDiagnostic = isAdmin || isPlatformStaff(role)
  if (isLeader || isContratante || isGerente) {
    canCreateDiagnostic =
      profile?.module_pentagrama === true || (await userHasPentagramaLicense(user.id))
  }

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
      primaryActionLockedHref="/contratacao"
      sectionTitle="Diagnósticos"
      alert={
        !canCreateDiagnostic && !error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isContratante || isGerente ? (
              <>
                Módulo Pentagrama indisponível para sua conta. Peça ao administrador Quantum5G
                ou ao consultor da organização para ativar o acesso.
              </>
            ) : (
              <>
                Licença Pentagrama pendente.{' '}
                <Link href="/contratacao" className="font-semibold underline">
                  Emitir fatura
                </Link>{' '}
                ou aguarde o administrador marcar o pagamento como pago.
              </>
            )}
          </div>
        ) : error ? (
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
            href: canCreateDiagnostic ? '/diagnostico/novo' : '/contratacao',
            label: canCreateDiagnostic ? 'Criar primeiro diagnóstico' : 'Contratar Pentagrama',
          }}
        />
      ) : (
        <DiagnosticosList diagnosticos={diagnosticos} />
      )}
    </ModuleDashboardShell>
  )
}
