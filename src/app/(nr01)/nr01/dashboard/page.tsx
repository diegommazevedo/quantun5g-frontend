/**
 * QUANTUM5G — Painel NR-01
 * Dashboard gerencial: KPIs + lista de avaliações com filtros.
 */

import Link from 'next/link'
import { userHasNr01License } from '@/lib/billing/nr01-license'
import { isPlatformStaff } from '@/lib/auth/roles'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { loadCompanyIdsForContratante, loadCompanyIdsForGerente } from '@/lib/org/queries'
import { getPageActor } from '@/lib/org/page-actor'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { Nr01AssessmentResult, Nr01AssessmentStatus, Nr01RiskLevel } from '@/types/nr01'
import {
  DashboardEmptyState,
  ModuleDashboardShell,
} from '@/components/dashboard/ModuleDashboardShell'
import { Nr01AssessmentsList, type Nr01DashboardRow } from '@/components/nr01/Nr01AssessmentsList'
import { OnboardingChecklist, type OnboardingStep } from '@/components/onboarding/OnboardingChecklist'

type Row = {
  id: string
  name: string
  status: Nr01AssessmentStatus
  reference_period: string | null
  competencia_label: string | null
  created_at: string
  linked_diagnostic_id: string | null
  expected_respondents: number
  companies: { name: string } | null
  nr01_assessment_results: Pick<
    Nr01AssessmentResult,
    'iso_score' | 'iso_risk_level' | 'adherence_pct'
  > | null
}

