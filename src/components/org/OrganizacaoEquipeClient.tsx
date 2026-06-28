'use client'

import { useState, useTransition } from 'react'
import {
  criarGerenteOrg,
  atualizarGerenteOrg,
  toggleGerenteAtivo,
  reenviarSenhaGerente,
} from '@/lib/org/actions'
import type { OrgCompanyRow, OrgGerenteRow } from '@/lib/org/queries'

interface Props {
  orgName: string
  companies: OrgCompanyRow[]
  gerentes: OrgGerenteRow[]
}

function formatCnpj(cnpj: string | null) {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—'
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

function CompanyCheckboxes({
  companies,
  selected,
  name = 'company_ids',
}: {
  companies: OrgCompanyRow[]
  selected?: string[]
  name?: string
}) {
  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 text-sm">
      {companies.map((c) => (
        <label key={c.id} className="flex items-start gap-2">
          <input
            type="checkbox"
            name={name}
            value={c.id}
            defaultChecked={selected?.includes(c.id)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">{c.name}</span>
            <span className="block font-mono text-xs text-zinc-500">{formatCnpj(c.cnpj)}</span>
          </span>
        </label>
      ))}
    </div>
  )
}

export function OrganizacaoEquipeClient({ orgName, companies, gerentes }: Props) {
  const [modal, setModal] = useState<'create' | string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const editing = gerentes.find((g) => g.memberId === modal)

  return (
    <div className="space-y-8">
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {ok}
        </div>
      )}
      {erro && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Filiais do grupo ({companies.length})</h2>
        {companies.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
            Nenhuma filial cadastrada ainda.{' '}
            <a href="/empresas/nova" className="font-medium text-zinc-900 underline hover:text-zinc-700">
              Cadastrar primeiro CNPJ →
            </a>
          </div>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-zinc-600">
            {companies.map((c) => (
              <li key={c.id}>
                {c.name} <span className="font-mono text-xs text-zinc-400">{formatCnpj(c.cnpj)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Gerentes de filial</h2>
          <p className="text-sm text-zinc-500">
            {orgName} — crie usuários responsáveis por uma ou mais filiais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setModal('create'); setErro(null) }}
          disabled={companies.length === 0}
          title={companies.length === 0 ? 'Cadastre ao menos uma filial antes de criar gerente' : undefined}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Novo gerente
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Filiais</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {gerentes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum gerente cadastrado. Crie o primeiro responsável por filial.
                </td>
              </tr>
            ) : (
              gerentes.map((g) => (
                <tr key={g.memberId} className={!g.isActive ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium">{g.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{g.email}</td>
                  <td className="px-4 py-3 text-xs">
                    {g.companyNames.length ? g.companyNames.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {g.modulePentagrama && <span className="mr-2">Pentagrama</span>}
                    {g.moduleNr01 && <span>NR-01</span>}
                  </td>
                  <td className="px-4 py-3">
                    {g.isActive ? (
                      <span className="text-emerald-700">Ativo</span>
                    ) : (
                      <span className="text-zinc-400">Bloqueado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      className="text-xs text-blue-800 hover:underline"
                      onClick={() => setModal(g.memberId)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-xs text-zinc-600 hover:underline"
                      disabled={pending}
                      onClick={() => {
                        start(async () => {
                          const res = await reenviarSenhaGerente(g.userId)
                          if (res && 'error' in res) setErro(res.error ?? 'Erro')
                          else setOk('Link de redefinição de senha gerado (enviado pelo Supabase).')
                        })
                      }}
                    >
                      Reset senha
                    </button>
                    <button
                      type="button"
                      className="text-xs text-zinc-600 hover:underline"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`${g.isActive ? 'Bloquear' : 'Reativar'} este gerente?`)) return
                        start(async () => {
                          const res = await toggleGerenteAtivo(g.memberId, !g.isActive)
                          if (res && 'error' in res) setErro(res.error ?? 'Erro')
                          else setOk(g.isActive ? 'Gerente bloqueado.' : 'Gerente reativado.')
                        })
                      }}
                    >
                      {g.isActive ? 'Bloquear' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setErro(null)
              start(async () => {
                const res = await criarGerenteOrg(new FormData(e.currentTarget))
                if (res && 'error' in res) setErro(res.error ?? 'Erro')
                else {
                  setOk('Convite enviado ao gerente.')
                  setModal(null)
                }
              })
            }}
          >
            <h3 className="text-lg font-semibold">Novo gerente de filial</h3>
            <input name="name" required placeholder="Nome" className="w-full rounded-lg border px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="E-mail" className="w-full rounded-lg border px-3 py-2 text-sm" />
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
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Filiais (CNPJs)</p>
              <CompanyCheckboxes companies={companies} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Enviar convite
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setErro(null)
              start(async () => {
                const res = await atualizarGerenteOrg(new FormData(e.currentTarget))
                if (res && 'error' in res) setErro(res.error ?? 'Erro')
                else {
                  setOk('Gerente atualizado.')
                  setModal(null)
                }
              })
            }}
          >
            <h3 className="text-lg font-semibold">Editar — {editing.name}</h3>
            <input type="hidden" name="member_id" value={editing.memberId} />
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="module_pentagrama" defaultChecked={editing.modulePentagrama} />
                Módulo Pentagrama
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="module_nr01" defaultChecked={editing.moduleNr01} />
                Módulo NR-01
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Filiais</p>
              <CompanyCheckboxes companies={companies} selected={editing.companyIds} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)}>Fechar</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
