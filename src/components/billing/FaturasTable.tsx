'use client'

import { useState, useTransition } from 'react'
import { formatBrl, formatBillingLabel, parseTierPlanId } from '@/lib/billing/nr01-catalog'
import { formatInvoiceProductPt, formatInvoiceStatusPt } from '@/lib/billing/commercial-invoice'
import { getPentagramaPlan } from '@/lib/billing/pentagrama-catalog'
import type { CommercialInvoice, CommercialInvoiceStatus } from '@/types/database'

interface Props {
  invoices: CommercialInvoice[]
  adminMode?: boolean
}

const STATUS_CLASS: Record<CommercialInvoiceStatus, string> = {
  emitida: 'bg-amber-50 text-amber-800 border-amber-200',
  aprovada: 'bg-blue-50 text-blue-800 border-blue-200',
  paga: 'bg-green-50 text-green-800 border-green-200',
  cancelada: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

export function FaturasTable({ invoices, adminMode }: Props) {
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

  if (invoices.length === 0) {
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
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              {adminMode && <th className="px-4 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoices.map((inv) => {
              const tier = parseTierPlanId(inv.plan_id)
              const pentPlan = getPentagramaPlan(inv.plan_id)
              const meta = inv.metadata as Record<string, unknown>
              const productLabel = formatInvoiceProductPt(
                inv.product_id,
                inv.include_pentagrama,
                meta,
              )
              return (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{productLabel}</span>
                    <span className="block text-xs text-zinc-500">
                      {pentPlan?.name ?? tier?.toUpperCase() ?? inv.plan_id}
                      {inv.product_id === 'nr01' && ` · ${formatBillingLabel(inv.billing_mode)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBrl(inv.amount_cents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status]}`}
                    >
                      {formatInvoiceStatusPt(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {adminMode && (
                    <td className="px-4 py-3 text-right">
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
          nova avaliação NR-01.
        </p>
      )}
    </div>
  )
}
