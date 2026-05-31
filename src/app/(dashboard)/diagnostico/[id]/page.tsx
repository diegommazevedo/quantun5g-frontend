/**
 * QUANTUM5G — TELA-04: Detalhe do Diagnóstico
 * Exibe status, links de token para IL e IC, e botão de encerrar coleta.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Diagnostic, Company } from '@/types/database'
import { EncerrarColetaButton } from './EncerrarColetaButton'
import { formatIlLeaderLine } from '@/lib/pentagrama/il-leader'

const STATUS_LABEL: Record<string, string> = {
  CRIADO:           'Criado',
  AGUARDANDO_IL:    'Aguardando IL',
  COLETANDO_IC:     'Coletando IC',
  ENCERRADO:        'Encerrado',
  RELATORIO_GERADO: 'Relatório gerado',
  ARQUIVADO:        'Arquivado',
}

const STATUS_COLOR: Record<string, string> = {
  CRIADO:           'bg-zinc-100 text-zinc-600',
  AGUARDANDO_IL:    'bg-amber-100 text-amber-700',
  COLETANDO_IC:     'bg-blue-100 text-blue-700',
  ENCERRADO:        'bg-green-100 text-green-700',
  RELATORIO_GERADO: 'bg-purple-100 text-purple-700',
  ARQUIVADO:        'bg-zinc-100 text-zinc-400',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiagnosticoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: diag } = await supabase
    .from('diagnostics')
    .select('*, companies(id, name, total_collaborators, il_leader_name, il_leader_email)')
    .eq('id', id)
    .single() as {
    data: (Diagnostic & {
      companies: Pick<Company, 'id' | 'name' | 'total_collaborators' | 'il_leader_name' | 'il_leader_email'>
    }) | null
  }

  if (!diag) notFound()

  // Conta IC responses
  const { count: nIC } = await supabase
    .from('ic_responses')
    .select('*', { count: 'exact', head: true })
    .eq('diagnostic_id', id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const linkIL  = `${baseUrl}/il/${diag.il_token}`
  const linkIC  = `${baseUrl}/ic/${diag.ic_token}`

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900">{diag.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[diag.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {STATUS_LABEL[diag.status] ?? diag.status}
            </span>
          </div>
          <p className="text-zinc-500 text-sm">
            {(diag.companies as { name: string })?.name ?? '—'}
          </p>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Voltar
        </a>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Profissional IL (liderança)</div>
        <p className="mt-1 text-sm font-medium text-zinc-900">
          {diag.leader_name
            ? `${diag.leader_name}${diag.leader_email ? ` · ${diag.leader_email}` : ''}`
            : '—'}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Vinculado ao cadastro da empresa no momento da criação.
          {diag.companies?.id && (
            <>
              {' '}
              <a
                href={`/empresas/${diag.companies.id}?retorno=/diagnostico/${id}`}
                className="text-zinc-900 hover:underline"
              >
                Editar na empresa
              </a>
              {' '}
              (cadastro atual: {formatIlLeaderLine(diag.companies)})
            </>
          )}
        </p>
      </section>

      {/* Informações */}
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        <div className="px-6 py-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-400">Líder</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{diag.leader_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">E-mail do líder</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{diag.leader_email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Total colaboradores</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">
              {(diag.companies as { total_collaborators: number })?.total_collaborators ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Competência</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{diag.competencia_label ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Início da pesquisa</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{diag.il_deadline ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Encerramento</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{diag.ic_deadline ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Respostas IC recebidas</p>
            <p className="text-sm font-bold text-zinc-900 mt-0.5">{nIC ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Links de token */}
      <div className="space-y-4">
        {/* IL */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-900">Instrumento de Liderança (IL)</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Envie este link para o(a) líder. Resposta única — 125 questões.
              </p>
              {(diag.status === 'AGUARDANDO_IL' || diag.status === 'COLETANDO_IC') && (
                <Link
                  href={`/diagnostico/${id}/disparos`}
                  className="mt-2 inline-block text-xs font-medium text-purple-800 hover:underline"
                >
                  Disparar convites por e-mail →
                </Link>
              )}
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${diag.il_submitted_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {diag.il_submitted_at ? '✓ Respondido' : 'Pendente'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={linkIL}
              className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-600 font-mono focus:outline-none"
            />
            <a
              href={linkIL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              Abrir
            </a>
          </div>
        </div>

        {/* IC */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-zinc-900">Instrumento de Colaboradores (IC)</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Compartilhe este link com os colaboradores. Respostas anônimas.
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${diag.status === 'COLETANDO_IC' ? 'bg-blue-100 text-blue-700' : diag.status === 'ENCERRADO' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {diag.status === 'COLETANDO_IC' ? 'Ativo' : diag.status === 'ENCERRADO' ? '✓ Encerrado' : 'Aguardando IL'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={linkIC}
              className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-600 font-mono focus:outline-none"
            />
            <a
              href={linkIC}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap"
            >
              Abrir
            </a>
          </div>

          {/* Botão encerrar coleta IC — modal de confirmação */}
          {diag.status === 'COLETANDO_IC' && (
            <EncerrarColetaButton
              diagnosticId={id}
              nIC={nIC ?? 0}
            />
          )}
        </div>
      </div>

      {/* Relatório */}
      {(diag.status === 'RELATORIO_GERADO' || diag.status === 'ENCERRADO') && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-purple-900">Relatório disponível</h2>
            <p className="text-sm text-purple-700 mt-0.5">O diagnóstico foi calculado e o relatório está pronto.</p>
          </div>
          <a
            href={`/relatorio/${id}`}
            className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 transition-colors whitespace-nowrap"
          >
            Ver relatório
          </a>
        </div>
      )}
    </div>
  )
}
