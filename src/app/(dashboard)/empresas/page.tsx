/**
 * QUANTUM5G — Empresas (cadastro unificado NR-01 + Pentagrama)
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company } from '@/types/database'
import { EmpresaGrid } from '@/components/nr01/EmpresaGrid'
import { enrichCompaniesWithIlCounts } from '@/lib/companies/enrich'
import { COMPANY_GRID_SELECT } from '@/lib/companies/grid-select'
import { fetchCompaniesForActor } from '@/lib/companies/list-for-actor'
import { isLicensingV2 } from '@/lib/licensing/model'
import { getCompanyCnpjSlotsUsageForActor } from '@/lib/licensing/company-cnpj-slots'
import { CnpjSlotsBanner } from '@/components/licensing/CnpjSlotsBanner'
import { isPlatformStaff } from '@/lib/auth/roles'
import type { UserRole } from '@/types/database'

interface Props {
  searchParams: Promise<{ saved?: string; nome?: string }>
}

export default async function EmpresasPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { saved, nome } = await searchParams

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'
  const showSlots = isLicensingV2() && isPlatformStaff(role)
  const slotsUsage = showSlots ? await getCompanyCnpjSlotsUsageForActor(user.id) : null

  const { data: companies, error: listErr } = await fetchCompaniesForActor<Company>(
    supabase,
    user.id,
    role,
    COMPANY_GRID_SELECT,
  )
  if (listErr) {
    console.error('[empresas] list:', listErr.message)
  }

  const empresas = await enrichCompaniesWithIlCounts(supabase, (companies ?? []) as Company[])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Painel
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Empresas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cadastro único para Pentagrama e NR-01: CNPJ, RT assinante e contatos IL (pesquisa).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/empresas/nova"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Nova empresa
          </Link>
        </div>
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

      <EmpresaGrid empresas={empresas} mode="manage" product="unified" />
    </div>
  )
}
