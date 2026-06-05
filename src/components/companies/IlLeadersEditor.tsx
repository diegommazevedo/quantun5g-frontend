'use client'

import { useState } from 'react'

export type IlLeaderRow = { name: string; email: string }

interface Props {
  initial?: IlLeaderRow[]
  minRows?: number
}

export function IlLeadersEditor({ initial, minRows = 1 }: Props) {
  const seed =
    initial && initial.length > 0
      ? initial
      : Array.from({ length: minRows }, () => ({ name: '', email: '' }))
  const [rows, setRows] = useState<IlLeaderRow[]>(seed)

  function updateRow(index: number, field: keyof IlLeaderRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { name: '', email: '' }])
  }

  function removeRow(index: number) {
    if (rows.length <= minRows) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <fieldset className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-purple-900">
        Contatos IL — um ou mais
      </legend>
      <p className="text-xs text-purple-800/90">
        Contatos de pesquisa que respondem o Instrumento de Liderança (IL) via link/token — não
        precisam de login na plataforma. Ao criar um diagnóstico, escolha qual contato receberá o
        link desta rodada.
      </p>

      <input type="hidden" name="il_leaders_json" value={JSON.stringify(rows)} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-3 rounded-lg border border-purple-100 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-600">Nome *</label>
              <input
                type="text"
                required
                value={row.name}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                placeholder="Ex: João Silva"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-600">E-mail *</label>
              <input
                type="email"
                required
                value={row.email}
                onChange={(e) => updateRow(index, 'email', e.target.value)}
                placeholder="lider@empresa.com"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={rows.length <= minRows}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-purple-900 hover:underline"
      >
        + Adicionar outro líder
      </button>
    </fieldset>
  )
}
