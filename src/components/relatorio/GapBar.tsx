/**
 * QUANTUM5G — GapBar
 * Barra visual do gap IL − IC por dimensão.
 * Positivo = líder percebe melhor; Negativo = líder subestima.
 */

interface Props {
  gap: number | null
}

function classify(gap: number | null) {
  if (gap === null) return { label: '—',                   barColor: 'bg-zinc-300', textColor: 'text-zinc-400' }
  const abs = Math.abs(gap)
  if (abs <  10) return { label: 'Alinhado',              barColor: 'bg-green-400', textColor: 'text-green-700' }
  if (abs <  20) return { label: 'Divergência Moderada',  barColor: 'bg-amber-400', textColor: 'text-amber-700' }
  if (abs <  30) return { label: 'Divergência Significativa', barColor: 'bg-orange-400', textColor: 'text-orange-700' }
  return           { label: 'Bolha de Percepção',         barColor: 'bg-red-400',   textColor: 'text-red-700'   }
}

export function GapBar({ gap }: Props) {
  const { label, barColor, textColor } = classify(gap)
  if (gap === null) return <span className="text-zinc-400 text-sm">—</span>

  // Normaliza para ±50pp → 100% de largura de cada lado
  const width = Math.min(Math.abs(gap) / 50, 1) * 100
  const isPositive = gap >= 0

  return (
    <div className="flex items-center gap-3">
      {/* Barra */}
      <div className="relative flex h-4 w-40 items-center">
        {/* Centro */}
        <div className="absolute inset-x-0 flex justify-center">
          <div className="w-px h-4 bg-zinc-300" />
        </div>
        {/* Bar fill */}
        {isPositive ? (
          <div
            className={`absolute left-1/2 h-3 rounded-r ${barColor} opacity-80`}
            style={{ width: `${width / 2}%` }}
          />
        ) : (
          <div
            className={`absolute right-1/2 h-3 rounded-l ${barColor} opacity-80`}
            style={{ width: `${width / 2}%` }}
          />
        )}
      </div>
      {/* Valor + classificação */}
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
          {isPositive ? '+' : ''}{gap.toFixed(1)}pp
        </span>
        <span className={`text-xs ${textColor}`}>
          {label}
        </span>
      </div>
    </div>
  )
}
