'use client'

import { useState } from 'react'
import {
  NR01_OFFERS,
  NR01_PLATFORM_NOTICE,
  type Nr01WizardTier,
} from '@/constants/lp-nr01-offers'
import { PlanOfferDetail } from '@/components/lp/PlanOfferDetail'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function PlanPicker({
  recommendedTier,
  collaborators,
  onContract,
}: {
  recommendedTier: Nr01WizardTier | null
  collaborators: number | null
  onContract: (tier: Nr01WizardTier) => void
}) {
  const [showAllPlans, setShowAllPlans] = useState(false)
  const recommended = recommendedTier
    ? NR01_OFFERS.find((o) => o.tier === recommendedTier) ?? null
    : null

  return (
    <section id="planos" className="scroll-mt-20 px-4 py-12 sm:py-16" style={{ backgroundColor: 'transparent', color: TEXT }}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
          Passo 2 de 2 · escolha do plano
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Plano publicado para a sua escala</h2>
        <p className="mt-3 text-sm leading-relaxed opacity-90">
          O valor e o escopo abaixo são definidos automaticamente pelo número de colaboradores que indicou na
          calculadora. Preço fixo antes do pagamento — contratação digital, sem proposta comercial prévia.
        </p>

        {!recommended ? (
          <p className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-80">
            Indique a escala na calculadora (passo 1) para ver o plano aplicável ao seu porte.
          </p>
        ) : (
          <>
            <PlanOfferDetail offer={recommended} collaborators={collaborators} />

            <button
              type="button"
              onClick={() => onContract(recommended.tier)}
              className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-lg px-4 text-center text-base font-semibold transition hover:opacity-95"
              style={{ backgroundColor: ACCENT, color: BG }}
            >
              Contratar faixa {recommended.tier.toUpperCase()} — {recommended.price}
            </button>

            <p className="mt-3 text-center text-xs opacity-70">{NR01_PLATFORM_NOTICE}</p>

            <div className="mt-10 border-t border-white/10 pt-8">
              <button
                type="button"
                onClick={() => setShowAllPlans((v) => !v)}
                className="w-full text-left text-sm font-medium underline underline-offset-2"
                style={{ color: ACCENT }}
                aria-expanded={showAllPlans}
              >
                {showAllPlans
                  ? 'Ocultar comparativo completo'
                  : 'Comparar todos os planos (preço, faixa de colaboradores e escopo)'}
              </button>

              {showAllPlans ? (
                <ul className="mt-8 space-y-10">
                  {NR01_OFFERS.map((offer) => {
                    const isRec = offer.tier === recommendedTier
                    return (
                      <li key={offer.planId}>
                        {isRec ? (
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
                            Plano recomendado para a sua escala
                          </p>
                        ) : null}
                        <PlanOfferDetail
                          offer={offer}
                          collaborators={isRec ? collaborators : null}
                          compact
                        />
                        {!isRec ? (
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById('calculadora-escala')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                            className="mt-3 text-sm underline opacity-80"
                            style={{ color: ACCENT }}
                          >
                            Ajustar colaboradores na calculadora para este plano
                          </button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>

            <p className="mt-8 text-center text-xs opacity-70">
              <a href="#calculadora-escala" className="underline underline-offset-2" style={{ color: ACCENT }}>
                Voltar à calculadora de escala
              </a>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
