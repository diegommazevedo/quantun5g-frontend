/**
 * QUANTUM5G — NR-01 · Nova avaliação — Passo 2: dados da avaliação (empresa fixa)
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database'
import type { UserRole } from '@/types/database'
import { NovaAvaliacaoSteps } from '@/components/nr01/NovaAvaliacaoSteps'
import { criarAvaliacaoNr01 } from '../actions'
import { isValidCnpj, formatCnpjDisplay } from '@/lib/companies/cnpj'
import {
  companyHasTechnicalLead,
  formatTechnicalLeadLine,
  technicalLeadFromCompany,
} from '@/lib/nr01/technical-lead'
import { CompetenciaSurveyFields } from '@/components/survey/CompetenciaSurveyFields'
import { fetchNextCompetenciaSeq } from '@/lib/survey/competencia-db'
import { fetchCompanyForActor } from '@/lib/companies/list-for-actor'
import {
  addDaysISO,
  defaultCompetenciaPeriod,
  localDateISO,
} from '@/lib/survey/competencia'

interface Props {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function NovaAvaliacaoDadosPage({ params, searchParams }: Props) {
  const { companyId } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'

  const { data: companyData } = await fetchCompanyForActor<Company>(
    supabase,
    user.id,
    role,
    companyId,
    '*',
  )

  if (!companyData) notFound()
  const empresa = companyData
  const rt = technicalLeadFromCompany(empresa)
  const cnpjOk = Boolean(empresa.cnpj && isValidCnpj(empresa.cnpj))
  const rtOk = companyHasTechnicalLead(empresa)
  const ready = cnpjOk && rtOk

  const { data: diagnostics } = await supabase
    .from('diagnostics')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(20)
  const diagsList = (diagnostics ?? []) as Array<{ id: string; name: string; company_id: string }>

  const hoje = localDateISO()
  const fimDefault = addDaysISO(hoje, 15)
  const nextSeq = await fetchNextCompetenciaSeq(supabase, companyId, 'nr01')
  const { mmYyyy } = defaultCompetenciaPeriod()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/nr01/avaliacao/nova" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Trocar empresa
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Nova avaliação NR-01</h1>
      </div>

      <NovaAvaliacaoSteps step={2} companyName={empresa.name} />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Empresa selecionada
        </p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{empresa.name}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600">
          <div>
            <dt className="inline font-medium">CNPJ: </dt>
            <dd className="inline font-mono">
              {cnpjOk ? formatCnpjDisplay(empresa.cnpj!) : <span className="text-amber-700">Pendente</span>}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Colaboradores: </dt>
            <dd className="inline">{empresa.total_collaborators}</dd>
          </div>
          {empresa.rh_contact_name && (
            <div className="col-span-2">
              <dt className="inline font-medium">RH: </dt>
              <dd className="inline">
                {empresa.rh_contact_name}
                {empresa.rh_contact_email ? ` · ${empresa.rh_contact_email}` : ''}
              </dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="inline font-medium">RT assinante: </dt>
            <dd className="inline">
              {rt ? formatTechnicalLeadLine(rt) : '—'}
            </dd>
          </div>
        </dl>
        <Link
          href={`/empresas/${empresa.id}?retorno=/nr01/avaliacao/nova/${empresa.id}`}
          className="mt-2 inline-block text-xs text-blue-800 hover:underline"
        >
          Editar cadastro da empresa
        </Link>
      </div>

      {!ready && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete o cadastro unificado: <strong>CNPJ válido</strong> e <strong>RT assinante</strong> na ficha da empresa
          antes de criar a avaliação. O RT desta empresa constará no laudo e no PDF após o processamento.
          <Link
            href={`/empresas/${empresa.id}?retorno=/nr01/avaliacao/nova/${empresa.id}`}
            className="mt-2 block font-semibold text-blue-800 hover:underline"
          >
            Completar cadastro do RT →
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={criarAvaliacaoNr01} className="space-y-8">
        <input type="hidden" name="company_id" value={empresa.id} />

        <fieldset className="space-y-4" disabled={!ready}>
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Avaliação
          </legend>
          <p className="text-xs text-zinc-500">
            Estado inicial <code>CRIADO</code>. Após gerar o link de coleta, passa para{' '}
            <code>COLETANDO</code>.
          </p>

          <CompetenciaSurveyFields
            module="nr01"
            nextSeq={nextSeq}
            defaultPeriod={mmYyyy}
            pesquisaInicioDefault={hoje}
            pesquisaFimDefault={fimDefault}
            disabled={!ready}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modality" className="block text-sm font-medium text-zinc-700">
                Modalidade
              </label>
              <select
                id="modality"
                name="modality"
                defaultValue="WEB"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="WEB">Web (link único)</option>
                <option value="QR">QR Code impresso</option>
                <option value="WHATSAPP">WhatsApp guiado</option>
                <option value="KIOSK">Kiosk presencial</option>
                <option value="PAPER">Papel (digitalizado)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="expected_respondents" className="block text-sm font-medium text-zinc-700">
                Respondentes esperados
              </label>
              <input
                id="expected_respondents"
                name="expected_respondents"
                type="number"
                min="3"
                placeholder="Ex: 180"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4" disabled={!ready}>
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Cruzamento Pentagrama (opcional)
          </legend>
          <div className="space-y-1.5">
            <label htmlFor="linked_diagnostic_id" className="block text-sm font-medium text-zinc-700">
              Vincular diagnóstico da mesma empresa
            </label>
            <select
              id="linked_diagnostic_id"
              name="linked_diagnostic_id"
              defaultValue=""
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">— Sem vínculo —</option>
              {diagsList.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset className="space-y-4" disabled={!ready}>
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Privacidade e laudo
          </legend>
          <p className="text-xs text-zinc-500">
            O RT assinante vem do cadastro da empresa e será congelado no laudo ao processar os resultados.
          </p>
          <div className="space-y-1.5 sm:max-w-xs">
            <label htmlFor="k_anonymity_min" className="block text-sm font-medium text-zinc-700">
              k-anonymity mínimo
            </label>
            <input
              id="k_anonymity_min"
              name="k_anonymity_min"
              type="number"
              min="3"
              defaultValue="5"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>
        </fieldset>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!ready}
            className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Criar avaliação
          </button>
          <Link href="/nr01/avaliacao/nova" className="text-sm text-zinc-500 hover:text-zinc-900">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
