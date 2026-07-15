/**
 * QUANTUM5G — NR-01 · Página da avaliação
 * Status, link de coleta, adesão, ações de processamento e exports.
 */

import Link from 'next/link'
import { loadNr01AssessmentForPage } from '@/lib/nr01/require-assessment-page'
import {
  ASSESSMENT_STATUS_COLOR,
  ASSESSMENT_STATUS_LABEL,
  NR01_DIMENSION_LABEL,
  Nr01Assessment,
  Nr01AssessmentResult,
  Nr01DimensionScore,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from '@/types/nr01'
import { abrirColeta, processarResultados, encerrarColeta, gerarPacoteEvidencias } from './actions'
import { criarTokenStatusPublico, revogarTokenStatusPublico } from './status-publico/actions'
import { DownloadPdfButton } from '@/components/nr01/DownloadPdfButton'
import { CopyLinkButton } from '@/components/nr01/CopyLinkButton'
import type { Nr01PublicStatusToken } from '@/types/nr01'
import {
  formatTechnicalLeadLine,
  resolveTechnicalLeadForLaudo,
} from '@/lib/nr01/technical-lead'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    welcome?: string
    rt?: string
    sent?: string
    failed?: string
    skipped?: string
    hint?: string
  }>
}

export const dynamic = 'force-dynamic'

type AssessFull = Nr01Assessment & {
  companies: {
    id: string
    name: string
    total_collaborators: number
    technical_lead_name: string | null
    technical_lead_crp: string | null
    technical_lead_profession: string | null
    technical_lead_email: string | null
  } | null
}

