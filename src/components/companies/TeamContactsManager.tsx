'use client'

import { useState } from 'react'
import type { CompanyContact } from '@/types/database'
import { adicionarContato, removerContato } from '@/app/(dashboard)/empresas/[id]/equipe/actions'

interface Props {
  companyId: string
  contacts: CompanyContact[]
  suppressedEmails?: string[]
}

const ROLE_LABEL = { leader: 'Líder (IL)', collaborator: 'Colaborador (IC)' }

function contactStatus(c: CompanyContact, suppressed: string[] | undefined): string {
  const email = c.email.trim().toLowerCase()
  if (suppressed?.includes(email)) return 'Suprimido (bounce/spam)'
  return c.is_active ? 'Ativo' : 'Inativo'
}

export function TeamContactsManager({ companyId, contacts, suppressedEmails }: Props) {
  const [tab, setTab] = useState<'all' | 'leader' | 'collaborator'>('all')

  const filtered =
    tab === 'all' ? contacts : contacts.filter((c) => c.contact_role === tab)

  const leaders = contacts.filter((c) => c.contact_role === 'leader' && c.is_active)
  const cols = contacts.filter((c) => c.contact_role === 'collaborator' && c.is_active)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <p className="text-xs font-semibold uppercase text-purple-800">Líderes IL</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{leaders.length}</p>
          <p className="text-xs text-q-muted">Pentagrama — Instrumento de Liderança</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase text-blue-800">Colaboradores IC</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{cols.length}</p>
          <p className="text-xs text-q-muted">Pentagrama — pesquisa vivida</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-600">Lista NR-01</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{leaders.length + cols.length}</p>
          <p className="text-xs text-zinc-500">Disparo único — sem distinguir papel</p>
        </div>
      </div>

      <form action={adicionarContato} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Adicionar à equipe</h2>
        <input type="hidden" name="company_id" value={companyId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            name="full_name"
            required
            placeholder="Nome completo *"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail *"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select name="contact_role" defaultValue="collaborator" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="leader">Líder (IL)</option>
            <option value="collaborator">Colaborador (IC)</option>
          </select>
          <input name="job_title" placeholder="Cargo (opcional)" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <input name="department" placeholder="Área (opcional)" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">
          Incluir na lista
        </button>
      </form>

      <div className="flex gap-2">
        {(['all', 'leader', 'collaborator'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {t === 'all' ? 'Todos' : ROLE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum contato neste filtro.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[c.contact_role]}</td>
                  <td className="px-4 py-3">{contactStatus(c, suppressedEmails)}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={removerContato} className="inline">
                      <input type="hidden" name="company_id" value={companyId} />
                      <input type="hidden" name="contact_id" value={c.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Remover
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
