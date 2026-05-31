'use client'

import { useState } from 'react'

export type CollaboratorRow = { full_name: string; email: string; job_title?: string }

interface Props {
  initial?: CollaboratorRow[]
}

export function CollaboratorsEditor({ initial }: Props) {
  const [rows, setRows] = useState<CollaboratorRow[]>(
    initial && initial.length > 0 ? initial : [{ full_name: '', email: '', job_title: '' }],
  )

  function updateRow(index: number, field: keyof CollaboratorRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { full_name: '', email: '', job_title: '' }])
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? [{ full_name: '', email: '', job_title: '' }] : prev.filter((_, i) => i !== index)))
  }

  const payload = rows
    .map((r) => ({
      full_name: r.full_name.trim(),
      email: r.email.trim().toLowerCase(),
      contact_role: 'collaborator' as const,
      job_title: r.job_title?.trim() || null,
    }))
    .filter((r) => r.full_name || r.email)

  return (
    <fieldset className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-blue-900">
        Colaboradores IC — lista de transmissão por e-mail
      </legend>
      <p className="text-xs text-blue-800/90">
        Pessoas que recebem o convite do <strong>Instrumento de Colaboradores (IC)</strong> no Pentagrama.
        No <strong>NR-01</strong>, líderes e colaboradores ativos entram na mesma lista de disparo.
        Você pode incluir agora ou depois em{' '}
        <span className="font-medium">Empresas → Equipe</span>.
      </p>

      <input type="hidden" name="collaborators_json" value={JSON.stringify(payload)} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-3 rounded-lg border border-blue-100 bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-600">Nome</label>
              <input
                type="text"
                value={row.full_name}
                onChange={(e) => updateRow(index, 'full_name', e.target.value)}
                placeholder="Ex: Maria Souza"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-600">E-mail</label>
              <input
                type="email"
                value={row.email}
                onChange={(e) => updateRow(index, 'email', e.target.value)}
                placeholder="colaborador@empresa.com"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-600">Cargo (opc.)</label>
              <input
                type="text"
                value={row.job_title ?? ''}
                onChange={(e) => updateRow(index, 'job_title', e.target.value)}
                placeholder="Analista"
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="text-sm font-medium text-blue-900 hover:underline">
        + Adicionar colaborador
      </button>
    </fieldset>
  )
}
