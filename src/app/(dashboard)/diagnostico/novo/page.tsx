/**
 * QUANTUM5G — Pentagrama · Novo diagnóstico — Passo 1: escolher empresa
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmpresaGrid } from '@/components/nr01/EmpresaGrid'
import { enrichCompaniesWithIlCounts } from '@/lib/companies/enrich'
import { COMPANY_GRID_SELECT } from '@/lib/companies/grid-select'
import { NovoDiagnosticoSteps } from '@/components/pentagrama/NovoDiagnosticoSteps'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NovoDiagnosticoEscolherEmpresaPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: companies } = await supabase
    .from('companies')
    .select(COMPANY_GRID_SELECT)
    .eq('consultant_id', user.id)
    .order('name')

  const empresas = await enrichCompaniesWithIlCounts(supabase, (companies ?? []) as never[])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Novo diagnóstico</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Todo diagnóstico Pentagrama pertence a uma empresa cadastrada. Escolha a organização;
          em seguida defina nome, prazos e vínculo com o profissional IL (liderança).
        </p>
      </div>

      <NovoDiagnosticoSteps step={1} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-900">
            Empresas cadastradas
          </h2>
          <Link
            href="/empresas/nova?retorno=/diagnostico/novo"
            className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-900 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            + Cadastrar nova empresa
          </Link>
        </div>

        <div className="rounded-lg border border-purple-100 bg-purple-50/60 px-4 py-3 text-sm text-purple-900">
          <strong>Empresa já cadastrada:</strong> busque na grade e clique em{' '}
          <em>Usar esta empresa</em>. A ficha precisa ter <strong>RT assinante</strong> (nome + CRP)
          e <strong>líder IL</strong> (nome + e-mail) completos.
        </div>

        <EmpresaGrid
          empresas={empresas}
          mode="picker"
          product="pentagrama"
          retornoPicker="/diagnostico/novo"
          emptyHint="Cadastre a empresa do cliente antes de abrir o diagnóstico Pentagrama."
        />
      </section>

      <p className="text-center text-xs text-zinc-400">
        Gestão completa em{' '}
        <Link href="/empresas" className="text-zinc-900 hover:underline">
          Empresas
        </Link>
      </p>
    </div>
  )
}
