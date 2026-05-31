'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  computeCheckoutTotalCents,
  formatBrl,
  getSalesPlan,
  JOVANE_RT_UPSELL,
  JOVANE_RT_UPSELL_ID,
} from '@/constants/nr01-sales-plans'
import type { ProductPlan } from '@/types/database'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const CHECKOUT_PREFILL_KEY = 'lp_nr01_checkout_prefill'

export function CheckoutForm({
  productId,
  plans,
  initialPlanId,
  initialAddon,
  planLocked,
  addonLocked,
  vendasOrigin,
  userEmail,
}: {
  productId: string
  plans: ProductPlan[]
  initialPlanId: string
  initialAddon: 'jovane_rt' | null
  planLocked: boolean
  addonLocked: boolean
  vendasOrigin: string
  userEmail: string
}) {
  const [planId, setPlanId] = useState(initialPlanId)
  const [addonJovaneRt, setAddonJovaneRt] = useState(initialAddon === JOVANE_RT_UPSELL_ID)
  const [name, setName] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(userEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const salesPlan = productId === 'nr01' ? getSalesPlan(planId) : undefined
  const pricing = useMemo(() => {
    if (salesPlan) return computeCheckoutTotalCents(salesPlan, addonJovaneRt)
    const plan = plans.find((p) => p.id === planId)
    const base = plan?.price_cents ?? 0
    return { baseCents: base, addonCents: 0, totalCents: base }
  }, [salesPlan, addonJovaneRt, planId, plans])

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
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          planId,
          addon: addonJovaneRt ? JOVANE_RT_UPSELL_ID : undefined,
          customerData: { name, cpfCnpj, email, phone },
        }),
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

  const changePlanHref = `${vendasOrigin}/`

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      {planLocked && salesPlan ? (
        <section className="rounded-lg border border-slate-900/20 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plano escolhido na página de vendas
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900">{salesPlan.name}</p>
          <p className="mt-1 text-sm font-medium text-amber-800">{salesPlan.audienceBadge}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {salesPlan.priceLabel}
            <span className="text-base font-normal text-slate-600"> /ano</span>
          </p>
          <p className="text-sm text-slate-600">{salesPlan.installmentNote}</p>
          <a
            href={changePlanHref}
            className="mt-3 inline-block text-sm font-medium text-slate-700 underline underline-offset-2"
          >
            Alterar plano na página de vendas
          </a>
          <input type="hidden" name="plan" value={planId} />
        </section>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Plano</legend>
          <div className="mt-2 grid gap-2">
            {plans.map((plan) => {
              const sp = productId === 'nr01' ? getSalesPlan(plan.id) : null
              return (
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
                    <span className="ml-2 text-xs text-slate-500">
                      {sp?.audienceBadge ??
                        `até ${plan.collaborators_max ?? '∞'} colaboradores`}{' '}
                      · {plan.modality === 'annual' ? 'anual' : plan.modality}
                    </span>
                  </div>
                  <span className="font-semibold">
                    {sp ? sp.priceLabel : BRL.format(plan.price_cents / 100)}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {productId === 'nr01' && salesPlan ? (
        addonLocked ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-slate-800">
            <p className="font-semibold text-amber-950">{JOVANE_RT_UPSELL.shortLabel}</p>
            <p className="mt-1 text-slate-700">Incluído na sua escolha (+{formatBrl(pricing.addonCents)}).</p>
            <p className="mt-2 text-xs text-slate-600">{JOVANE_RT_UPSELL.description}</p>
          </section>
        ) : (
          <fieldset className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={addonJovaneRt}
                onChange={(e) => setAddonJovaneRt(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm text-slate-800">
                <span className="font-semibold">{JOVANE_RT_UPSELL.shortLabel}</span>
                <span className="mt-1 block text-slate-600">{JOVANE_RT_UPSELL.description}</span>
                <span className="mt-2 block font-medium text-slate-900">
                  +{BRL.format(pricing.addonCents / 100)} (50% do plano base)
                </span>
              </span>
            </label>
          </fieldset>
        )
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="flex justify-between">
          <span>Plano base</span>
          <span>{BRL.format(pricing.baseCents / 100)}</span>
        </p>
        {pricing.addonCents > 0 ? (
          <p className="mt-1 flex justify-between text-amber-900">
            <span>Add-on RT + Pentagrama</span>
            <span>{BRL.format(pricing.addonCents / 100)}</span>
          </p>
        ) : null}
        <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{BRL.format(pricing.totalCents / 100)}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo / Razão social" value={name} onChange={setName} required />
        <Field label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} required />
        <Field label="E-mail" value={email} onChange={setEmail} type="email" required />
        <Field label="Telefone" value={phone} onChange={setPhone} />
      </div>

      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting || pricing.totalCents <= 0}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? 'Processando…' : `Continuar para pagamento — ${BRL.format(pricing.totalCents / 100)}`}
      </button>

      {planLocked ? (
        <p className="text-center text-xs text-slate-500">
          Confirme os dados da empresa e prossiga para o pagamento seguro.
        </p>
      ) : null}
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
