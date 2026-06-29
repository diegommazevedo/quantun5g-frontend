/**
 * QUANTUM5G — Empresas (cadastro unificado NR-01 + Pentagrama)
 */

import Link from 'next/link'
import type { Company } from '@/types/database'
import { EmpresaGrid } from '@/components/nr01/EmpresaGrid'
import { enrichCompaniesWithIlCounts } from '@/lib/companies/enrich'
import { COMPANY_GRID_SELECT } from '@/lib/companies/grid-select'
import { fetchCompaniesForActor } from '@/lib/companies/list-for-actor'
import { getPageActor } from '@/lib/org/page-actor'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { isLicensingV2 } from '@/lib/licensing/model'
import {
  getCompanyCnpjSlotsUsageForActor,
  getCompanyCnpjSlotsUsageForOrg,
} from '@/lib/licensing/company-cnpj-slots'
import { loadContratanteOrgScope } from '@/lib/org/contratante-scope'
import { CnpjSlotsBanner } from '@/components/licensing/CnpjSlotsBanner'

interface Props {
  searchParams: Promise<{ saved?: string; nome?: string }>
}

export default async function EmpresasPage({ searchParams }: Props) {
  const { saved, nome } = await searchParams
  const { user, role, userClient, db } = await getPageActor()

  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)
  let slotsUsage = null
  if (isLicensingV2() && role === 'consultant') {
    slotsUsage = await getCompanyCnpjSlotsUsageForActor(user.id)
  } else if (isLicensingV2() && isContratante) {
    const scope = await loadContratanteOrgScope(user.id)
    if (scope.org) {
      slotsUsage = await getCompanyCnpjSlotsUsageForOrg(user.id, scope.org.id)
    }
  }

  const { data: companies, error: listErr } = await fetchCompaniesForActor<Company>(
    userClient,
    user.id,
    role,
    COMPANY_GRID_SELECT,
  )
  if (listErr) {
    console.error('[empresas] list:', listErr.message)
  }

  const empresas = await enrichCompaniesWithIlCounts(db, (companies ?? []) as Company[])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Painel
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">
            {isContratante || isGerente ? 'Empresas do grupo' : 'Empresas'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isContratante
              ? 'CNPJs do seu grupo. Cadastre suas empresas para criar avaliações NR-01.'
              : isGerente
                ? 'Empresas atribuídas ao seu perfil de gerente.'
                : 'Cadastro único para Pentagrama e NR-01: CNPJ, RT assinante e contatos IL (pesquisa).'}
          </p>
        </div>
        {!isGerente && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/empresas/nova"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              {isContratante ? 'Cadastrar CNPJ' : 'Nova empresa'}
            </Link>
          </div>
        )}
      </div>

      {saved === '1' ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {nome
            ? `Empresa “${decodeURIComponent(nome)}” atualizada com sucesso.`
            : 'Alterações salvas com sucesso.'}
        </div>
      ) : null}

      {slotsUsage ? <CnpjSlotsBanner usage={slotsUsage} /> : null}

      <EmpresaGrid
        empresas={empresas}
        mode="manage"
        product="unified"
        hideEmptyCadastro={isGerente}
        emptyHint={
          isGerente
            ? 'Nenhuma empresa atribuída ao seu perfil. Peça ao contratante do grupo.'
            : isContratante
              ? 'Nenhum CNPJ cadastrado ainda. Clique em "Cadastrar CNPJ" para começar.'
              : undefined
        }
      />
    </div>
  )
}
