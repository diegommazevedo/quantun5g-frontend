/**
 * QUANTUM5G — NR-01 Dashboard
 * Lista avaliações do consultor com status, ISO e adesão.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Nr01Assessment,
  Nr01AssessmentResult,
  RISK_LEVEL_LABEL,
  RISK_LEVEL_COLOR,
} from '@/types/nr01'

type Row = Nr01Assessment & {
  companies: { name: string; total_collaborators: number } | null
  nr01_assessment_results: Pick<Nr01AssessmentResult, 'iso_score' | 'iso_risk_level' | 'adherence_pct'> | null
}

export default async function Nr01DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('nr01_assessments')
    .select(`
      id, name, status, reference_period, instrument_version, modality,
      collection_token, expected_respondents, collection_opens_at,
      collection_closes_at, linked_diagnostic_id, created_at, updated_at,
      company_id, consultant_id, k_anonymity_min, technical_lead_id, technical_lead_crp,
      companies:companies!nr01_assessments_company_id_fkey ( name, total_collaborators ),
      nr01_assessment_results ( iso_score, iso_risk_level, adherence_pct )
    `)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Avaliações NR-01</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Risco psicossocial conforme NR-01/GRO. Vigência punitiva: 26/05/2026.
          </p>
        </div>
        <Link
          href="/nr01/avaliacao/nova"
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          + Nova avaliação
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-700">Nenhuma avaliação NR-01 ainda.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Comece criando uma avaliação para gerar o pacote de evidências auditável.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Adesão</th>
                <th className="px-4 py-3">ISO</th>
                <th className="px-4 py-3">Risco</th>
                <th className="px-4 py-3">Pentagrama</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const iso = r.nr01_assessment_results?.iso_score ?? null
                const level = r.nr01_assessment_results?.iso_risk_level ?? 'sem_dados'
                const adh = r.nr01_assessment_results?.adherence_pct
                return (
                  <tr key={r.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-zinc-500">{r.reference_period ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{r.companies?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {adh != null ? `${adh.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-900">
                      {iso != null ? iso.toFixed(1) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLOR[level]}`}>
                        {RISK_LEVEL_LABEL[level]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {r.linked_diagnostic_id ? (
                        <Link
                          href={`/diagnostico/${r.linked_diagnostic_id}`}
                          className="text-zinc-700 underline hover:text-zinc-900"
                        >
                          Diagnóstico vinculado
                        </Link>
                      ) : (
                        <span className="text-zinc-400">não vinculado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/nr01/avaliacao/${r.id}`}
                        className="text-orange-600 hover:text-orange-800"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
        <strong>Janela regulatória.</strong> A vigência punitiva da exigência de avaliação
        de FRPRT começa em 26/05/2026. Empresas sem PGR atualizado com FRPRT estão sujeitas
        a multa por trabalhador exposto (R$ 1.610,12 a R$ 6.708,08).
      </div>
    </div>
  )
}
