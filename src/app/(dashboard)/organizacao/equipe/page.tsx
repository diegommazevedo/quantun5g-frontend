import Link from 'next/link'
import { requireContratanteOrRedirect } from '@/lib/org/access'
import { loadOrgCompanies, loadOrgGerentes } from '@/lib/org/queries'
import { OrganizacaoEquipeClient } from '@/components/org/OrganizacaoEquipeClient'

export default async function OrganizacaoEquipePage() {
  const ctx = await requireContratanteOrRedirect()
  const companies = await loadOrgCompanies(ctx.org.id)
  const gerentes = await loadOrgGerentes(ctx.org.id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Minha organização</h1>
        <p className="mt-1 text-sm text-zinc-600">
          <strong>{ctx.org.name}</strong> — gerencie gerentes de filial, módulos e acesso por CNPJ.
        </p>
      </div>

      <OrganizacaoEquipeClient orgName={ctx.org.name} companies={companies} gerentes={gerentes} />
    </div>
  )
}
