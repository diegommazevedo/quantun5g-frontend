/**
 * QUANTUM5G — NR-01 · Dashboard Econômico Executivo
 *
 * Quatro blocos verticais. Sem abas, sem tabs, sem gráfico.
 * Tipografia: serif para números grandes (Georgia/Playfair fallback),
 * sans para corpo. Verde para positivo, vermelho para exposição.
 *
 * Bloqueia se status != CONCLUIDO — não tenta renderizar com dados pela metade.
 */

import Link from 'next/link'
import { loadNr01AssessmentForPage } from '@/lib/nr01/require-assessment-page'
import {
  ASSESSMENT_STATUS_LABEL,
  Nr01Assessment,
  Nr01AssessmentResult,
  Nr01EconomicInputs,
  Nr01EconomicProjection,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from '@/types/nr01'
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_CLIENT_INPUTS,
  VECTOR_CONFIDENCE,
  computeFullProjection,
  formatBrl,
} from '@/lib/nr01/economic'
import { recalcularEconomico } from './actions'
import { DownloadPdfButton } from '@/components/nr01/DownloadPdfButton'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

type AssessFull = Nr01Assessment & {
  companies: { id: string; name: string; total_collaborators: number } | null
}

export default async function DashboardEconomicoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error } = await searchParams

  const { db, assessment: assessData } = await loadNr01AssessmentForPage(
    id,
    `
      *,
      companies:companies!nr01_assessments_company_id_fkey ( id, name, total_collaborators )
    `,
  )
  const a = assessData as unknown as AssessFull

  // Bloqueia se não está CONCLUIDO
  if (a.status !== 'CONCLUIDO') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard econômico</h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900">
            Dashboard econômico disponível apenas após o processamento dos resultados.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Status atual: <code className="rounded bg-amber-100 px-1.5 py-0.5">{ASSESSMENT_STATUS_LABEL[a.status]}</code>.
          </p>
          <Link
            href={`/nr01/avaliacao/${a.id}`}
            className="mt-4 inline-block text-sm font-medium text-amber-900 underline hover:text-amber-950"
          >
            ← Voltar à avaliação
          </Link>
        </div>
      </div>
    )
  }

  // Resultado + inputs + projeção
  const [{ data: resultData }, { data: inputsData }, { data: projData }] = await Promise.all([
    db.from('nr01_assessment_results').select('iso_score, iso_risk_level').eq('assessment_id', id).maybeSingle(),
    db.from('nr01_economic_inputs').select('*').eq('assessment_id', id).maybeSingle(),
    db.from('nr01_economic_projections').select('*').eq('assessment_id', id).maybeSingle(),
  ])

  const result = resultData as Pick<Nr01AssessmentResult, 'iso_score' | 'iso_risk_level'> | null
  const savedInputs = inputsData as Nr01EconomicInputs | null
  const savedProj = projData as Nr01EconomicProjection | null

  // Defaults para o form (oficiais, ver economic.ts)
  const totalCol = a.companies?.total_collaborators ?? 0
  const inputDefaults = {
    total_workers:           savedInputs?.total_workers           ?? totalCol,
    avg_monthly_salary_brl:  savedInputs?.avg_monthly_salary_brl  ?? DEFAULT_CLIENT_INPUTS.avg_monthly_salary_brl,
    cid_f_absences_last_year: savedInputs?.cid_f_absences_last_year
                              ?? Math.round(totalCol * (DEFAULT_CLIENT_INPUTS.cid_f_absence_rate_pct / 100)),
    avg_absence_days:        savedInputs?.avg_absence_days        ?? DEFAULT_CLIENT_INPUTS.avg_absence_days,
    voluntary_turnover_pct:  savedInputs?.voluntary_turnover_pct  ?? DEFAULT_CLIENT_INPUTS.voluntary_turnover_pct,
    rat_aliquot_pct:         savedInputs?.rat_aliquot_pct         ?? DEFAULT_CLIENT_INPUTS.rat_aliquot_pct,
    fap_multiplier:          savedInputs?.fap_multiplier          ?? DEFAULT_CLIENT_INPUTS.fap_multiplier,
    program_annual_cost_brl: savedInputs?.program_annual_cost_brl ?? Math.round(
      DEFAULT_CLIENT_INPUTS.avg_monthly_salary_brl * totalCol * 13.33 * (DEFAULT_CLIENT_INPUTS.program_cost_pct_of_payroll / 100),
    ),
  }

  // Se já há projeção persistida, usa ela. Senão, calcula on-the-fly para preview.
  let proj
  if (savedProj) {
    proj = {
      noAction: {
        v1_fines_brl:             Number(savedProj.na_fines_exposure_brl),
        v2_absence_brl:           Number(savedProj.na_absence_cost_brl),
        v3_turnover_brl:          Number(savedProj.na_turnover_cost_brl),
        v4_productivity_loss_brl: Number(savedProj.na_productivity_loss_brl),
        v5_fap_extra_brl:         Number(savedProj.na_fap_extra_cost_brl),
        v6_litigation_brl:        Number(savedProj.na_litigation_risk_brl),
        v7_reputation_proxy_brl:  0,
        total_brl:                Number(savedProj.na_total_brl),
      },
      partial: {
        total_savings_brl: Number(savedProj.ap_total_savings_brl),
        program_cost_brl:  Number(savedProj.ap_program_cost_brl),
        net_brl:           Number(savedProj.ap_net_brl),
      },
      integral: {
        total_savings_brl: Number(savedProj.ai_total_savings_brl),
        program_cost_brl:  Number(savedProj.ai_program_cost_brl),
        net_brl:           Number(savedProj.ai_net_brl),
        roi_pct:           savedProj.ai_roi_pct != null ? Number(savedProj.ai_roi_pct) : null,
        payback_months:    savedProj.ai_payback_months != null ? Number(savedProj.ai_payback_months) : null,
      },
    }
  } else {
    // Preview com defaults — total_payroll calculado inline
    const previewInputs: Nr01EconomicInputs = {
      id: '',
      assessment_id: id,
      total_workers: inputDefaults.total_workers,
      avg_monthly_salary_brl: inputDefaults.avg_monthly_salary_brl,
      total_payroll_brl_year: inputDefaults.avg_monthly_salary_brl * inputDefaults.total_workers * 13.33,
      cid_f_absences_last_year: inputDefaults.cid_f_absences_last_year,
      avg_absence_days: inputDefaults.avg_absence_days,
      voluntary_turnover_pct: inputDefaults.voluntary_turnover_pct,
      rat_aliquot_pct: inputDefaults.rat_aliquot_pct,
      fap_multiplier: inputDefaults.fap_multiplier,
      active_lawsuits: 0,
      avg_lawsuit_provision_brl: 0,
      program_annual_cost_brl: inputDefaults.program_annual_cost_brl,
      created_at: '',
      updated_at: '',
    }
    proj = computeFullProjection(
      previewInputs,
      result?.iso_score ?? null,
      result?.iso_risk_level ?? 'sem_dados',
      DEFAULT_ASSUMPTIONS,
    )
  }

  // Cenário recomendado
  const integralNet = proj.integral.net_brl
  const partialNet = proj.partial.net_brl
  const recommendedScenario =
    integralNet > partialNet ? 'integral'
    : partialNet > 0          ? 'parcial'
    :                           'integral'

  const recomendacaoTexto = (() => {
    const iso = result?.iso_score?.toFixed(1) ?? '—'
    const lvl = result?.iso_risk_level
      ? RISK_LEVEL_LABEL[result.iso_risk_level].toLowerCase()
      : 'sem dados'
    if (recommendedScenario === 'integral') {
      return `Dado ISO ${iso} (risco ${lvl}) e exposição de ${formatBrl(proj.noAction.total_brl)}, recomenda-se Cenário Integral: investimento de ${formatBrl(proj.integral.program_cost_brl)} gera economia líquida projetada de ${formatBrl(proj.integral.net_brl)} no ano 1${proj.integral.payback_months != null ? `, com payback de ${proj.integral.payback_months.toFixed(1)} meses` : ''}${proj.integral.roi_pct != null ? ` e ROI de ${proj.integral.roi_pct.toFixed(0)}%` : ''}.`
    }
    return `Dado ISO ${iso} (risco ${lvl}), recomenda-se Cenário Parcial neste ciclo: investimento de ${formatBrl(proj.partial.program_cost_brl)} gera economia líquida projetada de ${formatBrl(proj.partial.net_brl)} no ano 1.`
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard econômico</h1>
          <p className="mt-1 text-sm text-zinc-500">
            ISO {result?.iso_score?.toFixed(1) ?? '—'}{' '}
            {result?.iso_risk_level && (
              <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLOR[result.iso_risk_level]}`}>
                {RISK_LEVEL_LABEL[result.iso_risk_level]}
              </span>
            )}
            {' '}· Premissas: DIEESE / ISMA-BR / INSS 2024-2025
          </p>
        </div>
        <Link href={`/nr01/avaliacao/${a.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* ============================================================ */}
      {/* BLOCO 1 — Inputs                                             */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Inputs da simulação
          </h2>
          <span className="text-xs text-zinc-400">defaults pré-preenchidos · edite se quiser</span>
        </div>
        <form action={recalcularEconomico} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <input type="hidden" name="assessment_id" value={id} />

          <Field label="N° colaboradores" name="total_workers" type="number" min={1}
                 defaultValue={inputDefaults.total_workers} />
          <Field label="Folha mensal/colab. (R$)" name="avg_monthly_salary_brl" type="number" step="0.01" min={0}
                 defaultValue={inputDefaults.avg_monthly_salary_brl} />
          <Field label="Afastamentos CID-F/ano" name="cid_f_absences_last_year" type="number" min={0}
                 defaultValue={inputDefaults.cid_f_absences_last_year} />
          <Field label="Dias médios/afastamento" name="avg_absence_days" type="number" step="0.1" min={0}
                 defaultValue={inputDefaults.avg_absence_days} />
          <Field label="Turnover voluntário (%)" name="voluntary_turnover_pct" type="number" step="0.1" min={0}
                 defaultValue={inputDefaults.voluntary_turnover_pct} />
          <SelectField label="RAT (%)" name="rat_aliquot_pct"
                       defaultValue={inputDefaults.rat_aliquot_pct.toString()}
                       options={[['1.0','1%'],['2.0','2%'],['3.0','3%']]} />
          <Field label="FAP (multiplicador)" name="fap_multiplier" type="number" step="0.01" min={0.5} max={2.0}
                 defaultValue={inputDefaults.fap_multiplier} />
          <Field label="Custo do programa (R$/ano)" name="program_annual_cost_brl" type="number" step="0.01" min={0}
                 defaultValue={inputDefaults.program_annual_cost_brl} />

          <div className="col-span-2 flex items-end md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Recalcular
            </button>
          </div>
        </form>
      </section>

      {/* ============================================================ */}
      {/* BLOCO 2 — Exposição atual (número grande)                    */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
          Exposição atual — ano corrente, cenário NÃO AGIR
        </p>
        <p className="mt-2 font-serif text-6xl font-bold leading-none text-red-700">
          {formatBrl(proj.noAction.total_brl)}
        </p>
        <p className="mt-2 text-sm text-red-900">
          Exposição regulatória + econômica acumulada ao longo do próximo ano se nada for feito.
        </p>

        <div className="mt-5 grid grid-cols-1 divide-y divide-red-200/70 rounded-lg border border-red-200 bg-white text-sm md:grid-cols-2 md:divide-x md:divide-y-0">
          <VectorRow label="Multas MTE potenciais" value={proj.noAction.v1_fines_brl}
                     hint="200 trab × R$ 1.610–6.708 conforme severidade NR-01"
                     confidence={VECTOR_CONFIDENCE.v1_fines_brl} />
          <VectorRow label="Afastamentos CID-F" value={proj.noAction.v2_absence_brl}
                     hint="custo direto + retrabalho × dias médios × afastamentos/ano"
                     confidence={VECTOR_CONFIDENCE.v2_absence_brl} />
          <VectorRow label="Turnover atribuível" value={proj.noAction.v3_turnover_brl}
                     hint="40% do turnover voluntário × custo de reposição (1,5× sal. anual)"
                     confidence={VECTOR_CONFIDENCE.v3_turnover_brl} />
          <VectorRow label="Produtividade perdida (presenteísmo)" value={proj.noAction.v4_productivity_loss_brl}
                     hint="2-12% da folha bruta conforme nível de risco do ISO"
                     confidence={VECTOR_CONFIDENCE.v4_productivity_loss_brl} />
          <VectorRow label="FAP — penalidade previdenciária" value={proj.noAction.v5_fap_extra_brl}
                     hint="modelo simplificado · v2 com cálculo INSS oficial"
                     confidence={VECTOR_CONFIDENCE.v5_fap_extra_brl} />
          <VectorRow label="Contencioso esperado (CID-F)" value={proj.noAction.v6_litigation_brl}
                     hint="modelo simplificado · v2 com base de provisões reais"
                     confidence={VECTOR_CONFIDENCE.v6_litigation_brl} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* BLOCO 3 — Três cenários                                      */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Três cenários — projeção de 12 meses
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ScenarioCard
            title="Não agir"
            subtitle="Sem programa NR-01"
            value={proj.noAction.total_brl}
            valueLabel="Perda projetada"
            tone="negative"
            sentence={`A exposição não é hipotética: ${formatBrl(proj.noAction.v1_fines_brl)} em multas potenciais começam a contar a partir de 26/05/2026.`}
            highlight={false}
          />
          <ScenarioCard
            title="Agir parcial"
            subtitle="Plano enxuto · ~50% do potencial"
            value={proj.partial.net_brl}
            valueLabel="Resultado líquido (ano 1)"
            tone={proj.partial.net_brl >= 0 ? 'positive' : 'neutral'}
            sentence={`Investimento de ${formatBrl(proj.partial.program_cost_brl)} captura ${formatBrl(proj.partial.total_savings_brl)} em economia.`}
            highlight={recommendedScenario === 'parcial'}
          />
          <ScenarioCard
            title="Agir integral"
            subtitle="Programa completo · 85% do potencial"
            value={proj.integral.net_brl}
            valueLabel="Resultado líquido (ano 1)"
            tone="positive"
            sentence={`Investimento de ${formatBrl(proj.integral.program_cost_brl)} captura ${formatBrl(proj.integral.total_savings_brl)}${proj.integral.payback_months != null ? ` · payback ${proj.integral.payback_months.toFixed(1)}m` : ''}${proj.integral.roi_pct != null ? ` · ROI ${proj.integral.roi_pct.toFixed(0)}%` : ''}.`}
            highlight={recommendedScenario === 'integral'}
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* BLOCO 4 — Recomendação do sistema                            */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Recomendação do sistema
        </p>
        <p className="mt-3 text-base leading-relaxed text-emerald-950">
          {recomendacaoTexto}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DownloadPdfButton
            assessmentId={id}
            label="Baixar laudo técnico (PDF)"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          />
          <span className="text-xs text-emerald-700">
            Inclui esta projeção econômica + plano de ação + pacote de evidências.
          </span>
        </div>
      </section>

      {/* Bloco em roadmap */}
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-xs text-zinc-500">
        <strong>Em roadmap (v2):</strong> cálculo INSS oficial do FAP · provisões de contencioso baseadas em
        passivo real declarado · proxy de reputação por Glassdoor/employer branding · benchmark setorial.
      </section>
    </div>
  )
}

// ============================================================
// Componentes auxiliares (locais, sem nova rota)
// ============================================================

function Field({
  label, name, type, defaultValue, step, min, max,
}: {
  label: string; name: string; type: string;
  defaultValue: number | string; step?: string;
  min?: number; max?: number;
}) {
  return (
    <label className="flex flex-col text-xs text-zinc-600">
      <span className="mb-1">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        step={step}
        min={min}
        max={max}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
      />
    </label>
  )
}

function SelectField({
  label, name, defaultValue, options,
}: {
  label: string; name: string; defaultValue: string;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="flex flex-col text-xs text-zinc-600">
      <span className="mb-1">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  )
}

function VectorRow({
  label, value, hint, confidence,
}: {
  label: string; value: number; hint: string;
  confidence: 'production' | 'roadmap';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <div>
        <p className="text-sm text-zinc-700">{label}</p>
        <p className="text-[11px] text-zinc-400">{hint}</p>
      </div>
      <div className="text-right">
        <p className="font-serif text-base font-semibold text-zinc-900">
          {confidence === 'production' ? formatBrl(value) : 'em roadmap'}
        </p>
      </div>
    </div>
  )
}

function ScenarioCard({
  title, subtitle, value, valueLabel, tone, sentence, highlight,
}: {
  title: string; subtitle: string; value: number; valueLabel: string;
  tone: 'positive' | 'negative' | 'neutral'; sentence: string; highlight: boolean;
}) {
  const ringClass = highlight
    ? 'ring-2 ring-emerald-600 ring-offset-2 ring-offset-zinc-50'
    : ''
  const valueColor =
    tone === 'positive' ? 'text-emerald-700'
    : tone === 'negative' ? 'text-red-700'
    : 'text-zinc-900'
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-5 ${ringClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">{subtitle}</p>
      <p className={`mt-3 font-serif text-3xl font-bold leading-none ${valueColor}`}>
        {formatBrl(value)}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">{valueLabel}</p>
      <p className="mt-3 text-xs leading-relaxed text-zinc-700">{sentence}</p>
      {highlight && (
        <p className="mt-3 inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
          RECOMENDADO
        </p>
      )}
    </div>
  )
}
