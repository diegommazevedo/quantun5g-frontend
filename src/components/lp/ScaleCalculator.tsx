'use client'

import { useEffect, useState } from 'react'
import {
  collaboratorsToTier,
  getOfferByTier,
  tierRangeLabel,
} from '@/constants/lp-nr01-offers'
import type { ScaleSelection } from '@/components/lp/LpPurchaseFlow'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function ScaleCalculator({
  onScaleChange,
}: {
  onScaleChange: (scale: ScaleSelection | null) => void
}) {
  const [collaborators, setCollaborators] = useState(50)

  useEffect(() => {
    const tier = collaboratorsToTier(collaborators)
    onScaleChange({ collaborators, tier })
  }, [collaborators, onScaleChange])

  const tier = collaboratorsToTier(collaborators)
  const offer = getOfferByTier(tier)

  return (
    <section id="calculadora-escala" className="scroll-mt-20 px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
          Passo 1 de 2
        </p>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">Calculadora de escala</h2>
        <p className="mt-2 text-sm opacity-90">
          Indique quantos colaboradores entram na avaliação NR-01. O plano recomendado é definido automaticamente
          (sem análise comercial).
        </p>

        <div
          className="mt-6 rounded-2xl border border-white/10 p-6 sm:p-8"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <label className="block text-sm font-medium" htmlFor="collab-range">
            Colaboradores na população-alvo
          </label>
          <input
            id="collab-range"
            type="range"
            min={1}
            max={5000}
            step={1}
            value={collaborators}
            onChange={(e) => setCollaborators(Number(e.target.value))}
            className="mt-3 w-full"
            style={{ accentColor: ACCENT }}
          />
          <div className="mt-1 flex justify-between text-xs opacity-80">
            <span>1</span>
            <span className="text-base font-semibold tabular-nums" style={{ color: ACCENT }}>
              {collaborators}
            </span>
            <span>5000</span>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 p-4 text-sm leading-relaxed">
            <p className="text-xs uppercase tracking-wide opacity-75">Plano recomendado para o seu porte</p>
            <p className="mt-1 text-lg font-bold" style={{ color: ACCENT }}>
              {tier} · {offer.price}
            </p>
            <p className="mt-1 opacity-90">{offer.modality}</p>
            <p className="mt-2 text-xs opacity-75">Faixa: {tierRangeLabel(tier)}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
