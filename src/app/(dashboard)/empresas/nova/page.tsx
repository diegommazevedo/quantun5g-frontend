import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { criarEmpresa } from '@/app/(dashboard)/empresas/actions'
import { EmpresaFormFields } from '@/components/companies/EmpresaFormFields'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'
import { isPlatformStaff } from '@/lib/auth/roles'
import { isLicensingV2 } from '@/lib/licensing/model'
import type { UserRole } from '@/types/database'

interface Props {
  searchParams: Promise<{ error?: string; retorno?: string }>
}

export default async function NovaEmpresaPage({ searchParams }: Props) {
  const { error, retorno: retornoRaw } = await searchParams
  const retorno = safeRedirectPath(retornoRaw)
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
  const isStaff = isPlatformStaff(role)
  const showPayerEmail = isStaff && (!isLicensingV2() || role === 'admin')

  const voltarHref = retorno ?? '/empresas'

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={voltarHref} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Cadastrar empresa</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Mesma ficha para os dois módulos: CNPJ, RT, contatos IL (pesquisa) e colaboradores IC.
          NR-01 usa todos os contatos ativos no disparo.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={criarEmpresa} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6">
        {retorno ? <input type="hidden" name="retorno" value={retorno} /> : null}
        <EmpresaFormFields showPayerEmail={showPayerEmail} />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Salvar empresa
        </button>
      </form>
    </div>
  )
}
