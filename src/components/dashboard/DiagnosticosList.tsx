'use client'

/**
 * QUANTUM5G — DiagnosticosList
 * Tabela de diagnósticos do consultor com filtro por status.
 * Client component — filtro interativo sem reload.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { staffLinkProps } from '@/lib/navigation/link-props'

// ─── Tipos ──────────────────────────────────────────────────────

export interface DiagRow {
  id:           string
  name:         string
  status:       string
  created_at:   string
  leader_name:  string | null
  company_name: string | null
  ic_count:     number
}

// ─── Constantes ─────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  CRIADO:           'Criado',
  AGUARDANDO_IL:    'Aguardando IL',
  COLETANDO_IC:     'Coletando IC',
  ENCERRADO:        'Encerrado',
  RELATORIO_GERADO: 'Relatório gerado',
  ARQUIVADO:        'Arquivado',
}

const STATUS_COLOR: Record<string, string> = {
  CRIADO:           'bg-zinc-100   text-zinc-600   border-zinc-200',
  AGUARDANDO_IL:    'bg-amber-100  text-amber-700  border-amber-200',
  COLETANDO_IC:     'bg-blue-100   text-blue-700   border-blue-200',
  ENCERRADO:        'bg-green-100  text-green-700  border-green-200',
  RELATORIO_GERADO: 'bg-purple-100 text-purple-700 border-purple-200',
  ARQUIVADO:        'bg-zinc-100   text-zinc-400   border-zinc-200',
}

type FilterKey = 'todos' | 'andamento' | 'relatorio' | 'arquivado'

const FILTROS: { key: FilterKey; label: string; statuses: string[] | null }[] = [
  { key: 'todos',    label: 'Todos',             statuses: null },
  { key: 'andamento',label: 'Em andamento',       statuses: ['AGUARDANDO_IL', 'COLETANDO_IC', 'CRIADO'] },
  { key: 'relatorio',label: 'Relatório gerado',   statuses: ['RELATORIO_GERADO', 'ENCERRADO'] },
  { key: 'arquivado',label: 'Arquivado',           statuses: ['ARQUIVADO'] },
]

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// ─── Component ──────────────────────────────────────────────────

interface Props {
  diagnosticos: DiagRow[]
}

export function DiagnosticosList({ diagnosticos }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<FilterKey>('todos')

  const filtered = diagnosticos.filter(d => {
    const f = FILTROS.find(f => f.key === filtro)
    if (!f || !f.statuses) return true
    return f.statuses.includes(d.status)
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f.label}
            {f.statuses === null && (
              <span className="ml-1.5 rounded-full bg-zinc-700 text-white text-xs px-1.5 py-0.5">
                {diagnosticos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="text-zinc-400 text-sm">Nenhum diagnóstico nesta categoria.</p>
          <Link
            href="/diagnostico/novo"
            {...staffLinkProps}
            className="mt-3 inline-block text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
          >
            Criar novo diagnóstico →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Diagnóstico</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">IC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Criado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {filtered.map(d => (
                <tr
                  key={d.id}
                  className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                  onClick={() => { router.push(`/diagnostico/${d.id}`) }}
                >
                  {/* Empresa */}
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-zinc-900">{d.company_name ?? '—'}</span>
                  </td>

                  {/* Nome diagnóstico + líder */}
                  <td className="px-4 py-3.5">
                    <p className="text-zinc-800">{d.name}</p>
                    {d.leader_name && (
                      <p className="text-xs text-zinc-400 mt-0.5">Líder: {d.leader_name}</p>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[d.status] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>

                  {/* N IC */}
                  <td className="px-4 py-3.5 text-center tabular-nums">
                    <span className={`font-semibold ${d.ic_count === 0 ? 'text-zinc-300' : d.ic_count < 3 ? 'text-amber-600' : 'text-zinc-800'}`}>
                      {d.ic_count}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-4 py-3.5 text-zinc-500 whitespace-nowrap">
                    {formatDate(d.created_at)}
                  </td>

                  {/* Ação — para o clique não propagar duas vezes */}
                  <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                    {(d.status === 'RELATORIO_GERADO' || d.status === 'ENCERRADO') ? (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/relatorio/${d.id}`}
                          {...staffLinkProps}
                          className="rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-800 transition-colors whitespace-nowrap"
                        >
                          Ver relatório
                        </Link>
                        <Link
                          href={`/diagnostico/${d.id}`}
                          {...staffLinkProps}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                          Painel
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/diagnostico/${d.id}`}
                        {...staffLinkProps}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                      >
                        Ver →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
