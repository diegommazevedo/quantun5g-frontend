'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Nr01WizardTier } from '@/constants/lp-nr01-offers'
import { ScaleCalculator } from '@/components/lp/ScaleCalculator'
import { PlanPicker } from '@/components/lp/PlanPicker'
import { QualificationWizard } from '@/components/lp/QualificationWizard'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export type ScaleSelection = {
  collaborators: number
  tier: Nr01WizardTier
}

export function LpPurchaseFlow() {
  const [scale, setScale] = useState<ScaleSelection | null>(null)
  const [selectedTier, setSelectedTier] = useState<Nr01WizardTier | null>(null)
  const handleScaleChange = useCallback((s: ScaleSelection | null) => setScale(s), [])

  const handlePlanCta = useCallback((tier: Nr01WizardTier) => {
    setSelectedTier(tier)
    requestAnimationFrame(() => {
      document.getElementById('captura-diagnostico')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  useEffect(() => {
    if (!scale) setSelectedTier(null)
    else if (selectedTier && selectedTier !== scale.tier) {
      setSelectedTier(null)
    }
  }, [scale, selectedTier])

  return (
    <section
      id="contratar-nr01"
      className="scroll-mt-16 border-y border-white/10"
      style={{
        background: `linear-gradient(180deg, ${BG} 0%, #0f2238 50%, ${BG} 100%)`,
        color: TEXT,
      }}
      aria-labelledby="contratar-nr01-title"
    >
      <div className="mx-auto max-w-4xl px-4 pb-4 pt-14 sm:pt-16">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
          Contratação digital
        </p>
        <h2 id="contratar-nr01-title" className="mt-2 text-2xl font-bold sm:text-3xl">
          Configure a escala, confirme o plano e finalize em minutos
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed opacity-90">
          Fluxo transparente em três etapas: calculadora de colaboradores (fator decisor do preço), oferta
          publicada com escopo completo e checkout seguro. Solução inovadora para adequação NR-01 com evidências
          verificáveis — sem proposta comercial prévia nesta jornada.
        </p>
        <ol className="mt-6 flex flex-wrap gap-3 text-xs font-medium uppercase tracking-wide">
          {['1 · Escala', '2 · Plano', '3 · Contratação'].map((step, i) => (
            <li
              key={step}
              className="rounded-full border px-3 py-1.5"
              style={{
                borderColor: i === 0 || (i === 1 && scale) || (i === 2 && selectedTier) ? ACCENT : 'rgba(255,255,255,0.2)',
                color: i === 0 || (i === 1 && scale) || (i === 2 && selectedTier) ? ACCENT : 'inherit',
                opacity: i === 0 || (i === 1 && scale) || (i === 2 && selectedTier) ? 1 : 0.6,
              }}
            >
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div
        className="mx-auto max-w-4xl rounded-t-2xl border border-b-0 border-white/15 px-1 pt-1 sm:px-2 sm:pt-2"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <ScaleCalculator
          onScaleChange={handleScaleChange}
          onContinue={() => {
            document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
        <PlanPicker
          recommendedTier={scale?.tier ?? null}
          collaborators={scale?.collaborators ?? null}
          onContract={handlePlanCta}
        />
        {selectedTier ? (
          <QualificationWizard
            tier={selectedTier}
            collaborators={scale?.collaborators ?? null}
            onChangePlan={() => {
              setSelectedTier(null)
              document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        ) : null}
      </div>
    </section>
  )
}
