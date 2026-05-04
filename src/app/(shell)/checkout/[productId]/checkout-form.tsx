'use client'

/**
 * QUANTUM5G — Form de checkout (P021).
 * Coleta dados do cliente, faz POST para /api/billing/checkout
 * e redireciona para o invoiceUrl retornado pelo Asaas.
 */

import { useState } from 'react'
import type { ProductPlan } from '@/types/database'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function CheckoutForm({
  productId,
  plans,
  initialPlanId,
  userEmail,
}: {
  productId: string
  plans: ProductPlan[]
  initialPlanId: string
  userEmail: string
}) {
  const [planId, setPlanId] = useState(initialPlanId)
  const [name, setName] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(userEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Plano</legend>
        <div className="mt-2 grid gap-2">
          {plans.map(plan => (
            <label
              key={plan.id}
              className={`flex cursor-pointer items-center justify-between rounded border p-3 ${
                planId === plan.id
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200'
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
                  {plan.collaborators_min}–{plan.collaborators_max ?? '∞'} colaboradores
                  · {plan.modality === 'one_off' ? 'pagamento único' : plan.modality === 'annual' ? 'anual' : 'mensal'}
                </span>
              </div>
              <span className="font-semibold">
                {BRL.format(plan.price_cents / 100)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo / Razão social" value={name} onChange={setName} required />
        <Field label="CPF ou CNPJ" value={cpfCnpj} onChange={setCpfCnpj} required />
        <Field label="E-mail" value={email} onChange={setEmail} type="email" required />
        <Field label="Telefone" value={phone} onChange={setPhone} />
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? 'Processando…' : 'Continuar para pagamento'}
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
        onChange={e => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
    </label>
  )
}
