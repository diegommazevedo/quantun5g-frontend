/**
 * QUANTUM5G — Painel NR-01
 * Dashboard gerencial: KPIs + lista de avaliações com filtros.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { userHasNr01License } from '@/lib/billing/nr01-license'
import { isPlatformStaff } from '@/lib/auth/roles'
import type { UserRole } from '@/types/database'
import type { Nr01AssessmentResult, Nr01AssessmentStatus, Nr01RiskLevel } from '@/types/nr01'
import {
  DashboardEmptyState,
  ModuleDashboardShell,
} from '@/components/dashboard/ModuleDashboardShell'
import { Nr01AssessmentsList, type Nr01DashboardRow } from '@/components/nr01/Nr01AssessmentsList'

type Row = {
  id: string
  name: string
  status: Nr01AssessmentStatus
  reference_period: string | null
  competencia_label: string | null
  created_at: string
  linked_diagnostic_id: string | null
  companies: { name: string } | null
  nr01_assessment_results: Pick<
    Nr01AssessmentResult,
    'iso_score' | 'iso_risk_level' | 'adherence_pct'
  > | null
}

export default async function Nr01DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .returns<{ name: string | null; role: UserRole }[]>()
    .single()

  const role = (profile?.role ?? 'consultant') as UserRole
  const isAdmin = role === 'admin'
  const isLeader = role === 'leader'

  let canCreateAssessment = isAdmin || isPlatformStaff(role)
  if (isLeader) {
    canCreateAssessment = await userHasNr01License(user.id)
  } else if (!isAdmin && isPlatformStaff(role)) {
    canCreateAssessment = true
  }

  const query = supabase
    .from('nr01_assessments')
    .select(`
      id, name, status, reference_period, competencia_label, created_at, linked_diagnostic_id,
      companies:companies!nr01_assessments_company_id_fkey ( name ),
      nr01_assessment_results ( iso_score, iso_risk_level, adherence_pct )
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin && !isLeader) {
    query.eq('consultant_id', user.id)
  }

  const { data, error } = await query
  const raw = (data ?? []) as unknown as Row[]

  const rows: Nr01DashboardRow[] = raw.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    reference_period: r.reference_period,
    competencia_label: r.competencia_label,
    created_at: r.created_at,
    company_name: r.companies?.name ?? null,
    linked_diagnostic_id: r.linked_diagnostic_id,
    iso_score: r.nr01_assessment_results?.iso_score ?? null,
    iso_risk_level: (r.nr01_assessment_results?.iso_risk_level ?? 'sem_dados') as Nr01RiskLevel,
    adherence_pct: r.nr01_assessment_results?.adherence_pct ?? null,
  }))

  const total = rows.length
  const ativos = rows.filter((r) =>
    ['CRIADO', 'COLETANDO', 'COLETA_ENCERRADA', 'PROCESSANDO'].includes(r.status),
  ).length
  const concluidas = rows.filter((r) => r.status === 'CONCLUIDO').length

  const firstName = profile?.name?.split(' ')[0]

  return (
    <ModuleDashboardShell
      module="nr01"
      firstName={firstName}
      primaryAction={{ href: '/nr01/avaliacao/nova', label: '+ Nova avaliação' }}
      primaryActionEnabled={canCreateAssessment}
      primaryActionLockedHref="/contratacao"
      sectionTitle="Avaliações"
      alert={
        !canCreateAssessment && !error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Licença NR-01 pendente.{' '}
            <Link href="/contratacao" className="font-semibold underline">
              Emitir fatura
            </Link>{' '}
            ou aguarde o administrador marcar o pagamento presencial como paga.
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message}
          </div>
        ) : undefined
      }
      stats={[
        { label: 'Total', value: total },
        {
          label: 'Em andamento',
          value: ativos,
          tone: 'active',
          hint: 'Coleta aberta ou processamento',
        },
        {
          label: 'Concluídas',
          value: concluidas,
          tone: 'success',
          hint: 'Laudo e evidências disponíveis',
        },
      ]}
    >
      {rows.length === 0 ? (
        <DashboardEmptyState
          message="Nenhuma avaliação NR-01 ainda."
          hint="Vincule a uma empresa, abra a coleta e acompanhe adesão e ISO aqui."
          action={{
            href: canCreateAssessment ? '/nr01/avaliacao/nova' : '/contratacao',
            label: canCreateAssessment ? 'Criar primeira avaliação' : 'Contratar / emitir fatura',
          }}
        />
      ) : (
        <Nr01AssessmentsList rows={rows} />
      )}
    </ModuleDashboardShell>
  )
}
