/**
 * QUANTUM5G — TELA-08: Relatório de Diagnóstico
 * Rota: /relatorio/[id]
 * PDF: /print/relatorio/[id] (documento sem chrome do app)
 */

import { loadDiagnosticForPage } from '@/lib/pentagrama/require-diagnostic-page'
import type { Diagnostic, Company, DiagnosticResult, Laudo, Profile, AiReport } from '@/types/database'
import { PrintButton } from './PrintButton'
import { LiberarLiderButton } from './LiberarLiderButton'
import { SecaoIA } from '@/components/relatorio/SecaoIA'
import { RelatorioDocument } from '@/components/relatorio/RelatorioDocument'
import { createClient as adminCli } from '@supabase/supabase-js'

type DiagWithCompany = Diagnostic & {
  companies: Pick<Company, 'id' | 'name' | 'total_collaborators'>
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RelatorioPage({ params }: Props) {
  const { id } = await params

  const { db, user, role, diagnostic: diagRaw } = await loadDiagnosticForPage(
    id,
    '*, companies:companies!diagnostics_company_id_fkey(id, name, total_collaborators)',
  )
  const diag = diagRaw as unknown as DiagWithCompany

  const { data: result } = (await db
    .from('diagnostic_results')
    .select('*')
    .eq('diagnostic_id', id)
    .single()) as { data: DiagnosticResult | null }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center space-y-4">
        <p className="text-2xl">⏳</p>
        <h1 className="text-xl font-semibold text-zinc-800">Relatório ainda não gerado</h1>
        <p className="text-zinc-500 text-sm">
          O diagnóstico precisa ser encerrado e o motor de cálculo executado antes de visualizar
          o relatório.
        </p>
        <a href={`/diagnostico/${id}`} className="text-sm text-purple-700 hover:underline">
          ← Voltar ao diagnóstico
        </a>
      </div>
    )
  }

  const { data: profile } = (await db
    .from('profiles')
    .select('name, email, role')
    .eq('id', user.id)
    .single()) as { data: Pick<Profile, 'name' | 'email' | 'role'> | null }

  const isConsultantOrAdmin = role === 'admin' || role === 'consultant'

  const adminSupabase = adminCli(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: aiReports } = (await adminSupabase
    .from('ai_reports')
    .select('*')
    .eq('diagnostic_id', id)) as { data: AiReport[] | null }

  const aiReport =
    (aiReports ?? []).find((r) => !r.report_type || r.report_type === 'inicial') ?? null
  const expandedReport =
    (aiReports ?? []).find((r) => r.report_type === 'expandido') ?? null

  const laudoIds = [
    result.laudo_fisica_id,
    result.laudo_afetiva_id,
    result.laudo_racional_id,
    result.laudo_social_id,
    result.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } =
    laudoIds.length > 0
      ? ((await db.from('laudos').select('*').in('id', laudoIds)) as { data: Laudo[] | null })
      : { data: [] as Laudo[] }

  const laudosMap = Object.fromEntries((laudosRows ?? []).map((l) => [l.id, l]))
  const company = diag.companies as Pick<Company, 'id' | 'name' | 'total_collaborators'>
  const dataGeracao = new Date(result.calculated_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={`/diagnostico/${id}`}
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Voltar
          </a>
          <span className="text-zinc-200">|</span>
          <span className="text-sm font-medium text-zinc-800">Relatório — {diag.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {diag.leader_email && (
            <LiberarLiderButton diagnosticId={id} leaderEmail={diag.leader_email} />
          )}
          <PrintButton
            diagnosticId={id}
            companyName={company.name}
            diagnosticName={diag.name}
          />
        </div>
      </div>

      <RelatorioDocument
        companyName={company.name}
        diagnosticName={diag.name}
        leaderName={diag.leader_name}
        consultantLabel={profile?.name ?? profile?.email ?? '—'}
        result={result}
        laudosMap={laudosMap}
        dataGeracao={dataGeracao}
      />

      {isConsultantOrAdmin && (
        <div className="max-w-4xl mx-auto px-6 border-t border-zinc-100 no-print">
          <SecaoIA
            diagnosticId={id}
            companyName={company.name}
            report={aiReport}
            expandedReport={expandedReport}
            canGenerate={isConsultantOrAdmin}
          />
        </div>
      )}
    </div>
  )
}
