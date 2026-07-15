import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCnpjDisplay } from '@/lib/companies/cnpj'
import { findCompanyPendingRtOnboarding } from '@/lib/nr01/rt-onboarding-gate'
import { NR01_RT_NOTICE } from '@/lib/billing/nr01-catalog'
import { isContratanteRole } from '@/lib/org/roles'
import { salvarRtOnboarding } from './actions'
import type { UserRole } from '@/types/database'

interface Props {
  searchParams: Promise<{ error?: string; welcome?: string }>
}

export const metadata = {
  title: 'Configurar RT · Quantum5G NR-01',
  description: 'Cadastre o responsável técnico assinante do laudo NR-01.',
}

export default async function Nr01OnboardingPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, email, module_nr01')
    .eq('id', user.id)
    .returns<{ role: UserRole; name: string | null; email: string | null; module_nr01: boolean }[]>()
    .single()

  const role = (profile?.role ?? 'consultant') as UserRole
  if (!isContratanteRole(role)) redirect('/dashboard')
  if (!profile?.module_nr01) redirect('/faturas?hint=licenca')

  const pending = await findCompanyPendingRtOnboarding(user.id)
  if (!pending) redirect('/nr01/dashboard?welcome=1')

  const cnpjLabel = pending.cnpj ? formatCnpjDisplay(pending.cnpj) : '—'

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quantum5G NR-01</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Último passo antes do painel</h1>
      <p className="mt-2 text-sm text-slate-300">
        Sua licença está ativa. Cadastre o <strong className="text-white">responsável técnico (RT)</strong> que
        assinará o laudo perante o MTE.
      </p>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">
        <p className="font-medium text-slate-200">{pending.name}</p>
        <p className="mt-1 text-slate-400">CNPJ {cnpjLabel}</p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={salvarRtOnboarding} className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-slate-900/40 p-6">
        <input type="hidden" name="company_id" value={pending.id} />

        <div className="space-y-1.5">
          <label htmlFor="technical_lead_name" className="block text-sm font-medium text-slate-200">
            Nome completo do RT *
          </label>
          <input
            id="technical_lead_name"
            name="technical_lead_name"
            required
            defaultValue={profile?.name ?? ''}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="technical_lead_profession" className="block text-sm font-medium text-slate-200">
              Profissão
            </label>
            <input
              id="technical_lead_profession"
              name="technical_lead_profession"
              defaultValue="Psicólogo"
              className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="technical_lead_crp" className="block text-sm font-medium text-slate-200">
              CRP / CRM *
            </label>
            <input
              id="technical_lead_crp"
              name="technical_lead_crp"
              required
              placeholder="CRP 00/00000"
              className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="technical_lead_email" className="block text-sm font-medium text-slate-200">
            E-mail profissional do RT
          </label>
          <input
            id="technical_lead_email"
            name="technical_lead_email"
            type="email"
            defaultValue={profile?.email ?? ''}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
          />
        </div>

        <p className="text-xs leading-relaxed text-slate-400">{NR01_RT_NOTICE}</p>

        <button
          type="submit"
          className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          Concluir e abrir painel NR-01
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        Já cadastrou o RT?{' '}
        <Link href="/nr01/dashboard" className="text-slate-300 underline hover:text-white">
          Ir ao painel
        </Link>
      </p>
    </div>
  )
}
