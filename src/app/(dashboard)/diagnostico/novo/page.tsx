/**
 * QUANTUM5G — TELA-03: Criar diagnóstico
 * Formulário para configurar empresa, líder e prazos.
 */

import { criarDiagnostico } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NovoDiagnosticoPage({ searchParams }: Props) {
  const { error } = await searchParams

  // Data de hoje para valor mínimo dos prazos
  const hoje = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Novo diagnóstico</h1>
        <p className="text-zinc-500 mt-1">
          Configure a empresa, o líder e os prazos de aplicação.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}

      <form action={criarDiagnostico} className="space-y-8">
        {/* Seção: Empresa */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Empresa
          </legend>

          <div className="space-y-1.5">
            <label htmlFor="nome_empresa" className="block text-sm font-medium text-zinc-700">
              Nome da empresa <span className="text-red-500">*</span>
            </label>
            <input
              id="nome_empresa"
              name="nome_empresa"
              type="text"
              required
              placeholder="Ex: Empresa Exemplo Ltda"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="total_colaboradores" className="block text-sm font-medium text-zinc-700">
              Total de colaboradores
              <span className="text-zinc-400 font-normal ml-1">(usado para k-anonymity)</span>
            </label>
            <input
              id="total_colaboradores"
              name="total_colaboradores"
              type="number"
              min="1"
              placeholder="Ex: 25"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </fieldset>

        {/* Seção: Diagnóstico */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Diagnóstico
          </legend>

          <div className="space-y-1.5">
            <label htmlFor="nome_diagnostico" className="block text-sm font-medium text-zinc-700">
              Nome do diagnóstico <span className="text-red-500">*</span>
            </label>
            <input
              id="nome_diagnostico"
              name="nome_diagnostico"
              type="text"
              required
              placeholder="Ex: Diagnóstico Q1 2026"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </fieldset>

        {/* Seção: Líder */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Liderança
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="leader_name" className="block text-sm font-medium text-zinc-700">
                Nome do líder
              </label>
              <input
                id="leader_name"
                name="leader_name"
                type="text"
                placeholder="Ex: João Silva"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="leader_email" className="block text-sm font-medium text-zinc-700">
                E-mail do líder
              </label>
              <input
                id="leader_email"
                name="leader_email"
                type="email"
                placeholder="lider@empresa.com"
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>
        </fieldset>

        {/* Seção: Prazos */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">
            Prazos
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="il_deadline" className="block text-sm font-medium text-zinc-700">
                Prazo para IL
                <span className="text-zinc-400 font-normal ml-1">(liderança)</span>
              </label>
              <input
                id="il_deadline"
                name="il_deadline"
                type="date"
                min={hoje}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ic_deadline" className="block text-sm font-medium text-zinc-700">
                Prazo para IC
                <span className="text-zinc-400 font-normal ml-1">(colaboradores)</span>
              </label>
              <input
                id="ic_deadline"
                name="ic_deadline"
                type="date"
                min={hoje}
                className="block w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 active:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900/30"
          >
            Criar diagnóstico
          </button>
          <a
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  )
}
