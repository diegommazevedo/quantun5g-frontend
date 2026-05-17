'use client'

import { ScaleCalculator } from '@/components/lp/ScaleCalculator'

/** Calculadora na rota dedicada `/lp/nr01/calculadora` — mesmo UI da landing. */
export function Calculator() {
  return (
    <ScaleCalculator
      onScaleChange={() => {}}
      showStepLabel={false}
      continueLabel="Continuar na landing — escolher plano"
      onContinue={(selection) => {
        window.location.href = `/lp/nr01?colaboradores=${selection.collaborators}#planos`
      }}
    />
  )
}
