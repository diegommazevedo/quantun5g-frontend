'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PENTAGRAMA_GINGER_ADDON,
  PENTAGRAMA_GINGER_ADDON_ID,
  NR01_RT_NOTICE,
  computeCheckoutPricing,
  formatBrl,
  formatBillingLabel,
  parseTierPlanId,
  resolveTierFromHeadcount,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'
import { getOfferByTier } from '@/constants/lp-nr01-offers'
import type { ProductPlan } from '@/types/database'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const CHECKOUT_PREFILL_KEY = 'lp_nr01_checkout_prefill'

export function CheckoutForm({
  productId,
  plans,
  initialPlanId,
  initialTierId,
  initialHeadcount,
  initialBillingMode,
  initialIncludePentagrama,
  planLocked,
  gingerLocked,
  vendasOrigin,
  userEmail,
}: {
  productId: string
  plans: ProductPlan[]
  initialPlanId: string
  initialTierId?: Nr01TierId | null
  initialHeadcount?: number | null
  initialBillingMode?: Nr01BillingMode
  initialIncludePentagrama?: boolean
  planLocked: boolean
  gingerLocked: boolean
  vendasOrigin: string
  userEmail: string
}) {
  const isNr01 = productId === 'nr01'

  const [tierId, setTierId] = useState<Nr01TierId>(
    initialTierId ?? parseTierPlanId(initialPlanId) ?? 't03',
  )
  const [headcount, setHeadcount] = useState(initialHeadcount ?? 50)
  const [billingMode, setBillingMode] = useState<Nr01BillingMode>(
    initialBillingMode ?? 'anual_parcelado',
  )
  const [includePentagrama, setIncludePentagrama] = useState(initialIncludePentagrama ?? false)
  const [planId, setPlanId] = useState(initialPlanId)

  const [name, setName] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(userEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNr01) {
      setTierId(resolveTierFromHeadcount(headcount) as Nr01TierId)
    }
  }, [headcount, isNr01])

  const pricing = useMemo(() => {
    if (isNr01) {
      try {
        return computeCheckoutPricing({ tierId, billingMode, includePentagrama })
      } catch {
        return null
      }
    }
    const plan = plans.find((p) => p.id === planId)
    const base = plan?.price_cents ?? 0
    return {
      tierId,
      billingMode,
      includePentagrama: false,
      baseCents: base,
      gingerCents: 0,
      totalCents: base,
      installmentCents: Math.round(base / 12),
      skuId: '',
      entitlements: [],
    }
  }, [isNr01, tierId, billingMode, includePentagrama, planId, plans])

  const offer = isNr01 ? getOfferByTier(tierId, billingMode) : null

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_PREFILL_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as {
        name?: string
        email?: string
        phone?: string
        cpfCnpj?: string
      }
      if (data.name) setName(data.name)
      if (data.email) setEmail(data.email)
      if (data.phone) setPhone(data.phone)
      if (data.cpfCnpj) setCpfCnpj(data.cpfCnpj)
      sessionStorage.removeItem(CHECKOUT_PREFILL_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pricing) return
    setError(null)
    setSubmitting(true)
    try {
      const body = isNr01
        ? {
            productId,
            tierId,
            billingMode,
            includePentagrama,
            headcountDeclared: headcount,
            customerData: { name, cpfCnpj, email, phone },
          }
        : {
            productId,
            planId,
            customerData: { name, cpfCnpj, email, phone },
          }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar checkout')
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }
      throw new Error('Checkout sem paymentUrl')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      {isNr01 && offer && pricing ? (
        <>
          <section className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Faixa NR-01 · {tierId.toUpperCase()}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{offer.audienceRange}</p>
            {!planLocked && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700" htmlFor="headcount">
                  Trabalhadores no escopo NR-01
                </label>
                <input
                  id="headcount"
                  type="number"
                  min={1}
                  max={5000}
                  value={headcount}
                  onChange={(e) => setHeadcount(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            {planLocked && (
              <p className="mt-2 text-sm text-slate-600">
                Escala informada na contratação: <strong>{headcount}</strong> colaboradores
              </p>
            )}
            {!planLocked && (
              <a
                href={vendasOrigin}
                className="mt-3 inline-block text-sm text-blue-800 underline underline-offset-2"
              >
                Alterar na página de vendas
              </a>
            )}
          </section>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Forma de pagamento (anual)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['anual_parcelado', 'anual_vista'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`cursor-pointer rounded-lg border p-3 text-sm ${
                    billingMode === mode ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="billing"
                    checked={billingMode === mode}
                    onChange={() => setBillingMode(mode)}
                    className="mr-2"
                  />
                  {formatBillingLabel(mode)}
                </label>
              ))}
            </div>
          </fieldset>

          {gingerLocked ? (
            <section className="rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-sm">
              <p className="font-semibold text-violet-950">{PENTAGRAMA_GINGER_ADDON.shortLabel}</p>
              <p className="mt-1 text-slate-700">Incluído (+{formatBrl(pricing.gingerCents)}).</p>
            </section>
          ) : (
            <fieldset className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={includePentagrama}
                  onChange={(e) => setIncludePentagrama(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-slate-800">
                  <span className="font-semibold">{PENTAGRAMA_GINGER_ADDON.label}</span>
                  <span className="mt-1 block text-slate-600">{PENTAGRAMA_GINGER_ADDON.description}</span>
                  {includePentagrama && (
                    <span className="mt-2 block font-medium">+50% sobre a base ({formatBrl(pricing.gingerCents)})</span>
                  )}
                </span>
              </label>
            </fieldset>
          )}

          <p className="text-xs text-slate-500 leading-relaxed">{NR01_RT_NOTICE}</p>
        </>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Plano</legend>
          <div className="mt-2 grid gap-2">
            {plans.map((plan) => (
              <label
                key={plan.id}
                className={`flex cursor-pointer items-center justify-between rounded border p-3 ${
                  planId === plan.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div>
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={planId === plan.id}
                    onChange={() => setPlanId(plan.id)}
                    className="mr-2"
                  />
                  <span className="font-medium">{plan.name}</span>
                </div>
                <span className="font-semibold">{BRL.format(plan.price_cents / 100)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {pricing && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="flex justify-between">
            <span>Assinatura NR-01 ({tierId.toUpperCase()})</span>
            <span>{BRL.format(pricing.baseCents / 100)}</span>
          </p>
          {pricing.gingerCents > 0 && (
            <p className="mt-1 flex justify-between text-violet-900">
              <span>Pentagrama de Ginger</span>
              <span>{BRL.format(pricing.gingerCents / 100)}</span>
            </p>
          )}
          {billingMode === 'anual_parcelado' && isNr01 && (
            <p className="mt-1 text-xs text-slate-500">
              12× de {BRL.format(pricing.installmentCents / 100)} no cartão
            </p>
          )}
          <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Total anual</span>
            <span>{BRL.format(pricing.totalCents / 100)}</span>
          </p>
          {isNr01 && pricing.skuId && (
            <p className="mt-2 font-mono text-[10px] text-slate-400">SKU {pricing.skuId}</p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo / Razão social" value={name} onChange={setName} required />
        <Field label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} required />
        <Field label="E-mail" value={email} onChange={setEmail} type="email" required />
        <Field label="Telefone" value={phone} onChange={setPhone} />
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting || !pricing || pricing.totalCents <= 0}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting
          ? 'Processando…'
          : `Continuar para pagamento — ${pricing ? BRL.format(pricing.totalCents / 100) : '—'}`}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
    </label>
  )
}

// silence unused import
void PENTAGRAMA_GINGER_ADDON_ID
