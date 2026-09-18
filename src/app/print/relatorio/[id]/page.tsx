/**
 * Documento de impressão do relatório Pentagrama — sem sidebar/header/abas.
 * Abrir via "Exportar PDF"; o browser salva como PDF (Microsoft Print to PDF / Salvar como PDF).
 */

import { loadDiagnosticForPage } from '@/lib/pentagrama/require-diagnostic-page'
import { RelatorioDocument } from '@/components/relatorio/RelatorioDocument'
import { AutoPrint } from './AutoPrint'
import { loadDepartmentIcSummary } from '@/lib/pentagrama/load-department-ic-summary'
import type { Diagnostic, Company, DiagnosticResult, Laudo, Profile } from '@/types/database'

type DiagWithCompany = Diagnostic & {
  companies: Pick<Company, 'id' | 'name' | 'total_collaborators'>
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RelatorioPrintPage({ params }: Props) {
  const { id } = await params

  const { db, user, diagnostic: diagRaw } = await loadDiagnosticForPage(
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
      <div className="p-10 text-center text-sm text-zinc-600">
        Relatório ainda não gerado.
      </div>
    )
  }

  const { data: profile } = (await db
    .from('profiles')
    .select('name, email')
    .eq('id', user.id)
    .single()) as { data: Pick<Profile, 'name' | 'email'> | null }

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
  const company = diag.companies
  const dataGeracao = new Date(result.calculated_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const departmentSummary = await loadDepartmentIcSummary(db, id)

  const date = new Date()
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-')
  const safeName = company.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const fileName = `Pentagrama_${safeName}_${date}`

  return (
    <>
      <AutoPrint fileName={fileName} />
      <RelatorioDocument
        companyName={company.name}
        diagnosticName={diag.name}
        leaderName={diag.leader_name}
        consultantLabel={profile?.name ?? profile?.email ?? '—'}
        result={result}
        laudosMap={laudosMap}
        dataGeracao={dataGeracao}
        departmentSummary={departmentSummary}
      />
    </>
  )
}
