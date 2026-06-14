'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  criarUsuario,
  atualizarAcessoUsuario,
  toggleUsuarioAtivo,
} from './actions'
import { UserVinculosForm, type OrgAccountOption } from '@/components/admin/UserVinculosForm'
import type {
  AdminCompanyOption,
  AdminConsultantOption,
  UserVinculosBundle,
} from '@/lib/admin/user-vinculos'

export type UsuarioRow = {
  id: string
  name: string | null
  email: string | null
  role: string
  is_active: boolean
  module_pentagrama: boolean
  module_nr01: boolean
  created_at: string
}

interface Props {
  usuarios: UsuarioRow[]
  orgSummary?: Record<string, { orgName: string | null; orgRole: string; companyCount: number }>
  companies: AdminCompanyOption[]
  consultants: AdminConsultantOption[]
  orgAccounts: OrgAccountOption[]
  vinculos: Record<string, UserVinculosBundle>
}

const EMPTY_VINCULOS: UserVinculosBundle = {
  consultantCompanyIds: [],
  contratante: null,
  gerente: null,
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  consultant: 'Consultor',
  leader: 'Contratante (legado)',
  contratante: 'Contratante',
  gerente: 'Gerente de filial',
  collaborator: 'Colaborador',
}

export function UsuariosClient({
  usuarios,
  orgSummary = {},
  companies,
  consultants,
  orgAccounts,
  vinculos,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<string>('consultant')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const editing = usuarios.find((u) => u.id === editId)

  useEffect(() => {
    if (editing) setEditRole(editing.role)
  }, [editing])

  async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await criarUsuario(fd)
      if (res && 'error' in res) setErro(res.error ?? 'Erro')
      else {
        setSucesso('Convite enviado.')
        setModalOpen(false)
      }
    })
  }

  async function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await atualizarAcessoUsuario(fd)
      if (res && 'error' in res) setErro(res.error ?? 'Erro')
      else {
        setSucesso('Acesso atualizado.')
        setEditId(null)
      }
    })
  }

  return (
    <>
      {sucesso && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {sucesso}
          <button type="button" className="ml-2" onClick={() => setSucesso(null)}>✕</button>
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
          <button type="button" className="ml-2" onClick={() => setErro(null)}>✕</button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuários</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Papéis, módulos, organização multi-CNPJ e status de login.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setModalOpen(true); setEditId(null) }}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          + Novo usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Organização / CNPJs</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {usuarios.map((u) => (
              <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">
                  {orgSummary[u.id] ? (
                    <>
                      {orgSummary[u.id].orgName ?? '—'}{' '}
                      <span className="text-zinc-400">
                        ({orgSummary[u.id].orgRole} · {orgSummary[u.id].companyCount} CNPJ
                        {orgSummary[u.id].companyCount !== 1 ? 's' : ''})
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.role === 'admin' ? (
                    'Todos'
                  ) : (
                    <>
                      {u.module_pentagrama && <span className="mr-2">Pentagrama</span>}
                      {u.module_nr01 && <span>NR-01</span>}
                      {!u.module_pentagrama && !u.module_nr01 && '—'}
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <span className="text-emerald-700">Ativo</span>
                  ) : (
                    <span className="text-zinc-400">Inativo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    className="text-xs text-blue-800 hover:underline"
                    onClick={() => setEditId(u.id)}
                  >
                    Acesso
                  </button>
                  <button
                    type="button"
                    className="text-xs text-zinc-600 hover:underline"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`${u.is_active ? 'Desativar' : 'Ativar'} este usuário?`)) return
                      startTransition(async () => {
                        const res = await toggleUsuarioAtivo(u.id, !u.is_active)
                        if (res && 'error' in res) setErro(res.error ?? 'Erro')
                      })
                    }}
                  >
                    {u.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCriar}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold">Novo usuário</h2>
            <input name="name" required placeholder="Nome" className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="E-mail" className="w-full rounded-lg border px-3 py-2 text-sm" />
            <select name="role" defaultValue="consultant" className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="consultant">Consultor</option>
              <option value="contratante">Contratante (grupo multi-CNPJ)</option>
              <option value="gerente">Gerente de filial</option>
              <option value="admin">Administrador</option>
              <option value="leader">Contratante legado (leader)</option>
            </select>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="module_pentagrama" defaultChecked />
                Módulo Pentagrama
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="module_nr01" defaultChecked />
                Módulo NR-01
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Enviar convite
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleEditar}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold">Acesso — {editing.name}</h2>
            <input type="hidden" name="user_id" value={editing.id} />
            <select
              name="role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="consultant">Consultor</option>
              <option value="contratante">Contratante</option>
              <option value="gerente">Gerente de filial</option>
              <option value="admin">Administrador</option>
              <option value="leader">Contratante legado</option>
              <option value="collaborator">Colaborador</option>
            </select>
            {editRole !== 'admin' && (
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="module_pentagrama"
                    defaultChecked={editing.module_pentagrama}
                  />
                  Módulo Pentagrama
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="module_nr01" defaultChecked={editing.module_nr01} />
                  Módulo NR-01
                </label>
              </div>
            )}
            <UserVinculosForm
              userId={editing.id}
              role={editRole}
              vinculos={vinculos[editing.id] ?? EMPTY_VINCULOS}
              companies={companies}
              consultants={consultants}
              orgAccounts={orgAccounts}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditId(null)} className="px-3 py-2 text-sm">
                Fechar
              </button>
              <button type="submit" disabled={isPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
