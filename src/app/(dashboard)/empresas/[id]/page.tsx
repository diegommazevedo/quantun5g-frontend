import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company, CompanyContact } from '@/types/database'
import { atualizarEmpresa } from '@/app/(dashboard)/empresas/actions'
import { EmpresaFormFields } from '@/components/companies/EmpresaFormFields'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; retorno?: string }>
}

export default async function EditarEmpresaPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error, retorno: retornoRaw } = await searchParams
  const retorno = safeRedirectPath(retornoRaw)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .eq('consultant_id', user.id)
    .single()
  if (!data) notFound()
  const company = data as Company

  const { data: leadersData } = await supabase
    .from('company_contacts')
    .select('full_name, email, contact_role')
    .eq('company_id', id)
    .eq('contact_role', 'leader')
    .order('created_at')

  const ilLeaders =
    (leadersData ?? []).length > 0
      ? (leadersData as CompanyContact[]).map((l) => ({ name: l.full_name, email: l.email }))
      : company.il_leader_name && company.il_leader_email
        ? [{ name: company.il_leader_name, email: company.il_leader_email }]
        : []

  const { data: collabData } = await supabase
    .from('company_contacts')
    .select('full_name, email, job_title')
    .eq('company_id', id)
    .eq('contact_role', 'collaborator')
    .order('created_at')

  const collaborators = ((collabData ?? []) as CompanyContact[]).map((c) => ({
    full_name: c.full_name,
    email: c.email,
    job_title: c.job_title ?? undefined,
  }))

  const voltarHref = retorno ?? '/empresas'

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={voltarHref} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">{company.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Atualize dados compartilhados entre NR-01 e Pentagrama.</p>
        <Link
          href={`/empresas/${id}/equipe`}
          className="mt-2 inline-block text-sm font-medium text-zinc-900 hover:underline"
        >
          Gerenciar equipe e listas de e-mail →
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={atualizarEmpresa} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6">
        <input type="hidden" name="company_id" value={company.id} />
        {retorno ? <input type="hidden" name="retorno" value={retorno} /> : null}
        <EmpresaFormFields company={company} ilLeaders={ilLeaders} collaborators={collaborators} />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  )
}
