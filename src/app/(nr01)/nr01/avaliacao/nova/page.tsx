/**
 * QUANTUM5G — NR-01 · Nova avaliação — Passo 1: escolher empresa (obrigatório)
 */

import Link from 'next/link'
import { requireNr01LicenseOrRedirect } from '@/lib/nr01/require-license'
import { EmpresaGrid } from '@/components/nr01/EmpresaGrid'
import { enrichCompaniesWithIlCounts } from '@/lib/companies/enrich'
import { COMPANY_GRID_SELECT } from '@/lib/companies/grid-select'
import { fetchCompaniesForActor } from '@/lib/companies/list-for-actor'
import { getPageActor } from '@/lib/org/page-actor'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { staffLinkProps } from '@/lib/navigation/link-props'
import { NovaAvaliacaoSteps } from '@/components/nr01/NovaAvaliacaoSteps'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NovaAvaliacaoEscolherEmpresaPage({ searchParams }: Props) {
  const { error } = await searchParams
  const { user, role, profile, userClient, db } = await getPageActor()

  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)

  await requireNr01LicenseOrRedirect({
    userId: user.id,
    role,
    moduleNr01: profile?.module_nr01,
  })

  const { data: companies } = await fetchCompaniesForActor(
    userClient,
    user.id,
    role,
    COMPANY_GRID_SELECT,
  )

  const empresas = await enrichCompaniesWithIlCounts(db, (companies ?? []) as never[])

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/nr01/dashboard"
          {...staffLinkProps}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
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
            {isContratante || isGerente ? 'Empresas do grupo' : 'Empresas cadastradas'}
          </h2>
          {!isGerente && (
            <Link
              href="/empresas/nova?retorno=/nr01/avaliacao/nova"
              {...staffLinkProps}
              className="inline-flex items-center justify-center rounded-lg border-2 border-blue-800 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
            >
              {isContratante ? '+ Cadastrar meu CNPJ' : '+ Cadastrar nova empresa'}
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <strong>Usar empresa já cadastrada:</strong> busque na grade e clique em{' '}
          <em>Usar esta empresa</em>.
          {isContratante && (
            <span className="block mt-1 text-blue-800/90">
              Sem CNPJ cadastrado? Clique em <strong>+ Cadastrar meu CNPJ</strong> acima.
            </span>
          )}
        </div>

        <EmpresaGrid
          empresas={empresas}
          mode="picker"
          product="nr01"
          retornoPicker="/nr01/avaliacao/nova"
          hideEmptyCadastro={isGerente}
          emptyHint={
            isGerente
              ? 'Nenhuma empresa atribuída ao seu perfil. Peça ao contratante do grupo.'
              : isContratante
                ? 'Nenhum CNPJ cadastrado ainda. Clique em "+ Cadastrar meu CNPJ" acima.'
                : 'Cadastre a empresa do cliente antes de abrir a avaliação NR-01.'
          }
        />
      </section>

      <p className="text-center text-xs text-zinc-400">
        Gestão completa em{' '}
        <Link href="/empresas" {...staffLinkProps} className="text-blue-800 hover:underline">
          Empresas
        </Link>
      </p>
    </div>
  )
}
