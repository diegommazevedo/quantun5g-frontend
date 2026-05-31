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

export default async function EmpresasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: companies } = await supabase
    .from('companies')
    .select(COMPANY_GRID_SELECT)
    .eq('consultant_id', user.id)
    .order('name')

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
            Cadastro único para Pentagrama e NR-01: CNPJ, RT assinante e liderança IL.
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

      <EmpresaGrid empresas={empresas} mode="manage" product="unified" />
    </div>
  )
}
