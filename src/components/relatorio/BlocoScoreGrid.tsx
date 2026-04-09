/**
 * QUANTUM5G — BlocoScoreGrid
 * Grade 18 blocos com score IC%. Blocos ≤ 40% destacados em vermelho.
 */

import type { DiagnosticResult } from '@/types/database'

const BLOCOS: { key: keyof DiagnosticResult; label: string; dim: string }[] = [
  { key: 'ic_bloco_fa_pct', label: 'F-A  Q1–8',    dim: 'Física'   },
  { key: 'ic_bloco_fb_pct', label: 'F-B  Q9–16',   dim: 'Física'   },
  { key: 'ic_bloco_fc_pct', label: 'F-C  Q17–25',  dim: 'Física'   },
  { key: 'ic_bloco_a1_pct', label: 'A-1  Q26–30',  dim: 'Afetiva'  },
  { key: 'ic_bloco_a2_pct', label: 'A-2  Q31–35',  dim: 'Afetiva'  },
  { key: 'ic_bloco_a3_pct', label: 'A-3  Q36–40',  dim: 'Afetiva'  },
  { key: 'ic_bloco_a4_pct', label: 'A-4  Q41–45',  dim: 'Afetiva'  },
  { key: 'ic_bloco_a5_pct', label: 'A-5  Q46–50',  dim: 'Afetiva'  },
  { key: 'ic_bloco_r1_pct', label: 'R-1  Q51–55',  dim: 'Racional' },
  { key: 'ic_bloco_r2_pct', label: 'R-2  Q56–60',  dim: 'Racional' },
  { key: 'ic_bloco_r3_pct', label: 'R-3  Q61–65',  dim: 'Racional' },
  { key: 'ic_bloco_r4_pct', label: 'R-4  Q66–70',  dim: 'Racional' },
  { key: 'ic_bloco_r5_pct', label: 'R-5  Q71–75',  dim: 'Racional' },
  { key: 'ic_bloco_sa_pct', label: 'S-A  Q76–83',  dim: 'Social'   },
  { key: 'ic_bloco_sb_pct', label: 'S-B  Q84–91',  dim: 'Social'   },
  { key: 'ic_bloco_sc_pct', label: 'S-C  Q92–100', dim: 'Social'   },
  { key: 'ic_bloco_ca_pct', label: 'C-A  Q101–108',dim: 'Cultural' },
  { key: 'ic_bloco_cb_pct', label: 'C-B  Q109–116',dim: 'Cultural' },
  { key: 'ic_bloco_cc_pct', label: 'C-C  Q117–125',dim: 'Cultural' },
]

const DIM_COLOR: Record<string, string> = {
  Física:   'bg-blue-50   border-blue-100',
  Afetiva:  'bg-red-50    border-red-100',
  Racional: 'bg-orange-50 border-orange-100',
  Social:   'bg-green-50  border-green-100',
  Cultural: 'bg-violet-50 border-violet-100',
}

function scoreColor(pct: number | null): string {
  if (pct === null) return 'text-zinc-400'
  if (pct <= 40)   return 'text-red-700 font-bold'
  if (pct <= 60)   return 'text-amber-700 font-semibold'
  if (pct <= 80)   return 'text-green-700'
  return 'text-blue-700'
}

interface Props {
  result: DiagnosticResult
}

export function BlocoScoreGrid({ result }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {BLOCOS.map(({ key, label, dim }) => {
        const pct = result[key] as number | null
        const isCritical = pct !== null && pct <= 40
        return (
          <div
            key={key}
            className={`rounded-lg border p-3 ${DIM_COLOR[dim] ?? 'bg-zinc-50 border-zinc-100'} ${isCritical ? 'ring-1 ring-red-400' : ''}`}
          >
            <p className="text-xs text-zinc-500 font-mono mb-1">{label}</p>
            <p className={`text-lg tabular-nums ${scoreColor(pct)}`}>
              {pct !== null ? `${Math.round(pct)}%` : '—'}
            </p>
            {isCritical && (
              <p className="text-xs text-red-600 mt-0.5">⚠ Crítico</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
