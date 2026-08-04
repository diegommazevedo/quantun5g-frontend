import Link from 'next/link'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { formatCnpjDisplay } from '@/lib/companies/cnpj'

import {

  findCompanyPendingRtOnboarding,

  findContratanteOnboardingGap,

} from '@/lib/nr01/rt-onboarding-gate'

import { licensedCnpjFromMetadata, loadActiveNr01Subscription } from '@/lib/nr01/licensed-cnpj'

import { NR01_RT_NOTICE } from '@/lib/billing/nr01-catalog'

import { isContratanteRole } from '@/lib/org/roles'

import {

  confirmarEmpresaLicenciada,

  resolverEmpresaLicenciadaNoOnboarding,

  salvarRtOnboarding,

} from './actions'

import type { UserRole } from '@/types/database'



interface Props {

  searchParams: Promise<{ error?: string; welcome?: string }>

}



export const metadata = {

  title: 'Configurar NR-01 · Quantum5G',

  description: 'Confirme a empresa licenciada e cadastre o responsável técnico assinante do laudo NR-01.',

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

  if (!profile?.module_nr01) redirect('/checkout/nr01?hint=licenca')



  const gap = await findContratanteOnboardingGap(user.id)

  if (gap === 'none') redirect('/nr01/dashboard?welcome=1')



  if (gap === 'needs_company') {

    const resolved = await resolverEmpresaLicenciadaNoOnboarding(user.id, profile?.email ?? null)

    if (resolved.gap === 'needs_rt') {

      redirect('/nr01/onboarding')

    }



    const subscription = await loadActiveNr01Subscription(user.id)

    const licensedCnpj = resolved.licensedCnpj ?? licensedCnpjFromMetadata(subscription?.metadata ?? null)

    const orderId =

      subscription?.metadata && typeof subscription.metadata === 'object'

        ? String((subscription.metadata as Record<string, unknown>).kiwify_order_id ?? '')

        : ''



    if (!licensedCnpj) {

      return (

        <div className="mx-auto min-h-dvh max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white">

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quantum5G NR-01</p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight">CNPJ não vinculado à licença</h1>

          <p className="mt-2 text-sm text-slate-300">

            Sua licença está ativa, mas o <strong className="text-white">CNPJ empresarial</strong> não consta no

            registro da compra. Por auditoria e controle anti-fraude, o CNPJ só pode ser informado no{' '}

            <strong className="text-white">checkout Kiwify</strong> — não é possível cadastrá-lo manualmente aqui.

          </p>



          {error && (

            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">

              {decodeURIComponent(error)}

            </div>

          )}



          <div className="mt-8 space-y-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-100">

            <p>

              <strong className="text-white">Compras anteriores ao campo CNPJ:</strong> refaça o checkout simulado

              (R$ 5) informando o CNPJ correto, ou envie comprovante + CNPJ para{' '}

              <a href="mailto:suporte@quantum5g.app" className="underline">

                suporte@quantum5g.app

              </a>

              .

            </p>

            {orderId ? (

              <p className="font-mono text-xs text-amber-200/80">Pedido Kiwify: {orderId}</p>

            ) : null}

          </div>



          <p className="mt-6 text-center text-xs text-slate-500">

            <Link href="/checkout/nr01" className="text-slate-300 underline hover:text-white">

              Contratar licença NR-01

            </Link>

          </p>

        </div>

      )

    }



    const cnpjLabel = formatCnpjDisplay(licensedCnpj)



    return (

      <div className="mx-auto min-h-dvh max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white">

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quantum5G NR-01</p>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">Empresa licenciada</h1>

        <p className="mt-2 text-sm text-slate-300">

          O CNPJ abaixo veio do checkout e está <strong className="text-white">vinculado à sua licença paga</strong>.

          Não pode ser alterado após a compra (auditoria MTE / controle de extravio).

        </p>



        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm">

          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">CNPJ licenciado</p>

          <p className="mt-1 font-mono text-lg text-white">{cnpjLabel}</p>

        </div>



        {error && (

          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">

            {decodeURIComponent(error)}

          </div>

        )}



        <form

          action={confirmarEmpresaLicenciada}

          className="mt-8 space-y-5 rounded-xl border border-slate-700 bg-slate-900/40 p-6"

        >

          <div className="space-y-1.5">

            <label htmlFor="company_name" className="block text-sm font-medium text-slate-200">

              Razão social ou nome fantasia

            </label>

            <input

              id="company_name"

              name="company_name"

              defaultValue={profile?.name ?? ''}

              placeholder="Nome da empresa"

              className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"

            />

          </div>



          <button

            type="submit"

            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"

          >

            Confirmar empresa e continuar para o RT

          </button>

        </form>

      </div>

    )

  }



  const pending = await findCompanyPendingRtOnboarding(user.id)

  if (!pending) redirect('/nr01/dashboard?welcome=1')



  const cnpjLabel = pending.cnpj ? formatCnpjDisplay(pending.cnpj) : '—'



  return (

    <div className="mx-auto min-h-dvh max-w-lg bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white">

      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quantum5G NR-01</p>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Último passo antes do painel</h1>

      <p className="mt-2 text-sm text-slate-300">

        Sua licença está ativa. Cadastre o <strong className="text-white">responsável técnico (RT)</strong> que

        assinará o laudo perante o MTE. Em seguida abriremos a coleta NR-01 e enviaremos os convites

        automaticamente.

      </p>



      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm">

        <p className="font-medium text-slate-200">{pending.name}</p>

        <p className="mt-1 text-slate-400">

          CNPJ licenciado <span className="font-mono text-slate-300">{cnpjLabel}</span>

        </p>

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



        <div className="space-y-1.5">

          <label htmlFor="collaborator_emails" className="block text-sm font-medium text-slate-200">

            E-mails dos colaboradores (opcional)

          </label>

          <textarea

            id="collaborator_emails"

            name="collaborator_emails"

            rows={4}

            placeholder={'um e-mail por linha\nMaria Silva <maria@empresa.com>\njoao@empresa.com'}

            className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"

          />

          <p className="text-xs text-slate-500">

            Se informar, cadastramos a equipe e enviamos o link anônimo de coleta automaticamente.

          </p>

        </div>



        <button

          type="submit"

          className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"

        >

          Concluir e abrir coleta NR-01

        </button>

      </form>



      <p className="mt-6 text-center text-xs text-slate-500">

        CNPJ vinculado à licença paga — alterações somente via{' '}

        <a href="mailto:suporte@quantum5g.app" className="text-slate-300 underline hover:text-white">

          suporte

        </a>

        .

      </p>

    </div>

  )

}


