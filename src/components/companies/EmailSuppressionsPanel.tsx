'use client'

import type { EmailSuppressionRow } from '@/lib/email/suppression'
import { suppressionReasonLabel } from '@/lib/email/suppression'
import { reativarEmailSuprimido } from '@/app/(dashboard)/empresas/[id]/equipe/actions'

interface Props {
  companyId: string
  suppressions: EmailSuppressionRow[]
}

export function EmailSuppressionsPanel({ companyId, suppressions }: Props) {
  if (suppressions.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">E-mails suprimidos</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Nenhum endereço bloqueado por bounce ou spam nesta equipe.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-amber-950">E-mails suprimidos ({suppressions.length})</h2>
        <p className="mt-1 text-xs text-amber-900/90">
          Endereços bloqueados automaticamente após bounce permanente ou denúncia de spam.
          Não recebem novos disparos até reativação manual.
        </p>
      </div>

      <ul className="space-y-3">
        {suppressions.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-3 rounded-lg border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium text-zinc-900">{s.email_normalized}</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {suppressionReasonLabel(s.reason)}
                {' · '}
                {new Date(s.created_at).toLocaleString('pt-BR')}
              </p>
              {s.notes && (
                <p className="mt-1 text-xs text-zinc-500 truncate" title={s.notes}>
                  {s.notes}
                </p>
              )}
            </div>
            <form action={reativarEmailSuprimido} className="shrink-0">
              <input type="hidden" name="company_id" value={companyId} />
              <input type="hidden" name="email" value={s.email_normalized} />
              <button
                type="submit"
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-50"
                title="Remove da lista global e reativa o contato nesta empresa"
              >
                Reativar envio
              </button>
            </form>
          </li>
        ))}
      </ul>

      <p className="text-xs text-amber-800/80">
        Ao reativar, confirme que o endereço está correto. Reenvios indevidos prejudicam a reputação do domínio.
      </p>
    </section>
  )
}