export default async function Nr01DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; welcome?: string }>
}) {
  const { error: errorParam, welcome } = await searchParams
  const { user, role, profile, db } = await getPageActor()

  const isAdmin = role === 'admin'
  const isLeader = role === 'leader'
  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)

  // Verifica se o contratante já tem uma organização configurada
  let hasOrg = true
  if (isContratante) {
    const adminClient = createServiceRoleAdmin()
    const { data: orgRow } = await adminClient
      .from('org_accounts')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle()
    hasOrg = !!orgRow
  }

  // IDs de empresas do contratante (carregado cedo para reuso no checklist)
  let contratanteCompanyIds: string[] = []

  let canCreateAssessment = isAdmin || isPlatformStaff(role)
  if (isLeader || isContratante || isGerente) {
    canCreateAssessment = profile?.module_nr01 === true || (await userHasNr01License(user.id))
  } else if (!isAdmin && isPlatformStaff(role)) {
    canCreateAssessment = true
  }

  const query = db
    .from('nr01_assessments')
    .select(`
      id, name, status, reference_period, competencia_label, created_at, linked_diagnostic_id,
      expected_respondents,
      companies:companies!nr01_assessments_company_id_fkey ( name ),
      nr01_assessment_results ( iso_score, iso_risk_level, adherence_pct )
    `)
    .order('created_at', { ascending: false })

  if (!isAdmin && !isLeader && !isContratante && !isGerente) {
    query.eq('consultant_id', user.id)
  } else if (isContratante) {
    contratanteCompanyIds = await loadCompanyIdsForContratante(user.id)
    if (contratanteCompanyIds.length) query.in('company_id', contratanteCompanyIds)
    else query.eq('company_id', '00000000-0000-0000-0000-000000000000')
  } else if (isGerente) {
    const ids = await loadCompanyIdsForGerente(user.id)
    if (ids.length) query.in('company_id', ids)
    else query.eq('company_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await query
  const raw = (data ?? []) as unknown as Row[]

  const assessmentIds = raw.map((r) => r.id)
  const responseCountByAssessment: Record<string, number> = {}
  if (assessmentIds.length) {
    const { data: respRows } = await db
      .from('nr01_responses')
      .select('assessment_id')
      .in('assessment_id', assessmentIds)
    for (const row of respRows ?? []) {
      const aid = (row as { assessment_id: string }).assessment_id
      responseCountByAssessment[aid] = (responseCountByAssessment[aid] ?? 0) + 1
    }
  }

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
    response_count: responseCountByAssessment[r.id] ?? 0,
    expected_respondents: r.expected_respondents ?? 0,
  }))

  const total = rows.length
  const ativos = rows.filter((r) =>
    ['CRIADO', 'COLETANDO', 'COLETA_ENCERRADA', 'PROCESSANDO'].includes(r.status),
  ).length
  const concluidas = rows.filter((r) => r.status === 'CONCLUIDO').length

  const firstName = profile?.name?.split(' ')[0]

  // Checklist de onboarding — apenas para contratante, some quando tudo concluído
  let onboardingSteps: OnboardingStep[] | null = null
  if (isContratante) {
    const hasCnpj = contratanteCompanyIds.length > 0
    const hasAssessment = rows.length > 0
    const hasColeta = rows.some((r) =>
      ['COLETANDO', 'COLETA_ENCERRADA', 'PROCESSANDO', 'CONCLUIDO'].includes(r.status),
    )
    const hasRespostas = rows.some((r) => r.response_count >= 5)
    const hasLaudo = rows.some((r) => r.status === 'CONCLUIDO')

    onboardingSteps = [
      {
        id: 'conta',
        label: 'Ativar sua conta',
        description: 'Senha definida e acesso liberado.',
        href: '/nr01/dashboard',
        done: true,
      },
      {
        id: 'cnpj',
        label: 'Cadastrar CNPJ da empresa',
        description: 'Registre a empresa que será avaliada (razão social, CNPJ e RT assinante).',
        href: '/empresas/nova',
        done: hasCnpj,
      },
      {
        id: 'avaliacao',
        label: 'Criar avaliação NR-01',
        description: 'Defina o período de competência, número de colaboradores e datas da coleta.',
        href: '/nr01/avaliacao/nova',
        done: hasAssessment,
      },
      {
        id: 'coleta',
        label: 'Abrir coleta com colaboradores',
        description: 'Envie o link anônimo para sua equipe responder. Mínimo 5 respostas.',
        href: rows.find((r) => r.status === 'CRIADO')
          ? `/nr01/avaliacao/${rows.find((r) => r.status === 'CRIADO')!.id}`
          : '/nr01/avaliacao/nova',
        done: hasColeta,
      },
      {
        id: 'respostas',
        label: 'Atingir respostas mínimas (5+)',
        description: 'Aguarde os colaboradores responderem. Acompanhe o progresso na avaliação.',
        href: rows.find((r) => r.status === 'COLETANDO')
          ? `/nr01/avaliacao/${rows.find((r) => r.status === 'COLETANDO')!.id}`
          : '/nr01/dashboard',
        done: hasRespostas,
      },
      {
        id: 'laudo',
        label: 'Emitir seu primeiro laudo',
        description: 'Encerre a coleta e gere o pacote de evidências e laudo NR-01.',
        href: rows.find((r) => r.status === 'COLETA_ENCERRADA')
          ? `/nr01/avaliacao/${rows.find((r) => r.status === 'COLETA_ENCERRADA')!.id}`
          : '/nr01/dashboard',
        done: hasLaudo,
      },
    ]
  }

  return (
    <ModuleDashboardShell
      module="nr01"
      firstName={firstName}
      primaryAction={{ href: '/nr01/avaliacao/nova', label: '+ Nova avaliação' }}
      primaryActionEnabled={canCreateAssessment}
      primaryActionLockedHref="/contratacao"
      sectionTitle="Avaliações"
      alert={
        onboardingSteps ? (
          <OnboardingChecklist steps={onboardingSteps} />
        ) : errorParam === 'avaliacao-nao-encontrada' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Avaliação não encontrada ou sem permissão para o seu perfil. Verifique o link ou escolha na lista abaixo.
          </div>
        ) : !canCreateAssessment && !error ? (
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
