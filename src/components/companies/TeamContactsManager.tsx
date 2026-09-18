'use client'

import { useState } from 'react'
import type { CompanyContact, CompanyDepartment } from '@/types/database'
import {
  adicionarContato,
  atualizarContato,
  removerContato,
} from '@/app/(dashboard)/empresas/[id]/equipe/actions'

interface Props {
  companyId: string
  contacts: CompanyContact[]
  departments: CompanyDepartment[]
  suppressedEmails?: string[]
}

const ROLE_LABEL = { leader: 'Líder (IL)', collaborator: 'Colaborador (IC)' }

function contactStatus(c: CompanyContact, suppressed: string[] | undefined): string {
  const email = c.email.trim().toLowerCase()
  if (suppressed?.includes(email)) return 'Suprimido (bounce/spam)'
  return c.is_active ? 'Ativo' : 'Inativo'
}

function deptLabel(
  c: CompanyContact,
  departments: CompanyDepartment[],
): string {
  if (c.department_id) {
    const d = departments.find((x) => x.id === c.department_id)
    if (d) return d.name
  }
  const t = c.department?.trim()
  return t && t.length > 0 ? t : ''
}

function DepartmentSelect({
  name,
  departments,
  defaultValue,
}: {
  name: string
  departments: CompanyDepartment[]
  defaultValue?: string | null
}) {
  const active = departments.filter((d) => d.is_active)
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ''}
      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
    >
      <option value="">Sem departamento</option>
      {active.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  )
}

export function TeamContactsManager({
  companyId,
  contacts,
  departments,
  suppressedEmails,
}: Props) {
  const [tab, setTab] = useState<'all' | 'leader' | 'collaborator'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)

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
          <p className="text-xs text-zinc-500">Disparo por departamento no convite</p>
        </div>
      </div>

      <form action={adicionarContato} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Adicionar à equipe</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Escolha o <strong>Departamento</strong> do catálogo da empresa para filtrar disparos e
            identificar respostas no link compartilhado.
          </p>
        </div>
        <input type="hidden" name="company_id" value={companyId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Nome completo</span>
            <input
              name="full_name"
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">E-mail</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600">Papel</span>
            <select
              name="contact_role"
              defaultValue="collaborator"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="leader">Líder (IL)</option>
              <option value="collaborator">Colaborador (IC)</option>
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-zinc-600">Departamento</span>
            <DepartmentSelect name="department_id" departments={departments} />
          </label>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
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
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum contato neste filtro.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const dept = deptLabel(c, departments)
                return editingId === c.id ? (
                  <tr key={c.id} className="bg-amber-50/40">
                    <td colSpan={6} className="px-4 py-4">
                      <form action={atualizarContato} className="space-y-3">
                        <input type="hidden" name="company_id" value={companyId} />
                        <input type="hidden" name="contact_id" value={c.id} />
                        <input type="hidden" name="is_active" value={c.is_active ? 'true' : 'false'} />
                        <p className="text-xs font-semibold text-zinc-700">Editar contato</p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-zinc-600">Nome completo</span>
                            <input
                              name="full_name"
                              required
                              defaultValue={c.full_name}
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-zinc-600">E-mail</span>
                            <input
                              name="email"
                              type="email"
                              required
                              defaultValue={c.email}
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-zinc-600">Papel</span>
                            <select
                              name="contact_role"
                              defaultValue={c.contact_role}
                              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            >
                              <option value="leader">Líder (IL)</option>
                              <option value="collaborator">Colaborador (IC)</option>
                            </select>
                          </label>
                          <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
                            <span className="text-xs font-medium text-zinc-600">Departamento</span>
                            <DepartmentSelect
                              name="department_id"
                              departments={departments}
                              defaultValue={c.department_id}
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-medium">{c.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.email}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {dept ? dept : <span className="text-zinc-400">Sem departamento</span>}
                    </td>
                    <td className="px-4 py-3">{ROLE_LABEL[c.contact_role]}</td>
                    <td className="px-4 py-3">{contactStatus(c, suppressedEmails)}</td>
                    <td className="space-x-3 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingId(c.id)}
                        className="text-xs text-blue-800 hover:underline"
                      >
                        Editar
                      </button>
                      <form action={removerContato} className="inline">
                        <input type="hidden" name="company_id" value={companyId} />
                        <input type="hidden" name="contact_id" value={c.id} />
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
