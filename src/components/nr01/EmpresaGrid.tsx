'use client'

/**
 * Grade de empresas com busca — gestão ou seleção (NR-01 / Pentagrama / unificado).
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { staffLinkProps } from '@/lib/navigation/link-props'

export type EmpresaGridRow = {
  id: string
  name: string
  trade_name: string | null
  cnpj: string | null
  total_collaborators: number
  rh_contact_name: string | null
  rh_contact_email: string | null
  technical_lead_name?: string | null
  technical_lead_crp?: string | null
  il_leader_name?: string | null
  il_leader_email?: string | null
  il_leaders_count?: number
}

export type EmpresaGridProduct = 'nr01' | 'pentagrama' | 'unified'

function formatCnpj(cnpj: string | null): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—'
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

function hasRt(e: EmpresaGridRow) {
  return Boolean(e.technical_lead_name?.trim() && e.technical_lead_crp?.trim())
}

function hasIl(e: EmpresaGridRow) {
  return (e.il_leaders_count ?? 0) > 0 || Boolean(e.il_leader_name?.trim() && e.il_leader_email?.trim())
}

function hasCnpj(e: EmpresaGridRow) {
  return Boolean(e.cnpj && e.cnpj.length === 14)
}

function isReady(e: EmpresaGridRow, product: EmpresaGridProduct) {
  if (!hasCnpj(e) || !hasRt(e)) return false
  if (product === 'pentagrama') return hasIl(e)
  if (product === 'nr01') return true
  return hasRt(e) && hasIl(e)
}

function matchQuery(row: EmpresaGridRow, q: string): boolean {
  const hay = [
    row.name,
    row.trade_name ?? '',
    row.cnpj ?? '',
    row.rh_contact_name ?? '',
    row.technical_lead_name ?? '',
    row.technical_lead_crp ?? '',
    row.il_leader_name ?? '',
    row.il_leader_email ?? '',
    String(row.total_collaborators),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

interface Props {
  empresas: EmpresaGridRow[]
  mode: 'manage' | 'picker'
  product?: EmpresaGridProduct
  emptyHint?: string
  /** Oculta o CTA "Cadastrar primeira empresa" (contratante/gerente). */
  hideEmptyCadastro?: boolean
  pickerHref?: (id: string) => string
  cadastroHref?: (id: string) => string
  manageHref?: (id: string) => string
  retornoPicker?: string
}

export function EmpresaGrid({
  empresas,
  mode,
  product = 'nr01',
  emptyHint,
  hideEmptyCadastro,
  pickerHref,
  cadastroHref,
  manageHref,
  retornoPicker,
}: Props) {
  const [query, setQuery] = useState('')

  const novaHref =
    retornoPicker != null
      ? `/empresas/nova?retorno=${encodeURIComponent(retornoPicker)}`
      : '/empresas/nova'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return empresas
    return empresas.filter((e) => matchQuery(e, q))
  }, [empresas, query])

  if (empresas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
        <p className="text-sm text-zinc-700">{emptyHint ?? 'Nenhuma empresa cadastrada.'}</p>
        {!hideEmptyCadastro && (
          <Link
            href={novaHref}
            {...staffLinkProps}
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Cadastrar primeira empresa
          </Link>
        )}
      </div>
    )
  }

  const btnPick =
    product === 'nr01' ? 'bg-blue-800 hover:bg-blue-900' : 'bg-zinc-900 hover:bg-zinc-700'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block flex-1">
          <span className="sr-only">Buscar empresa</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, CNPJ, RT, IL ou RH…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm"
          />
        </label>
        <p className="shrink-0 text-xs text-zinc-500">
          {filtered.length} de {empresas.length} empresa{empresas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
          Nenhum resultado para &quot;{query}&quot;.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="hidden px-4 py-3 md:table-cell">RT assinante</th>
                <th className="hidden px-4 py-3 lg:table-cell">Liderança IL</th>
                <th className="px-4 py-3">CNPJ</th>
                <th className="hidden px-4 py-3 sm:table-cell">Colab.</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((e) => {
                const ready = isReady(e, product)
                const editUrl =
                  cadastroHref?.(e.id) ??
                  `/empresas/${e.id}${retornoPicker ? `?retorno=${encodeURIComponent(retornoPicker)}` : ''}`
                const pickUrl =
                  pickerHref?.(e.id) ??
                  (product === 'pentagrama'
                    ? `/diagnostico/novo/${e.id}`
                    : `/nr01/avaliacao/nova/${e.id}`)

                return (
                  <tr key={e.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{e.name}</div>
                      {e.trade_name && <div className="text-xs text-zinc-500">{e.trade_name}</div>}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 md:table-cell">
                      {hasRt(e) ? (
                        <>
                          <div className="text-sm">{e.technical_lead_name}</div>
                          <div className="text-xs text-zinc-400">{e.technical_lead_crp}</div>
                        </>
                      ) : (
                        <span className="text-amber-700">Pendente</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 lg:table-cell">
                      {hasIl(e) ? (
                        <span className="text-sm">
                          {(e.il_leaders_count ?? 1) > 1
                            ? `${e.il_leaders_count} líderes`
                            : e.il_leader_name ?? '1 líder'}
                        </span>
                      ) : (
                        <span className="text-amber-700">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {hasCnpj(e) ? formatCnpj(e.cnpj) : <span className="text-amber-700">Pendente</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell">{e.total_collaborators}</td>
                    <td className="px-4 py-3 text-right">
                      {mode === 'picker' ? (
                        ready ? (
                          <Link
                            href={pickUrl}
                            {...staffLinkProps}
                            className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${btnPick}`}
                          >
                            Usar esta empresa →
                          </Link>
                        ) : (
                          <Link
                            href={editUrl}
                            {...staffLinkProps}
                            className="inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            Completar cadastro
                          </Link>
                        )
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <Link
                            href={manageHref?.(e.id) ?? `/empresas/${e.id}`}
                            {...staffLinkProps}
                            className="text-zinc-900 hover:underline"
                          >
                            Editar
                          </Link>
                          <Link
                            href={`/empresas/${e.id}/equipe`}
                            {...staffLinkProps}
                            className="text-xs text-purple-700 hover:underline"
                          >
                            Equipe / e-mail
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
