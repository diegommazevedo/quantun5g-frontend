/**
 * QUANTUM5G — NivelBadge
 * Badge colorido para exibição do nível de uma dimensão.
 */

import type { DimensaoNivel } from '@/types/database'

const CONFIG: Record<string, { label: string; className: string }> = {
  critico:    { label: 'Crítico',     className: 'bg-red-100   text-red-700   border-red-200'   },
  vulneravel: { label: 'Vulnerável',  className: 'bg-amber-100 text-amber-700 border-amber-200' },
  saudavel:   { label: 'Saudável',    className: 'bg-green-100 text-green-700 border-green-200' },
  excelente:  { label: 'Excelente',   className: 'bg-blue-100  text-blue-700  border-blue-200'  },
  sem_dados:  { label: 'Sem dados',   className: 'bg-zinc-100  text-zinc-500  border-zinc-200'  },
}

interface Props {
  nivel: DimensaoNivel | 'sem_dados' | null | undefined
  size?: 'sm' | 'md'
}

export function NivelBadge({ nivel, size = 'md' }: Props) {
  const key   = nivel ?? 'sem_dados'
  const cfg   = CONFIG[key] ?? CONFIG['sem_dados']
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm font-medium'

  return (
    <span className={`inline-flex items-center rounded-full border ${cfg.className} ${sizeClass}`}>
      {cfg.label}
    </span>
  )
}
