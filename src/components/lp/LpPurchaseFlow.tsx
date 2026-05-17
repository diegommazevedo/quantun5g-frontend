'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  collaboratorsToTier,
  getOfferByTier,
  tierRangeLabel,
  type Nr01WizardTier,
} from '@/constants/lp-nr01-offers'
import { ScaleCalculator } from '@/components/lp/ScaleCalculator'
import { PlanPicker } from '@/components/lp/PlanPicker'
import { QualificationWizard } from '@/components/lp/QualificationWizard'

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
    <>
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
      <QualificationWizard
        tier={selectedTier}
        collaborators={scale?.collaborators ?? null}
        onChangePlan={() => {
          setSelectedTier(null)
          document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />
    </>
  )
}
