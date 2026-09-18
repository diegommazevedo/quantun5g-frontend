'use client'

import type { CompanyDepartment } from '@/lib/companies/departments'

export interface SurveyDepartmentGateProps {
  departments: Pick<CompanyDepartment, 'id' | 'name'>[]
  lockedDepartmentId: string | null
  lockedDepartmentLabel: string | null
  /** Controlled value for open-link selection */
  value: string
  onChange: (departmentId: string) => void
  required?: boolean
}

/**
 * Identificação híbrida de departamento:
 * - com invite: mostra label travado
 * - sem invite: select obrigatório do catálogo
 */
export function SurveyDepartmentGate({
  departments,
  lockedDepartmentId,
  lockedDepartmentLabel,
  value,
  onChange,
  required = true,
}: SurveyDepartmentGateProps) {
  if (lockedDepartmentId && lockedDepartmentLabel) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Seu departamento
        </p>
        <p className="mt-1 text-sm font-medium text-emerald-950">{lockedDepartmentLabel}</p>
        <p className="mt-1 text-xs text-emerald-700">
          Identificado automaticamente pelo convite — não é necessário selecionar.
        </p>
        <input type="hidden" name="department_id" value={lockedDepartmentId} />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <label htmlFor="survey_department_id" className="block text-sm font-medium text-zinc-900">
        Departamento {required ? '*' : ''}
      </label>
      <p className="mt-1 text-xs text-zinc-500">
        Selecione o seu departamento para consolidarmos os resultados da pesquisa. Sua resposta
        permanece anônima.
      </p>
      <select
        id="survey_department_id"
        name="department_id"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
      >
        <option value="">Selecione…</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </div>
  )
}
