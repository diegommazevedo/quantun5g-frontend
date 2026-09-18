'use client'

import { useMemo, useState } from 'react'
import { CompetenciaSurveyFields } from '@/components/survey/CompetenciaSurveyFields'
import { type DepartmentCount } from '@/lib/companies/contacts'
import type { SurveyModuleToken } from '@/lib/survey/competencia'

interface Props {
  module: SurveyModuleToken
  nextSeq: number
  defaultPeriod: string
  pesquisaInicioDefault: string
  pesquisaFimDefault: string
  disabled?: boolean
  departments: DepartmentCount[]
}

/** Competência + nome editável + escopo geral/departamento (NR-01 e Pentagrama). */
export function SurveyIdentityWithScopeFields({
  module,
  nextSeq,
  defaultPeriod,
  pesquisaInicioDefault,
  pesquisaFimDefault,
  disabled,
  departments,
}: Props) {
  const [scope, setScope] = useState<'geral' | 'departamento'>('geral')
  const [selected, setSelected] = useState<string[]>(() => departments.map((d) => d.key))

  const entityLabel = module === 'pentagrama' ? 'diagnóstico' : 'avaliação'

  const nameExtraSuffix = useMemo(() => {
    if (scope !== 'departamento') return ''
    const labels = departments
      .filter((d) => selected.includes(d.key))
      .map((d) => d.label)
    if (labels.length === 0) return ' — por departamento'
    if (labels.length <= 2) return ` — ${labels.join(' + ')}`
    return ` — ${labels.slice(0, 2).join(' + ')} +${labels.length - 2}`
  }, [scope, selected, departments])

  function toggleDept(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  return (
    <div className="space-y-4">
      <CompetenciaSurveyFields
        module={module}
        nextSeq={nextSeq}
        defaultPeriod={defaultPeriod}
        pesquisaInicioDefault={pesquisaInicioDefault}
        pesquisaFimDefault={pesquisaFimDefault}
        disabled={disabled}
        editableName
        nameExtraSuffix={nameExtraSuffix}
      />

      <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
        <div className="space-y-1.5">
          <label htmlFor="dispatch_scope" className="block text-sm font-medium text-zinc-700">
            Escopo do disparo
          </label>
          <select
            id="dispatch_scope"
            name="dispatch_scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'geral' | 'departamento')}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            disabled={disabled}
          >
            <option value="geral">Geral (padrão) — todos os departamentos</option>
            <option value="departamento">Por departamento — pré-seleciona e-mails no disparo</option>
          </select>
          <p className="text-xs text-zinc-500">
            O escopo entra no nome sugerido do {entityLabel} e pré-marca os destinatários na tela de
            disparo{module === 'pentagrama' ? ' (IL e IC)' : ''}.
          </p>
        </div>

        {scope === 'departamento' && (
          <fieldset disabled={disabled || departments.length === 0}>
            <legend className="text-sm font-semibold text-zinc-900">Departamentos a incluir</legend>
            {departments.length === 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                Nenhum departamento na equipe. Cadastre em Empresas → Equipe.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {departments.map((d) => (
                  <li key={d.key}>
                    <label className="flex items-center gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        name="dispatch_department"
                        value={d.key}
                        checked={selected.includes(d.key)}
                        onChange={() => toggleDept(d.key)}
                        className="rounded border-zinc-300"
                      />
                      <span>
                        {d.label} ({d.count})
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}
      </div>
    </div>
  )
}

/** @deprecated Use SurveyIdentityWithScopeFields */
export { SurveyIdentityWithScopeFields as Nr01AvaliacaoIdentityFields }
