'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ASSESSMENT_STATUS_COLOR,
  ASSESSMENT_STATUS_LABEL,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
  type Nr01AssessmentStatus,
  type Nr01RiskLevel,
} from '@/types/nr01'

export interface Nr01DashboardRow {
  id: string
  name: string
  status: Nr01AssessmentStatus
  reference_period: string | null
  competencia_label: string | null
  created_at: string
  company_name: string | null
  linked_diagnostic_id: string | null
  iso_score: number | null
  iso_risk_level: Nr01RiskLevel
  adherence_pct: number | null
}

type FilterKey = 'todos' | 'andamento' | 'concluido' | 'arquivado'

const FILTROS: { key: FilterKey; label: string; statuses: Nr01AssessmentStatus[] | null }[] = [
  { key: 'todos', label: 'Todos', statuses: null },
  {
    key: 'andamento',
    label: 'Em andamento',
    statuses: ['CRIADO', 'COLETANDO', 'COLETA_ENCERRADA', 'PROCESSANDO'],
  },
  { key: 'concluido', label: 'Concluídas', statuses: ['CONCLUIDO'] },
  { key: 'arquivado', label: 'Arquivadas', statuses: ['ARQUIVADO'] },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const oneDecFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

interface Props {
  rows: Nr01DashboardRow[]
}

export function Nr01AssessmentsList({ rows }: Props) {
  const [filtro, setFiltro] = useState<FilterKey>('todos')

  const filtered = rows.filter((r) => {
    const f = FILTROS.find((x) => x.key === filtro)
    if (!f?.statuses) return true
    return f.statuses.includes(r.status)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f.label}
            {f.statuses === null && (
              <span className="ml-1.5 rounded-full bg-zinc-700 px-1.5 py-0.5 text-xs text-white">
                {rows.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="text-sm text-zinc-500">Nenhuma avaliação nesta categoria.</p>
          <Link
            href="/nr01/avaliacao/nova"
            className="mt-3 inline-block text-sm text-blue-800 underline underline-offset-2 hover:text-blue-900"
          >
            Criar nova avaliação →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Avaliação</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 sm:table-cell">Adesão</th>
                <th className="hidden px-4 py-3 md:table-cell">ISO</th>
                <th className="hidden px-4 py-3 lg:table-cell">Risco</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                  onClick={() => {
                    window.location.href = `/nr01/avaliacao/${r.id}`
                  }}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-zinc-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {r.competencia_label ?? r.reference_period ?? formatDate(r.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-700">{r.company_name ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ASSESSMENT_STATUS_COLOR[r.status]}`}
                    >
                      {ASSESSMENT_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3.5 tabular-nums text-zinc-700 sm:table-cell">
                    {r.adherence_pct != null ? `${pctFmt.format(r.adherence_pct)}%` : '—'}
                  </td>
                  <td className="hidden px-4 py-3.5 font-mono text-zinc-900 md:table-cell">
                    {r.iso_score != null ? oneDecFmt.format(r.iso_score) : '—'}
                  </td>
                  <td className="hidden px-4 py-3.5 lg:table-cell">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLOR[r.iso_risk_level]}`}
                    >
                      {RISK_LEVEL_LABEL[r.iso_risk_level]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/nr01/avaliacao/${r.id}`}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      Abrir →
                    </Link>
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
