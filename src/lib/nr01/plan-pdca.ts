/**
 * NR-01 — helpers de fase PDCA por item do plano de ação.
 */

import type { Nr01ActionStatus } from '@/types/nr01'

export type Nr01PdcaPhase = 'plan' | 'do' | 'check' | 'act'

export const PDCA_PHASE_LABEL: Record<Nr01PdcaPhase, string> = {
  plan:  'Plan — planejar',
  do:    'Do — executar',
  check: 'Check — verificar',
  act:   'Act — consolidar',
}

export const PDCA_PHASE_COLOR: Record<Nr01PdcaPhase, string> = {
  plan:  'bg-violet-100 text-violet-800',
  do:    'bg-blue-100 text-blue-800',
  check: 'bg-amber-100 text-amber-900',
  act:   'bg-emerald-100 text-emerald-800',
}

export function pdcaPhaseForItemStatus(status: Nr01ActionStatus): Nr01PdcaPhase {
  switch (status) {
    case 'pendente':
      return 'plan'
    case 'em_andamento':
    case 'bloqueado':
      return 'do'
    case 'concluido':
      return 'act'
    case 'cancelado':
      return 'plan'
  }
}
