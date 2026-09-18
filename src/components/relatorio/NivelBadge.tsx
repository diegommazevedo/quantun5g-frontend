/**
 * QUANTUM5G — NivelBadge
 * Badge colorido para exibição do nível de uma dimensão.
 * Cores explícitas (hex) para não perder contraste no tema escuro.
 */

import type { DimensaoNivel } from '@/types/database'

const CONFIG: Record<string, { label: string; className: string }> = {
  critico: {
    label: 'Crítico',
    className: 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
  },
  vulneravel: {
    label: 'Vulnerável',
    className: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
  },
  saudavel: {
    label: 'Saudável',
    className: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
  },
  excelente: {
    label: 'Excelente',
    className: 'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]',
  },
  sem_dados: {
    label: 'Sem dados',
    className: 'bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]',
  },
}

interface Props {
  nivel: DimensaoNivel | 'sem_dados' | null | undefined
  size?: 'sm' | 'md'
}

export function NivelBadge({ nivel, size = 'md' }: Props) {
  const key = nivel ?? 'sem_dados'
  const cfg = CONFIG[key] ?? CONFIG['sem_dados']
  const sizeClass =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm font-medium'

  return (
    <span className={`inline-flex items-center rounded-full border ${cfg.className} ${sizeClass}`}>
      {cfg.label}
    </span>
  )
}
