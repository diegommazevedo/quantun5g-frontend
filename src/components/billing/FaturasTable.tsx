'use client'

import { useState, useTransition } from 'react'
import {
  formatBrl,
  formatInvoiceNotesPreview,
  invoiceContractLines,
  type CommercialInvoiceListRow,
} from '@/lib/billing/commercial-invoice-display'
import { formatInvoiceStatusPt } from '@/lib/billing/commercial-invoice'
import type { CommercialInvoiceStatus } from '@/types/database'

interface Props {
  rows: CommercialInvoiceListRow[]
  adminMode?: boolean
}

const STATUS_CLASS: Record<CommercialInvoiceStatus, string> = {
  emitida: 'bg-amber-50 text-amber-800 border-amber-200',
  aprovada: 'bg-blue-50 text-blue-800 border-blue-200',
  paga: 'bg-green-50 text-green-800 border-green-200',
  cancelada: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export function FaturasTable({ rows, adminMode }: Props) {
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function patchStatus(id: string, status: CommercialInvoiceStatus) {
    setErro(null)
    startTransition(async () => {
      const res = await fetch(`/api/billing/commercial-invoice/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErro(data.error ?? 'Erro')
        return
      }
      window.location.reload()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center text-sm text-zinc-600">
        Nenhuma fatura ainda.{' '}
        <a href="/contratacao" className="font-medium text-blue-800 hover:underline">
          Emitir fatura
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Contrato</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              {adminMode && <th className="px-4 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const inv = row.invoice
              const contract = invoiceContractLines(inv)
              const notesPreview = formatInvoiceNotesPreview(inv.notes)
              return (
                <tr key={inv.id} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {inv.invoice_number}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <span className="font-medium text-zinc-900">
                      {row.clientName ?? '—'}
                    </span>
                    {row.clientEmail && (
                      <span className="mt-0.5 block text-xs text-zinc-600 break-all">
                        {row.clientEmail}
                      </span>
                    )}
                    {row.clientCnpj && (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        CNPJ {row.clientCnpj}
                      </span>
                    )}
                    {row.clientWhatsapp && (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        WhatsApp {row.clientWhatsapp}
                      </span>
                    )}
                    {adminMode && row.consultantName && (
                      <span className="mt-1 block text-xs text-zinc-400">
                        Consultor: {row.consultantName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <span className="font-medium text-zinc-900">{contract.productLabel}</span>
                    {contract.planDetail && (
                      <span className="mt-0.5 block text-xs text-zinc-600">
                        {contract.planDetail}
                      </span>
                    )}
                    {contract.scopeDetail && (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {contract.scopeDetail}
                      </span>
                    )}
                    {row.companyName && row.companyName !== row.clientName && (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        Empresa: {row.companyName}
                      </span>
                    )}
                    {notesPreview && (
                      <span className="mt-1 block text-xs italic text-zinc-400" title={inv.notes ?? ''}>
                        Obs.: {notesPreview}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatBrl(inv.amount_cents)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status]}`}
                    >
                      {formatInvoiceStatusPt(inv.status)}
                    </span>
                    {inv.status === 'paga' && inv.paid_at && (
                      <span className="mt-1 block text-xs text-zinc-400">
                        Paga {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {adminMode && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-1">
                        {inv.status === 'emitida' && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => patchStatus(inv.id, 'aprovada')}
                            className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-800 hover:bg-blue-50"
                          >
                            Aprovar
                          </button>
                        )}
                        {inv.status === 'aprovada' && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => patchStatus(inv.id, 'paga')}
                            className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-800"
                          >
                            Marcar paga
                          </button>
                        )}
                        {inv.status !== 'paga' && inv.status !== 'cancelada' && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => patchStatus(inv.id, 'cancelada')}
                            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!adminMode && (
        <p className="text-xs text-zinc-500">
          Após pagamento presencial, o administrador Quantum5G aprova e marca como paga para liberar
          os módulos contratados.
        </p>
      )}
    </div>
  )
}
