/**
 * QUANTUM5G — Painel Pentagrama
 * Dashboard gerencial: KPIs + lista de diagnósticos com filtros.
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { userHasPentagramaLicense } from '@/lib/billing/pentagrama-license'
import { isPlatformStaff } from '@/lib/auth/roles'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { loadCompanyIdsForContratante, loadCompanyIdsForGerente } from '@/lib/org/queries'
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

  const role = profile?.role ?? 'consultant'
  const isAdmin = role === 'admin'
  const isLeader = role === 'leader'
  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)

  let canCreateDiagnostic = isAdmin || isPlatformStaff(role)
  if (isLeader || isContratante || isGerente) {
    canCreateDiagnostic = await userHasPentagramaLicense(user!.id)
  }

  const diagQuery = supabase
    .from('diagnostics')
    .select('id, name, status, created_at, leader_name, companies(name)')
    .order('created_at', { ascending: false })

  if (!isAdmin && !isLeader && !isContratante && !isGerente) {
    diagQuery.eq('consultant_id', user!.id)
  } else if (isContratante) {
    const ids = await loadCompanyIdsForContratante(user!.id)
    if (ids.length) diagQuery.in('company_id', ids)
    else diagQuery.eq('company_id', '00000000-0000-0000-0000-000000000000')
  } else if (isGerente) {
    const ids = await loadCompanyIdsForGerente(user!.id)
    if (ids.length) diagQuery.in('company_id', ids)
    else diagQuery.eq('company_id', '00000000-0000-0000-0000-000000000000')
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
