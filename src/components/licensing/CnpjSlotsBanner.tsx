import { formatCompanyCnpjSlotsShort } from '@/lib/licensing/company-cnpj-slots'
import type { CompanyCnpjSlotsUsage } from '@/lib/licensing/company-cnpj-slots'

interface Props {
  usage: CompanyCnpjSlotsUsage
  plan?: 'b2c' | 'b2b'
}

export function CnpjSlotsBanner({ usage, plan }: Props) {
  const { limit, used, remaining } = usage
  const atLimit = remaining <= 0
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        atLimit ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-zinc-50'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">
          CNPJs do contrato: {used} de {formatCompanyCnpjSlotsShort(limit)} utilizados
        </p>
        {remaining > 0 ? (
          <span className="text-xs text-zinc-600">{remaining} disponível(is)</span>
        ) : (
          <span className="text-xs font-medium text-amber-800">Limite atingido</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full ${atLimit ? 'bg-amber-500' : 'bg-zinc-700'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit ? (
        <p className="mt-2 text-xs text-amber-900">
          Emita nova fatura com mais CNPJs em{' '}
          <a href="/contratacao?plan=b2b" className="font-medium underline">
            Contratação B2B
          </a>
          .
        </p>
      ) : plan === 'b2c' && limit === 1 ? (
        <p className="mt-2 text-xs text-zinc-600">
          Plano individual (1 CNPJ). Grupos com várias empresas:{' '}
          <a href="/contratacao?plan=b2b" className="font-medium text-zinc-900 underline">
            contratação B2B
          </a>
          .
        </p>
      ) : null}
    </div>
  )
}
