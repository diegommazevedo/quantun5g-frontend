'use client'

import { useMemo, useState } from 'react'
import {
  formatBrl,
  JOVANE_RT_UPSELL,
  totalWithAddon,
  type SalesPlan,
} from '@/constants/plans'
import { buildCheckoutUrl, PROPOSAL_MAILTO } from '@/lib/checkout-url'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function PlanCard({ plan }: { plan: SalesPlan }) {
  const [addon, setAddon] = useState(false)

  const totalCents = useMemo(
    () => (plan.checkoutEnabled ? totalWithAddon(plan.priceCents, addon) : 0),
    [plan, addon],
  )

  const ctaHref = plan.checkoutEnabled
    ? buildCheckoutUrl(plan.id, addon)
    : PROPOSAL_MAILTO

  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-7 ${
        plan.featured ? 'border-2 shadow-lg shadow-black/20' : 'border-white/15'
      }`}
      style={{
        borderColor: plan.featured ? ACCENT : undefined,
        backgroundColor: plan.featured ? 'rgba(184,148,90,0.1)' : 'rgba(255,255,255,0.04)',
      }}
    >
      {plan.featured && plan.featuredBadge ? (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: ACCENT, color: BG }}
        >
          {plan.featuredBadge}
        </span>
      ) : null}

      <span
        className="inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: 'rgba(184,148,90,0.25)', color: ACCENT }}
      >
        {plan.audienceBadge}
      </span>

      <h2 className="mt-4 text-2xl font-bold">{plan.name}</h2>

      <p className="mt-3">
        <span className="text-3xl font-bold" style={{ color: ACCENT }}>
          {plan.priceLabel}
        </span>
        {plan.checkoutEnabled ? (
          <span className="ml-1 text-lg font-medium opacity-90">/ano</span>
        ) : null}
      </p>
      <p className="mt-1 text-sm opacity-80">{plan.installmentNote}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest opacity-70">
        {plan.modalityLabel}
      </p>

      <p className="mt-4 text-sm leading-relaxed opacity-90">{plan.summary}</p>

      <ul className="mt-5 flex-1 space-y-2 text-sm opacity-95">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="shrink-0 font-bold" style={{ color: ACCENT }} aria-hidden>
              ✓
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.checkoutEnabled ? (
        <div className="mt-6">
          <label className="block text-xs font-semibold uppercase tracking-wide opacity-80">
            {JOVANE_RT_UPSELL.shortLabel}
          </label>
          <select
            value={addon ? 'yes' : 'no'}
            onChange={(e) => setAddon(e.target.value === 'yes')}
            className="mt-2 w-full rounded-lg border border-white/20 bg-[#0f2238] px-3 py-2.5 text-sm text-white"
          >
            <option value="no">Não incluir add-on</option>
            <option value="yes">
              Incluir (+50% = {formatBrl(Math.round(plan.priceCents * JOVANE_RT_UPSELL.multiplier))})
            </option>
          </select>
          {addon ? (
            <p className="mt-2 text-xs leading-relaxed opacity-85">{JOVANE_RT_UPSELL.description}</p>
          ) : null}
          <p className="mt-3 text-sm font-semibold" style={{ color: ACCENT }}>
            Total na contratação: {formatBrl(totalCents)}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs opacity-85">
          {JOVANE_RT_UPSELL.shortLabel} — disponível na proposta comercial.
        </div>
      )}

      <a
        href={ctaHref}
        className={`mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg px-4 text-center text-sm font-semibold transition hover:opacity-95 ${
          plan.checkoutEnabled ? '' : 'border-2 bg-transparent'
        }`}
        style={
          plan.checkoutEnabled
            ? { backgroundColor: ACCENT, color: BG }
            : { borderColor: ACCENT, color: ACCENT }
        }
      >
        {plan.ctaLabel}
      </a>
    </article>
  )
}
