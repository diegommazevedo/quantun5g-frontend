import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Company, CompanyContact, CompanyDepartment, UserRole } from '@/types/database'
import { fetchCompanyForActor } from '@/lib/companies/list-for-actor'
import { TeamContactsManager } from '@/components/companies/TeamContactsManager'
import { CompanyDepartmentsManager } from '@/components/companies/CompanyDepartmentsManager'
import { EmailSuppressionsPanel } from '@/components/companies/EmailSuppressionsPanel'
import { loadSuppressionDetailsForEmails } from '@/lib/email/suppression'
import type { EmailSuppressionRow } from '@/lib/email/suppression'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; reativado?: string }>
}

export default async function EmpresaEquipePage({ params, searchParams }: Props) {
  const { id } = await params
  const { error, reativado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'

  const { data: company } = await fetchCompanyForActor<Company>(supabase, user.id, role, id, '*')
  if (!company) notFound()

  const admin = createServiceRoleAdmin()
  const [{ data: contacts }, { data: departments }] = await Promise.all([
    admin
      .from('company_contacts')
      .select('*')
      .eq('company_id', id)
      .order('contact_role')
      .order('full_name'),
    admin
      .from('company_departments')
      .select('*')
      .eq('company_id', id)
      .order('sort_order')
      .order('name'),
  ])

  const co = company
  const list = (contacts ?? []) as CompanyContact[]
  const deptList = (departments ?? []) as CompanyDepartment[]

  const suppressionMap = await loadSuppressionDetailsForEmails(
    supabase,
    list.map((c) => c.email),
  )
  const suppressions = [...suppressionMap.values()] as EmailSuppressionRow[]

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href={`/empresas/${id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← {co.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Equipe e listas de transmissão</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Cadastro único para os dois módulos. No <strong>Pentagrama</strong>, líderes recebem o IL e
          colaboradores o IC. No <strong>NR-01</strong>, todos os contatos ativos entram na lista de
          convite; o disparo e a filtragem das respostas usam o{' '}
          <strong>catálogo de departamentos</strong>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {reativado && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          E-mail reativado — pode voltar a receber convites desta empresa.
        </div>
      )}

      <EmailSuppressionsPanel companyId={id} suppressions={suppressions} />

      <CompanyDepartmentsManager companyId={id} departments={deptList} />

      <TeamContactsManager
        companyId={id}
        contacts={list}
        departments={deptList}
        suppressedEmails={suppressions.map((s) => s.email_normalized)}
      />
    </div>
  )
}