export default async function Nr01AssessmentDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const showWelcome = sp.welcome === '1' && sp.rt === '1'
  const invitesSent = sp.sent ? parseInt(sp.sent, 10) : null
  const invitesFailed = sp.failed ? parseInt(sp.failed, 10) : null
  const showTeamHint = sp.hint === 'adicione_equipe'

  const { db, assessment: assess } = await loadNr01AssessmentForPage(
    id,
    `
      *,
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )
    `,
  )
  const a = assess as unknown as AssessFull
  const technicalLead = resolveTechnicalLeadForLaudo({
    assessment: a,
    company: a.companies,
  })
  const rtFrozen = Boolean(a.technical_lead_name?.trim() && a.status === 'CONCLUIDO')

  const [{ data: result }, { data: scores }, respCountResult, { data: pack }, { data: pubTokensData }] = await Promise.all([
    db.from('nr01_assessment_results').select('*').eq('assessment_id', id).maybeSingle(),
    db.from('nr01_dimension_scores').select('*').eq('assessment_id', id).order('dimension_code'),
    db.from('nr01_responses').select('id', { count: 'exact', head: true }).eq('assessment_id', id),
    db.from('nr01_evidence_pack').select('id, signed_at, pack_sha256, generated_at').eq('assessment_id', id).maybeSingle(),
    db.from('nr01_public_status_tokens').select('*').eq('assessment_id', id).order('created_at', { ascending: false }),
  ])

  const r = result as Nr01AssessmentResult | null
  const ds = (scores ?? []) as Nr01DimensionScore[]
  // count com { head: true } vem como propriedade irmã de data, não dentro dela.
  const totalResponses = respCountResult.count ?? 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quantun5g.app'
  const collectionFullUrl = `${appUrl}/nr01/coleta/${a.collection_token}`
  const publicTokens = (pubTokensData ?? []) as Nr01PublicStatusToken[]
  const activeToken = publicTokens.find((t) => t.revoked_at == null) ?? null
  const publicStatusUrl = activeToken ? `${appUrl}/nr01/status/${activeToken.token}` : null

  const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
  const oneDecFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const twoDecFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-8">
      {showWelcome && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <strong>Coleta NR-01 ativa.</strong>{' '}
          {invitesSent != null && invitesSent > 0 ? (
            <>
              Enviamos {invitesSent} convite{invitesSent === 1 ? '' : 's'} por e-mail para sua equipe.
              {invitesFailed != null && invitesFailed > 0 && (
                <> {invitesFailed} falhou{invitesFailed === 1 ? '' : 'ram'} — reenvie em Disparos.</>
              )}
            </>
          ) : showTeamHint ? (
            <>
              Cadastre colaboradores em{' '}
              <Link href={`/empresas/${a.companies?.id}/equipe?retorno=/nr01/avaliacao/${id}`} className="font-semibold underline">
                Equipe
              </Link>{' '}
              ou compartilhe o link abaixo.
            </>
          ) : (
            <> Compartilhe o link de coleta com sua equipe ou use Disparos para enviar por e-mail.</>
          )}
        </section>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">{a.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Status{' '}
            <span className={`rounded-full px-2 py-0.5 text-xs ${ASSESSMENT_STATUS_COLOR[a.status]}`}>
              {ASSESSMENT_STATUS_LABEL[a.status]}
            </span>{' '}·
            Modalidade <code className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5">{a.modality}</code> ·
            Instrumento <code className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5">{a.instrument_version}</code>
          </p>
        </div>
        <Link href="/nr01/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Responsável técnico assinante</div>
        <p className="mt-1 text-sm font-medium text-zinc-900">
          {formatTechnicalLeadLine(technicalLead)}
        </p>
        {technicalLead.email && (
          <p className="mt-0.5 text-xs text-zinc-500">{technicalLead.email}</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          {rtFrozen
            ? 'Snapshot congelado no laudo após processar os resultados.'
            : 'Vinculado ao cadastro da empresa; será congelado ao processar os resultados.'}
          {a.companies?.id && (
            <>
              {' '}
              <Link
                href={`/empresas/${a.companies.id}?retorno=/nr01/avaliacao/${id}`}
                className="text-blue-800 hover:underline"
              >
                Editar na empresa
              </Link>
            </>
          )}
        </p>
      </section>

      {/* Bloco de status + ações */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Adesão</div>
          <div className="mt-1 text-3xl font-semibold text-zinc-900">
            {totalResponses}
            <span className="ml-1 text-sm font-normal text-zinc-500">/ {a.expected_respondents || '?'}</span>
          </div>
          {a.expected_respondents > 0 && (
            <div className="mt-1 text-xs text-zinc-500">
              {pctFmt.format((totalResponses / a.expected_respondents) * 100)}% dos esperados
            </div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">ISO global</div>
          <div className="mt-1 text-3xl font-semibold text-zinc-900">
            {r?.iso_score != null ? oneDecFmt.format(r.iso_score) : '—'}
          </div>
          {r?.iso_risk_level && (
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLOR[r.iso_risk_level]}`}>
              {RISK_LEVEL_LABEL[r.iso_risk_level]}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Pacote de evidências</div>
          <div className="mt-1 text-sm text-zinc-700">
            {pack ? (
              <>
                Gerado em {new Date((pack as { generated_at: string }).generated_at).toLocaleDateString('pt-BR')}
                <div className="mt-1 break-all font-mono text-[10px] text-zinc-400">
                  {(pack as { pack_sha256: string }).pack_sha256.slice(0, 32)}…
                </div>
              </>
            ) : (
              <span className="text-zinc-400">Não gerado</span>
            )}
          </div>
        </div>
      </section>

      {/* Link de coleta */}
      {(a.status === 'CRIADO' || a.status === 'COLETANDO') && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 text-sm text-amber-900">
              <strong>Link público de coleta</strong>
              {a.status === 'COLETANDO' ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-100/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <code className="min-w-0 flex-1 break-all text-[11px] text-amber-900">
                      {collectionFullUrl}
                    </code>
                    <div className="flex shrink-0 items-center gap-2">
                      <CopyLinkButton url={collectionFullUrl} />
                      <a
                        href={collectionFullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-50"
                      >
                        Abrir
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-800">
                  O link completo ficará disponível para copiar assim que você abrir a coleta.
                </p>
              )}
              <div className="mt-2 text-xs text-amber-800">
                Anônimo. Compartilhe com os trabalhadores via e-mail, QR code ou WhatsApp.
              </div>
              {a.status === 'COLETANDO' && (
                <Link
                  href={`/nr01/avaliacao/${id}/disparos`}
                  className="mt-2 inline-block text-xs font-semibold text-blue-900 hover:underline"
                >
                  Disparar lista de transmissão por e-mail →
                </Link>
              )}
            </div>
            {a.status === 'CRIADO' && (
              <form action={abrirColeta}>
                <input type="hidden" name="assessment_id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-800 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  Abrir coleta
                </button>
              </form>
            )}
            {a.status === 'COLETANDO' && (
              <form action={encerrarColeta}>
                <input type="hidden" name="assessment_id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Encerrar coleta
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Ações de processamento */}
      {a.status === 'COLETA_ENCERRADA' && (
        <section className="flex gap-3">
          <form action={processarResultados}>
            <input type="hidden" name="assessment_id" value={a.id} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Processar resultados
            </button>
          </form>
        </section>
      )}

      {a.status === 'CONCLUIDO' && (
        <section className="flex flex-wrap gap-3">
          {!pack && (
            <form action={gerarPacoteEvidencias}>
              <input type="hidden" name="assessment_id" value={a.id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Gerar pacote de evidências
              </button>
            </form>
          )}
          {a.linked_diagnostic_id && (
            <Link
              href={`/nr01/avaliacao/${a.id}/hibrido`}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
            >
              Devolutiva híbrida →
            </Link>
          )}
          <Link
            href={`/nr01/avaliacao/${a.id}/plano`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Plano de Ação (PDCA) →
          </Link>
          <Link
            href={`/nr01/avaliacao/${a.id}/economico`}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Dashboard econômico →
          </Link>
          <Link
            href={`/nr01/avaliacao/${a.id}/monitoramento`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Monitoramento contínuo →
          </Link>
          <DownloadPdfButton
            assessmentId={a.id}
            className="rounded-lg border-2 border-zinc-900 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"
          />
          <Link
            href={`/nr01/avaliacao/${a.id}/laudo-print`}
            target="_blank"
            className="text-sm text-zinc-500 underline hover:text-zinc-900"
          >
            Visualizar antes de baixar
          </Link>
        </section>
      )}

      {/* Tabela dimensões */}
      {ds.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Resultado por dimensão NR-01
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Dimensão</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Média Likert</th>
                  <th className="px-4 py-3">N</th>
                  <th className="px-4 py-3">Risco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ds.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{NR01_DIMENSION_LABEL[d.dimension_code]}</td>
                    <td className="px-4 py-3 font-mono text-zinc-900">
                      {d.score_pct != null ? oneDecFmt.format(d.score_pct) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-700">
                      {d.mean_likert != null ? twoDecFmt.format(d.mean_likert) : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{d.n_respondents}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLOR[d.risk_level]}`}>
                        {RISK_LEVEL_LABEL[d.risk_level]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Link público para o cliente */}
      {a.status === 'CONCLUIDO' && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Link público para o cliente
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Tela de semáforo (5 itens) acessível pelo RH/liderança sem login.
            Anti-fantoche: cliente vê o que está vivo e o que expirou.
          </p>

          {activeToken && publicStatusUrl ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <code className="break-all text-[11px] text-zinc-700">
                    {publicStatusUrl}
                  </code>
                  <CopyLinkButton url={publicStatusUrl} />
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Criado em {new Date(activeToken.created_at).toLocaleDateString('pt-BR')} ·{' '}
                  Visualizado <strong>{activeToken.accessed_count}</strong> vez(es)
                  {activeToken.last_accessed_at && (
                    <> · último acesso {new Date(activeToken.last_accessed_at).toLocaleString('pt-BR')}</>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={revogarTokenStatusPublico}>
                  <input type="hidden" name="assessment_id" value={a.id} />
                  <input type="hidden" name="token_id" value={activeToken.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-red-400 hover:text-red-700"
                  >
                    Revogar
                  </button>
                </form>
                <form action={criarTokenStatusPublico}>
                  <input type="hidden" name="assessment_id" value={a.id} />
                  <input type="hidden" name="revoke_others" value="true" />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                  >
                    Revogar e gerar novo
                  </button>
                </form>
                <Link
                  href={`/nr01/status/${activeToken.token}`}
                  target="_blank"
                  className="text-xs text-zinc-500 underline hover:text-zinc-900"
                >
                  Abrir como cliente (nova aba)
                </Link>
              </div>
            </div>
          ) : (
            <form action={criarTokenStatusPublico} className="mt-3">
              <input type="hidden" name="assessment_id" value={a.id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Gerar link público para o cliente
              </button>
            </form>
          )}
        </section>
      )}

    </div>
  )
}
