'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  NR01_TIERS,
  NR01_RT_NOTICE,
  PENTAGRAMA_GINGER_ADDON,
  computeCheckoutPricing,
  formatBrl,
  formatBillingLabel,
  resolveTierFromHeadcount,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'
import {
  PENTAGRAMA_PLANS,
  resolvePentagramaPlanFromHeadcount,
  type PentagramaPlanId,
} from '@/lib/billing/pentagrama-catalog'
import { validateCnpj, formatCnpjDisplay } from '@/lib/companies/cnpj'
import { normalizeCnpj } from '@/lib/companies/normalize'
import {
  COMPANY_CNPJ_SLOTS_DEFAULT,
  COMPANY_CNPJ_SLOTS_MAX,
  parseCompanyCnpjSlots,
} from '@/lib/licensing/company-cnpj-slots'
import type { CommercialPlan } from '@/lib/licensing/model'
import type { UserRole } from '@/types/database'

interface Props {
  role: UserRole
  userEmail: string
  plan?: CommercialPlan
  licensingV2?: boolean
}

export function CommercialInvoiceForm({
  role,
  userEmail,
  plan = 'b2c',
  licensingV2 = false,
}: Props) {
  const router = useRouter()
  const isStaff = role === 'admin' || role === 'consultant'
  const selfLicense =
    licensingV2 && (role === 'consultant' || role === 'leader')
  const showClientFields = isStaff && !selfLicense
  const [modNr01, setModNr01] = useState(true)
  const [modPentagrama, setModPentagrama] = useState(false)
  const [tierId, setTierId] = useState<Nr01TierId>('t03')
  const [pentPlanId, setPentPlanId] = useState<PentagramaPlanId>('pent_operacional')
  const [headcount, setHeadcount] = useState(50)
  const [billingMode, setBillingMode] = useState<Nr01BillingMode>('anual_parcelado')
  const [includePentagramaUpsell, setIncludePentagramaUpsell] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const [targetName, setTargetName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cnpjError, setCnpjError] = useState<string | null>(null)
  const [companyCnpjSlots, setCompanyCnpjSlots] = useState(
    plan === 'b2b' ? Math.max(2, COMPANY_CNPJ_SLOTS_DEFAULT) : COMPANY_CNPJ_SLOTS_DEFAULT,
  )
  const [whatsapp, setWhatsapp] = useState('')
  const [autoInvite, setAutoInvite] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const showUpsell = modNr01 && !modPentagrama

  const effectiveTier = useMemo(() => {
    if (!isStaff || !modNr01) return tierId
    return resolveTierFromHeadcount(headcount) as Nr01TierId
  }, [headcount, isStaff, tierId, modNr01])

  const effectivePentPlan = useMemo(() => {
    if (!isStaff || !modPentagrama) return pentPlanId
    return resolvePentagramaPlanFromHeadcount(headcount)
  }, [headcount, isStaff, pentPlanId, modPentagrama])

  const pricing = useMemo(() => {
    if (!modNr01) return null
    try {
      return computeCheckoutPricing({
        tierId: effectiveTier,
        billingMode,
        includePentagrama: showUpsell && includePentagramaUpsell,
      })
    } catch {
      return null
    }
  }, [modNr01, effectiveTier, billingMode, showUpsell, includePentagramaUpsell])

  const pentPlan = useMemo(
    () => (modPentagrama ? PENTAGRAMA_PLANS.find((p) => p.id === effectivePentPlan) : null),
    [modPentagrama, effectivePentPlan],
  )

  const totalCentsFixed = useMemo(() => {
    if (!modNr01 && !modPentagrama) return null
    if (modNr01 && modPentagrama && pricing && pentPlan) {
      return pricing.baseCents + pentPlan.priceCents
    }
    if (modNr01 && pricing) {
      return computeCheckoutPricing({
        tierId: effectiveTier,
        billingMode,
        includePentagrama: showUpsell && includePentagramaUpsell,
      }).totalCents
    }
    if (modPentagrama && pentPlan) return pentPlan.priceCents
    return null
  }, [
    modNr01,
    modPentagrama,
    pricing,
    pentPlan,
    effectiveTier,
    billingMode,
    showUpsell,
    includePentagramaUpsell,
  ])

  function validateCnpjOnExit() {
    const err = validateCnpj(cnpj)
    setCnpjError(err)
    if (!err) {
      const d = normalizeCnpj(cnpj)
      if (d.length === 14) setCnpj(formatCnpjDisplay(d))
    }
  }

  function toggleModule(which: 'nr01' | 'pentagrama', checked: boolean) {
    if (which === 'nr01') {
      setModNr01(checked)
      if (!checked && !modPentagrama) setModPentagrama(true)
    } else {
      setModPentagrama(checked)
      if (!checked && !modNr01) setModNr01(true)
      if (checked) setIncludePentagramaUpsell(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const cnpjErr = validateCnpj(cnpj)
    if (cnpjErr) {
      setCnpjError(cnpjErr)
      return
    }

    if (!modNr01 && !modPentagrama) {
      setError('Selecione ao menos um módulo.')
      return
    }

    if (modNr01) {
      const tier = NR01_TIERS.find((t) => t.id === effectiveTier)
      if (!tier?.checkoutEnabled) {
        setError('Faixa acima de 1.000 trabalhadores: sob consulta comercial.')
        return
      }
    }

    const wa = whatsapp.replace(/\D/g, '')
    if (wa.length < 10) {
      setError('Informe WhatsApp com DDD (mín. 10 dígitos).')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/billing/commercial-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: { nr01: modNr01, pentagrama: modPentagrama },
          tierId: modNr01 ? effectiveTier : undefined,
          pentagramaPlanId: modPentagrama ? effectivePentPlan : undefined,
          billingMode: modNr01 ? billingMode : undefined,
          includePentagrama: showUpsell && includePentagramaUpsell,
          headcountDeclared: headcount,
          notes: notes || undefined,
          clientCnpj: cnpj,
          companyCnpjSlots: parseCompanyCnpjSlots(companyCnpjSlots),
          clientWhatsapp: wa,
          ...(showClientFields
            ? {
                targetUserEmail: targetEmail.trim(),
                targetUserName: targetName.trim() || undefined,
                autoInvite,
              }
            : {
                targetUserEmail: userEmail,
                targetUserName: targetName.trim() || undefined,
                autoInvite: selfLicense ? false : true,
              }),
          commercialPlan: plan,
        }),
      })
      const data = (await res.json()) as {
        error?: string
        invoice?: { invoice_number: string }
        inviteSent?: boolean
        emailSent?: boolean
      }
      if (!res.ok) throw new Error(data.error ?? 'Falha ao emitir fatura')
      const accessNote =
        data.emailSent || data.inviteSent
          ? ' E-mail com link para criar senha enviado (módulos liberados após pagamento confirmado).'
          : ''
      setSuccess(
        `Fatura ${data.invoice?.invoice_number} emitida.${accessNote}`,
      )
      setTimeout(() => router.push('/faturas'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6">
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">Módulos contratados</legend>
        <p className="mt-1 text-xs text-zinc-500">Pode marcar os dois. O upsell Pentagrama só aparece se contratar só NR-01.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
              modNr01 ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-zinc-200'
            }`}
          >
            <input
              type="checkbox"
              className="mr-2"
              checked={modNr01}
              onChange={(e) => toggleModule('nr01', e.target.checked)}
            />
            <span className="font-semibold">NR-01</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Pesquisa psicossocial regulatória</span>
          </label>
          <label
            className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
              modPentagrama ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-200' : 'border-zinc-200'
            }`}
          >
            <input
              type="checkbox"
              className="mr-2"
              checked={modPentagrama}
              onChange={(e) => toggleModule('pentagrama', e.target.checked)}
            />
            <span className="font-semibold">Pentagrama de Ginger</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Diagnóstico IL + IC</span>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">CNPJ principal (1ª empresa) *</label>
          <input
            type="text"
            inputMode="numeric"
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              cnpjError ? 'border-red-400' : 'border-zinc-300'
            }`}
            placeholder="00.000.000/0001-00"
            value={cnpj}
            onChange={(e) => {
              setCnpj(e.target.value)
              if (cnpjError) setCnpjError(null)
            }}
            onBlur={validateCnpjOnExit}
            required
          />
          {cnpjError && <p className="mt-1 text-xs text-red-600">{cnpjError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Qtd. empresas (CNPJs) no contrato *
          </label>
          <input
            type="number"
            min={1}
            max={COMPANY_CNPJ_SLOTS_MAX}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={companyCnpjSlots}
            onChange={(e) =>
              setCompanyCnpjSlots(parseCompanyCnpjSlots(Number(e.target.value)))
            }
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            {selfLicense
              ? 'Quantos CNPJs você poderá cadastrar após o pagamento (B2B = grupos como Pasola).'
              : 'Cada plano cobre 1 CNPJ. Grupos multi-empresa: informe a quantidade total de CNPJs.'}
          </p>
        </div>

        {showClientFields ? (
          <>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">E-mail do cliente *</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Nome / razão social</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>
          </>
        ) : (
          <p className="sm:col-span-2 text-sm text-zinc-600">
            Fatura em seu nome: <span className="font-medium">{userEmail}</span>
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700">WhatsApp *</label>
          <input
            type="tel"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="27999999999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Nº trabalhadores</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value))}
          />
        </div>
      </div>

      {showClientFields && (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoInvite}
            onChange={(e) => setAutoInvite(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Criar acesso e enviar link de senha por e-mail</span>
            <span className="block text-xs text-zinc-500">
              Sem confirmação dupla no Supabase. Módulos ficam bloqueados até a fatura ser marcada como paga.
            </span>
          </span>
        </label>
      )}

      {modNr01 && (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700">Modalidade NR-01</legend>
            {(['anual_parcelado', 'anual_vista'] as const).map((mode) => (
              <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="billing"
                  checked={billingMode === mode}
                  onChange={() => setBillingMode(mode)}
                />
                {formatBillingLabel(mode)}
              </label>
            ))}
          </fieldset>

          {showUpsell && (
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-sm">
              <input
                type="checkbox"
                checked={includePentagramaUpsell}
                onChange={(e) => setIncludePentagramaUpsell(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Upsell: {PENTAGRAMA_GINGER_ADDON.shortLabel}</span>
                <span className="block text-xs text-zinc-600">
                  +50% sobre a base NR-01 (diagnóstico organizacional). Desmarque se já incluiu o módulo Pentagrama acima.
                </span>
              </span>
            </label>
          )}

          <p className="text-xs text-zinc-500">{NR01_RT_NOTICE}</p>
        </>
      )}

      {modPentagrama && pentPlan && (
        <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-900">
          Pentagrama · {pentPlan.name}: {pentPlan.summary}
        </p>
      )}

      {totalCentsFixed != null && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">
            Total: {formatBrl(totalCentsFixed)}
            {modNr01 && billingMode === 'anual_parcelado' && pricing && (
              <span className="font-normal text-zinc-600">
                {' '}
                · NR-01 12× de {formatBrl(pricing.installmentCents)}
              </span>
            )}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700">Observações</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || totalCentsFixed == null || Boolean(cnpjError)}
        className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
      >
        {submitting ? 'Emitindo…' : 'Emitir fatura comercial'}
      </button>
    </form>
  )
}
