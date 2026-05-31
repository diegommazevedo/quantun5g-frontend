/**
 * QUANTUM5G — NR-01 · Nova avaliação — Passo 1: escolher empresa (obrigatório)
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireNr01LicenseOrRedirect } from '@/lib/nr01/require-license'
import type { UserRole } from '@/types/database'
import { EmpresaGrid } from '@/components/nr01/EmpresaGrid'
import { enrichCompaniesWithIlCounts } from '@/lib/companies/enrich'
import { COMPANY_GRID_SELECT } from '@/lib/companies/grid-select'
import { NovaAvaliacaoSteps } from '@/components/nr01/NovaAvaliacaoSteps'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NovaAvaliacaoEscolherEmpresaPage({ searchParams }: Props) {
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
  await requireNr01LicenseOrRedirect({ userId: user.id, role })

  let companiesQuery = supabase.from('companies').select(COMPANY_GRID_SELECT).order('name')
  if (role === 'leader') {
    companiesQuery = companiesQuery.eq('account_user_id', user.id)
  } else if (role !== 'admin') {
    companiesQuery = companiesQuery.eq('consultant_id', user.id)
  }

  const { data: companies } = await companiesQuery

  const empresas = await enrichCompaniesWithIlCounts(supabase, (companies ?? []) as never[])

  return (
    <div className="space-y-8">
      <div>
        <Link href="/nr01/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Painel NR-01
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Nova avaliação NR-01</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Toda avaliação pertence a uma empresa cadastrada. Primeiro escolha a organização
          avaliada; em seguida você define período e coleta. O RT assinante vem do cadastro da empresa.
        </p>
      </div>

      <NovaAvaliacaoSteps step={1} />

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
            href="/empresas/nova?retorno=/nr01/avaliacao/nova"
            className="inline-flex items-center justify-center rounded-lg border-2 border-blue-800 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
          >
            + Cadastrar nova empresa
          </Link>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <strong>Usar empresa já cadastrada:</strong> busque na grade e clique em{' '}
          <em>Usar esta empresa</em>.{' '}
          <strong className="block sm:inline sm:ml-1">
            Primeira vez com o cliente?
          </strong>{' '}
          Cadastre com CNPJ válido e RT assinante — evita duplicidade no laudo.
        </div>

        <EmpresaGrid
          empresas={empresas}
          mode="picker"
          product="nr01"
          retornoPicker="/nr01/avaliacao/nova"
          emptyHint="Cadastre a empresa do cliente antes de abrir a avaliação NR-01."
        />
      </section>

      <p className="text-center text-xs text-zinc-400">
        Gestão completa em{' '}
        <Link href="/empresas" className="text-blue-800 hover:underline">
          Empresas
        </Link>
      </p>
    </div>
  )
}
