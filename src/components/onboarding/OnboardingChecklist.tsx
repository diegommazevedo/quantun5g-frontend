import Link from 'next/link'

export interface OnboardingStep {
  id: string
  label: string
  description: string
  href: string
  done: boolean
}

interface Props {
  steps: OnboardingStep[]
}

export function OnboardingChecklist({ steps }: Props) {
  const allDone = steps.every((s) => s.done)
  if (allDone) return null

  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Primeiros passos</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {doneCount} de {steps.length} concluídos
          </p>
        </div>
        <span className="text-xl font-bold text-blue-700">{pct}%</span>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const isPrevDone = steps.slice(0, idx).every((s) => s.done)
          const isCurrent = !step.done && isPrevDone

          return (
            <li key={step.id} className="flex items-start gap-3">
              <div
                className={[
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
                  step.done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isCurrent
                      ? 'border-blue-600 bg-white text-blue-600'
                      : 'border-zinc-200 bg-white text-zinc-300',
                ].join(' ')}
              >
                {step.done ? '✓' : idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={[
                      'text-sm font-medium',
                      step.done
                        ? 'text-zinc-400 line-through'
                        : isCurrent
                          ? 'text-zinc-900'
                          : 'text-zinc-400',
                    ].join(' ')}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <Link
                      href={step.href}
                      className="rounded bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                    >
                      Ir agora →
                    </Link>
                  )}
                </div>
                {isCurrent && (
                  <p className="mt-0.5 text-xs text-zinc-500">{step.description}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
