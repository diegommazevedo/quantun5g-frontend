/**
 * QUANTUM5G — NR-01 · Nova avaliação
 * Form para criar uma avaliação reusando company existente OU criando uma nova.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database'
import { criarAvaliacaoNr01 } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NovaAvaliacaoNr01Page({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Empresas do consultor (para reuso)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, total_collaborators, consultant_id, created_at, updated_at')
    .order('name')
  const empresas = (companies ?? []) as Company[]

  // Diagnósticos abertos (para vínculo opcional ao Pentagrama)
  const { data: diagnostics } = await supabase
    .from('diagnostics')
    .select('id, name, company_id')
    .order('created_at', { ascending: false })
    .limit(20)
  const diagsList = (diagnostics ?? []) as Array<{ id: string; name: string; company_id: string }>

  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Nova avaliação NR-01</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cria a avaliação no estado <code>CRIADO</code>. Após gerar o link, o status
          muda para <code>COLETANDO</code> automaticamente.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={criarAvaliacaoNr01} className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Empresa
          </legend>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">
              Selecionar empresa existente
            </label>
            <select
              name="company_id"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              defaultValue=""
            >
              <option value="">— Criar empresa nova abaixo —</option>
              {empresas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.total_collaborators} colab.)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="new_company_name" className="block text-sm font-medium text-zinc-700">
                Nome de empresa nova
              </label>
              <input
                id="new_company_name"
                name="new_company_name"
                type="text"
                placeholder="Ex: Acme Indústrias"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new_company_total" className="block text-sm font-medium text-zinc-700">
                Total de trabalhadores
              </label>
              <input
                id="new_company_total"
                name="new_company_total"
                type="number"
                min="1"
                placeholder="Ex: 200"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Avaliação
          </legend>
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              Nome da avaliação <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Ex: Avaliação NR-01 Q2 2026"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="reference_period" className="block text-sm font-medium text-zinc-700">
                Período de referência
              </label>
              <input
                id="reference_period"
                name="reference_period"
                type="text"
                placeholder="Q2 2026"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div className="space-y-1.5">
              <label htmlFor="collection_opens_at" className="block text-sm font-medium text-zinc-700">
                Abertura
              </label>
              <input
                id="collection_opens_at"
                name="collection_opens_at"
                type="date"
                min={hoje}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="collection_closes_at" className="block text-sm font-medium text-zinc-700">
                Encerramento
              </label>
              <input
                id="collection_closes_at"
                name="collection_closes_at"
                type="date"
                min={hoje}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Cruzamento com Pentagrama (opcional)
          </legend>
          <div className="space-y-1.5">
            <label htmlFor="linked_diagnostic_id" className="block text-sm font-medium text-zinc-700">
              Vincular a um diagnóstico Pentagrama
              <span className="ml-1 font-normal text-zinc-400">(habilita análise comparativa)</span>
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

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Responsável técnico
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="technical_lead_crp" className="block text-sm font-medium text-zinc-700">
                CRP do responsável técnico
              </label>
              <input
                id="technical_lead_crp"
                name="technical_lead_crp"
                type="text"
                placeholder="Ex: CRP 06/123456"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
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
          </div>
        </fieldset>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            Criar avaliação
          </button>
          <a href="/nr01/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            Cancelar
          </a>
        </div>
      </form>
    </div>
  )
}
