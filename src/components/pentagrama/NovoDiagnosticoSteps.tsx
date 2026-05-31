/**
 * Indicador de passos — novo diagnóstico Pentagrama.
 */

interface Props {
  step: 1 | 2
  companyName?: string
}

export function NovoDiagnosticoSteps({ step, companyName }: Props) {
  return (
    <nav aria-label="Progresso" className="rounded-xl border border-zinc-200 bg-white p-4">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <li className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step >= 1 ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            1
          </span>
          <span className={step === 1 ? 'text-sm font-semibold text-zinc-900' : 'text-sm text-zinc-500'}>
            Escolher empresa
          </span>
        </li>
        <li className="hidden text-zinc-300 sm:block">→</li>
        <li className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step >= 2 ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            2
          </span>
          <span className={step === 2 ? 'text-sm font-semibold text-zinc-900' : 'text-sm text-zinc-500'}>
            Dados do diagnóstico
            {companyName && step === 2 && (
              <span className="mt-0.5 block text-xs font-normal text-zinc-500">{companyName}</span>
            )}
          </span>
        </li>
      </ol>
    </nav>
  )
}
