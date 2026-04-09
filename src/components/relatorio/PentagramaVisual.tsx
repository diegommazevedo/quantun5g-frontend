'use client'

/**
 * QUANTUM5G — PentagramaVisual
 * Radar (pentágono) comparando IC vs IL nas 5 dimensões.
 * Recharts RadarChart — 'use client' obrigatório.
 */

import { useState, useEffect } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface DimData {
  dimensao: string
  ic: number
  il: number
}

interface Props {
  ic_fisica_pct:   number | null
  ic_afetiva_pct:  number | null
  ic_racional_pct: number | null
  ic_social_pct:   number | null
  ic_cultural_pct: number | null
  il_fisica_pct:   number | null
  il_afetiva_pct:  number | null
  il_racional_pct: number | null
  il_social_pct:   number | null
  il_cultural_pct: number | null
}

const fmt = (v: number | null) => Math.round(v ?? 0)

export function PentagramaVisual(props: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const data: DimData[] = [
    { dimensao: 'Física',   ic: fmt(props.ic_fisica_pct),   il: fmt(props.il_fisica_pct)   },
    { dimensao: 'Afetiva',  ic: fmt(props.ic_afetiva_pct),  il: fmt(props.il_afetiva_pct)  },
    { dimensao: 'Racional', ic: fmt(props.ic_racional_pct), il: fmt(props.il_racional_pct) },
    { dimensao: 'Social',   ic: fmt(props.ic_social_pct),   il: fmt(props.il_social_pct)   },
    { dimensao: 'Cultural', ic: fmt(props.ic_cultural_pct), il: fmt(props.il_cultural_pct) },
  ]

  if (!mounted) return <div style={{ width: '100%', minWidth: 0, height: 360 }} />

  return (
    <div style={{ width: '100%', minWidth: 0, height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis
            dataKey="dimensao"
            tick={{ fill: '#3f3f46', fontSize: 13, fontWeight: 500 }}
          />
          <Radar
            name="IC — Colaboradores"
            dataKey="ic"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
          />
          <Radar
            name="IL — Liderança"
            dataKey="il"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.12}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4, fill: '#f97316' }}
          />
          <Tooltip
            formatter={(value) => [`${value}%`]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
