/**
 * QUANTUM5G — Pentagrama · Novo diagnóstico — Passo 2
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database'
import { NovoDiagnosticoSteps } from '@/components/pentagrama/NovoDiagnosticoSteps'
import { criarDiagnostico } from '../actions'
import { formatCnpjDisplay } from '@/lib/companies/cnpj'
import { companyHasTechnicalLead, formatTechnicalLeadLine, technicalLeadFromCompany } from '@/lib/nr01/technical-lead'
import { companyHasIlLeader } from '@/lib/pentagrama/il-leader'
import { isValidCnpj } from '@/lib/companies/cnpj'
import { CompetenciaSurveyFields } from '@/components/survey/CompetenciaSurveyFields'
import { fetchNextCompetenciaSeq } from '@/lib/survey/competencia-db'
import {
  addDaysISO,
  defaultCompetenciaPeriod,
  localDateISO,
} from '@/lib/survey/competencia'

interface Props {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function NovoDiagnosticoDadosPage({ params, searchParams }: Props) {
  const { companyId } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: companyData } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('consultant_id', user.id)
    .single()

  if (!companyData) notFound()
  const empresa = companyData as Company

  const { data: leadersData } = await supabase
    .from('company_contacts')
    .select('id, full_name, email')
    .eq('company_id', companyId)
    .eq('contact_role', 'leader')
    .eq('is_active', true)
    .order('created_at')

  const leaders = (leadersData ?? []) as Array<{ id: string; full_name: string; email: string }>

  const rt = technicalLeadFromCompany(empresa)
  const cnpjOk = Boolean(empresa.cnpj && isValidCnpj(empresa.cnpj))
  const rtOk = companyHasTechnicalLead(empresa)
  const ilOk = leaders.length > 0
  const ready = cnpjOk && rtOk && ilOk
  const hoje = localDateISO()
  const fimDefault = addDaysISO(hoje, 15)
  const nextSeq = await fetchNextCompetenciaSeq(supabase, companyId, 'pentagrama')
  const { mmYyyy } = defaultCompetenciaPeriod()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/diagnostico/novo" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Trocar empresa
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Novo diagnóstico</h1>
      </div>

      <NovoDiagnosticoSteps step={2} companyName={empresa.name} />

      <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-800">Empresa</p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{empresa.name}</p>
        <dl className="mt-2 space-y-1 text-xs text-zinc-600">
          <div>
            <span className="font-medium">CNPJ: </span>
            {cnpjOk ? (
              <span className="font-mono">{formatCnpjDisplay(empresa.cnpj!)}</span>
            ) : (
              <span className="text-amber-700">Pendente</span>
            )}
          </div>
          <div>
            <span className="font-medium">RT assinante: </span>
            {rt ? formatTechnicalLeadLine(rt) : <span className="text-amber-700">Pendente</span>}
          </div>
          <div>
            <span className="font-medium">Liderança IL: </span>
            {ilOk ? `${leaders.length || 1} cadastrado(s)` : <span className="text-amber-700">Pendente</span>}
          </div>
        </dl>
        <Link
          href={`/empresas/${empresa.id}?retorno=/diagnostico/novo/${empresa.id}`}
          className="mt-2 inline-block text-xs text-zinc-900 hover:underline"
        >
          Editar cadastro unificado da empresa
        </Link>
      </div>

      {!ready && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete o cadastro unificado: CNPJ válido, RT assinante e ao menos um líder IL.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={criarDiagnostico} className="space-y-8">
        <input type="hidden" name="company_id" value={empresa.id} />

        <fieldset className="space-y-4" disabled={!ready}>
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Diagnóstico
          </legend>

          <CompetenciaSurveyFields
            module="pentagrama"
            nextSeq={nextSeq}
            defaultPeriod={mmYyyy}
            pesquisaInicioDefault={hoje}
            pesquisaFimDefault={fimDefault}
            disabled={!ready}
          />

          {leaders.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="il_leader_id" className="block text-sm font-medium text-zinc-700">
                Líder que receberá o link IL nesta rodada *
              </label>
              <select
                id="il_leader_id"
                name="il_leader_id"
                required
                defaultValue={leaders[0]?.id}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              >
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} — {l.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={!ready}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Criar diagnóstico
          </button>
          <Link href="/diagnostico/novo" className="text-sm text-zinc-500 hover:text-zinc-900">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
