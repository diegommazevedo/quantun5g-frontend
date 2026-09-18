'use client'

import { useState } from 'react'
import type { CompanyDepartment } from '@/types/database'
import {
  adicionarDepartamento,
  desativarDepartamento,
  reativarDepartamento,
  renomearDepartamento,
} from '@/app/(dashboard)/empresas/[id]/equipe/department-actions'

interface Props {
  companyId: string
  departments: CompanyDepartment[]
}

export function CompanyDepartmentsManager({ companyId, departments }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const active = departments.filter((d) => d.is_active)
  const inactive = departments.filter((d) => !d.is_active)

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Departamentos da empresa</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Cadastre os setores usados nos disparos e na filtragem consolidada das pesquisas
          (Pentagrama e NR-01). Cada contratante define a lista da própria empresa.
        </p>
      </div>

      <form action={adicionarDepartamento} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input type="hidden" name="company_id" value={companyId} />
        <label className="block flex-1 space-y-1">
          <span className="text-xs font-medium text-zinc-600">Novo departamento</span>
          <input
            name="name"
            required
            placeholder="Ex.: Fiscal, Contábil, Estoque"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Adicionar
        </button>
      </form>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
        {active.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-zinc-500">
            Nenhum departamento ativo. Cadastre ao menos um antes dos disparos.
          </li>
        ) : (
          active.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              {editingId === d.id ? (
                <form action={renomearDepartamento} className="flex w-full flex-wrap items-end gap-2">
                  <input type="hidden" name="company_id" value={companyId} />
                  <input type="hidden" name="department_id" value={d.id} />
                  <label className="block min-w-[12rem] flex-1 space-y-1">
                    <span className="text-xs font-medium text-zinc-600">Nome</span>
                    <input
                      name="name"
                      required
                      defaultValue={d.name}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-sm font-medium text-zinc-900">{d.name}</span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(d.id)}
                      className="text-xs text-blue-800 hover:underline"
                    >
                      Renomear
                    </button>
                    <form action={desativarDepartamento}>
                      <input type="hidden" name="company_id" value={companyId} />
                      <input type="hidden" name="department_id" value={d.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Desativar
                      </button>
                    </form>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Inativos</p>
          <ul className="space-y-1">
            {inactive.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
              >
                <span>{d.name}</span>
                <form action={reativarDepartamento}>
                  <input type="hidden" name="company_id" value={companyId} />
                  <input type="hidden" name="department_id" value={d.id} />
                  <button type="submit" className="text-xs text-zinc-800 hover:underline">
                    Reativar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
