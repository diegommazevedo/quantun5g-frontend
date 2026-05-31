'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  collaboratorsToTier,
  getOfferByTier,
  tierRangeLabel,
  tierDisplayName,
} from '@/constants/lp-nr01-offers'
import type { ScaleSelection } from '@/components/lp/LpPurchaseFlow'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

const MIN = 1
const MAX = 5000

function clampCollaborators(n: number): number {
  if (!Number.isFinite(n)) return 50
  return Math.min(MAX, Math.max(MIN, Math.round(n)))
}

export function ScaleCalculator({
  onScaleChange,
  onContinue,
  showStepLabel = true,
  continueLabel = 'Continuar para o plano recomendado',
}: {
  onScaleChange: (scale: ScaleSelection | null) => void
  onContinue?: (selection: ScaleSelection) => void
  showStepLabel?: boolean
  continueLabel?: string
}) {
  const [collaborators, setCollaborators] = useState(50)

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('colaboradores')
    if (raw == null) return
    const n = Number(raw)
    if (Number.isFinite(n) && n >= MIN) setCollaborators(clampCollaborators(n))
  }, [])

  const setCollaboratorsClamped = useCallback((n: number) => {
    setCollaborators(clampCollaborators(n))
  }, [])

  useEffect(() => {
    const tier = collaboratorsToTier(collaborators)
    onScaleChange({ collaborators, tier })
  }, [collaborators, onScaleChange])

  const tier = collaboratorsToTier(collaborators)
  const offer = getOfferByTier(tier)

  function handleContinue() {
    const selection = { collaborators, tier }
    if (onContinue) {
      onContinue(selection)
      return
    }
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleNumberInput(raw: string) {
    if (raw.trim() === '') return
    const n = parseInt(raw, 10)
    if (Number.isFinite(n)) setCollaboratorsClamped(n)
  }

  return (
    <section id="calculadora-escala" className="scroll-mt-20 px-4 py-12 sm:py-14" style={{ backgroundColor: 'transparent', color: TEXT }}>
      <div className="mx-auto max-w-xl">
        {showStepLabel ? (
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
            Passo 1 de 2
          </p>
        ) : null}
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">Calculadora de escala</h2>
        <p className="mt-2 text-sm opacity-90">
          Indique quantos colaboradores entram na avaliação NR-01. Use o campo numérico ou o controlo deslizante — o
          plano e o preço atualizam na hora.
        </p>

        <div
          className="mt-6 rounded-2xl border border-white/10 p-6 sm:p-8"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium" htmlFor="collab-number">
                Número de colaboradores
              </label>
              <input
                id="collab-number"
                type="number"
                min={MIN}
                max={MAX}
                step={1}
                value={collaborators}
                onChange={(e) => handleNumberInput(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-lg font-semibold tabular-nums text-white"
                inputMode="numeric"
                aria-describedby="collab-range"
              />
            </div>
            <p className="hidden pb-3 text-sm opacity-60 sm:block">ou</p>
            <div className="flex-1">
              <label className="block text-sm font-medium" htmlFor="collab-range">
                Ajuste rápido (arrastar)
              </label>
              <input
                id="collab-range"
                type="range"
                min={MIN}
                max={MAX}
                step={1}
                value={collaborators}
                onChange={(e) => setCollaboratorsClamped(Number(e.target.value))}
                className="mt-4 w-full"
                style={{ accentColor: ACCENT }}
                aria-valuemin={MIN}
                aria-valuemax={MAX}
                aria-valuenow={collaborators}
              />
              <div className="mt-1 flex justify-between text-xs opacity-80">
                <span>{MIN}</span>
                <span>5000</span>
              </div>
            </div>
          </div>

          <div
            className="mt-6 rounded-lg border p-4 text-sm leading-relaxed"
            style={{ borderColor: ACCENT, backgroundColor: 'rgba(184,148,90,0.06)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Faixa do plano (critério de preço)
            </p>
            <p className="mt-1 text-base font-bold" style={{ color: ACCENT }}>
              {tierRangeLabel(tier)}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide opacity-75">
              Para {collaborators} colaboradores · faixa {tierDisplayName(tier)}
            </p>
            <p className="mt-1 text-xl font-bold" style={{ color: ACCENT }}>
              {offer.price}
              <span className="ml-2 text-sm font-normal opacity-85">{offer.period}</span>
            </p>
            <p className="mt-2 opacity-90">{offer.headline}</p>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-6 w-full min-h-[52px] rounded-lg font-semibold transition hover:opacity-95"
            style={{ backgroundColor: ACCENT, color: BG }}
          >
            {continueLabel}
          </button>
          <p className="mt-2 text-center text-xs opacity-70">
            Próximo passo: confirmar o plano {tier} e seguir para contratação.
          </p>
        </div>
      </div>
    </section>
  )
}
