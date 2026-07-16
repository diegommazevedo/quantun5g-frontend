'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  formatBrl,
  JOVANE_RT_UPSELL,
  RT_NOTICE,
  totalWithAddon,
  type SalesPlan,
} from '@/constants/plans'
import { buildCheckoutUrl } from '@/lib/checkout-url'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'

export function PlanLanding({
  plan,
  initialAddon = false,
}: {
  plan: SalesPlan
  initialAddon?: boolean
}) {
  const [addon, setAddon] = useState(initialAddon)

  useEffect(() => {
    setAddon(initialAddon)
  }, [initialAddon])

  const addonCents = useMemo(
    () => Math.round(plan.priceCents * JOVANE_RT_UPSELL.multiplier),
    [plan.priceCents],
  )
  const totalCents = useMemo(() => totalWithAddon(plan.priceCents, addon), [plan.priceCents, addon])
  const checkoutHref = buildCheckoutUrl(plan.id, addon)

  return (
    <div className="mx-auto max-w-lg">
      <div
        className="rounded-2xl border border-white/15 p-6 sm:p-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
          Quantum5G · NR-01
        </p>
        <span
          className="mt-4 inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: 'rgba(184,148,90,0.25)', color: ACCENT }}
        >
          {plan.audienceBadge}
        </span>

        <h1 className="mt-4 text-3xl font-bold">Plano {plan.name}</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-90">{plan.summary}</p>

        <p className="mt-6">
          <span className="text-4xl font-bold" style={{ color: ACCENT }}>
            {plan.priceLabel}
          </span>
          <span className="text-lg opacity-90"> /ano</span>
        </p>
        <p className="mt-1 text-sm opacity-80">{plan.installmentNote}</p>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
          {plan.modalityLabel}
        </p>

        <ul className="mt-6 space-y-2 border-t border-white/10 pt-6 text-sm opacity-95">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="shrink-0 font-bold" style={{ color: ACCENT }} aria-hidden>
                ✓
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <fieldset
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: 'rgba(184,148,90,0.45)', backgroundColor: 'rgba(184,148,90,0.12)' }}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={addon}
            onChange={(e) => setAddon(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
            style={{ accentColor: ACCENT }}
          />
          <span className="text-sm leading-relaxed">
            <span className="font-bold" style={{ color: ACCENT }}>
              {JOVANE_RT_UPSELL.shortLabel}
            </span>
            <span className="mt-2 block opacity-90">{JOVANE_RT_UPSELL.description}</span>
            <span className="mt-2 block font-semibold">
              +{formatBrl(addonCents)} (50% do plano base)
            </span>
          </span>
        </label>
      </fieldset>

      <div
        className="mt-6 rounded-xl border border-white/15 p-4 text-sm"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        <p className="flex justify-between opacity-90">
          <span>Plano base</span>
          <span>{formatBrl(plan.priceCents)}</span>
        </p>
        {addon ? (
          <p className="mt-2 flex justify-between" style={{ color: ACCENT }}>
            <span>Add-on RT + Pentagrama</span>
            <span>{formatBrl(addonCents)}</span>
          </p>
        ) : null}
        <p className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-bold">
          <span>Total</span>
          <span style={{ color: ACCENT }}>{formatBrl(totalCents)}</span>
        </p>
      </div>

      <a
        href={checkoutHref}
        className="mt-8 flex min-h-[52px] w-full items-center justify-center rounded-lg text-center text-base font-semibold transition hover:opacity-95"
        style={{ backgroundColor: ACCENT, color: BG }}
      >
        Assinar plano {plan.name} — {formatBrl(totalCents)}
      </a>

      <p className="mt-4 text-center text-xs opacity-70">
        Pagamento seguro na plataforma Quantum5G · assinatura anual
      </p>

      <aside
        className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-relaxed opacity-90"
        role="note"
      >
        <p className="font-semibold" style={{ color: ACCENT }}>
          Responsável técnico do laudo
        </p>
        <p className="mt-2">{RT_NOTICE}</p>
      </aside>
    </div>
  )
}
