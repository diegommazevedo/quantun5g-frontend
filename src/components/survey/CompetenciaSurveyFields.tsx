'use client'



import { useMemo, useState } from 'react'

import {

  formatCompetenciaLabel,

  formatPeriodInput,

  formatSurveyName,

  parsePeriodMmYyyy,

  type SurveyModuleToken,

} from '@/lib/survey/competencia'



interface Props {

  module: SurveyModuleToken

  nextSeq: number

  defaultPeriod: string

  /** Janela global da pesquisa (início = hoje, fim = +15 dias) */

  pesquisaInicioDefault: string

  pesquisaFimDefault: string

  disabled?: boolean

}



/** Campos de formulário por módulo (mapeados no server para colunas do BD). */

const INICIO_FIELD: Record<SurveyModuleToken, string> = {

  pentagrama: 'il_deadline',

  nr01: 'collection_opens_at',

}



const FIM_FIELD: Record<SurveyModuleToken, string> = {

  pentagrama: 'ic_deadline',

  nr01: 'collection_closes_at',

}



export function CompetenciaSurveyFields({

  module,

  nextSeq,

  defaultPeriod,

  pesquisaInicioDefault,

  pesquisaFimDefault,

  disabled,

}: Props) {

  const [seq] = useState(nextSeq)

  const [period, setPeriod] = useState(defaultPeriod)



  const parsed = useMemo(() => parsePeriodMmYyyy(period), [period])



  const label = parsed ? formatCompetenciaLabel(seq, parsed.month, parsed.year) : `Q${seq} - …`

  const surveyName = parsed

    ? formatSurveyName(module, seq, parsed.month, parsed.year)

    : ''



  const nameField = module === 'pentagrama' ? 'nome_diagnostico' : 'name'

  const inicioName = INICIO_FIELD[module]

  const fimName = FIM_FIELD[module]



  return (

    <>

      <input type="hidden" name="competencia_seq" value={seq} />

      <input type="hidden" name={nameField} value={surveyName} readOnly />

      {module === 'nr01' && parsed && (

        <input type="hidden" name="reference_period" value={label} readOnly />

      )}



      <div className="space-y-1.5">

        <label htmlFor="competencia_period" className="block text-sm font-medium text-zinc-700">

          Competência *

        </label>

        <div className="flex flex-wrap items-center gap-3">

          <span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-800">

            Q{seq}

          </span>

          <span className="text-zinc-400">—</span>

          <input

            id="competencia_period"

            name="competencia_period"

            type="text"

            required

            inputMode="numeric"

            placeholder="MM/AAAA"

            maxLength={7}

            value={period}

            onChange={(e) => setPeriod(formatPeriodInput(e.target.value))}

            className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-mono"

            disabled={disabled}

            aria-describedby="competencia-hint"

          />

        </div>

        <p id="competencia-hint" className="text-xs text-zinc-500">

          Rodada <strong>{label}</strong>

          {seq > 1 ? ` · sequência Q${seq} nesta empresa` : ' · primeira rodada nesta empresa'}

        </p>

      </div>



      <div className="space-y-1.5">

        <label htmlFor="survey_name_preview" className="block text-sm font-medium text-zinc-700">

          {module === 'pentagrama' ? 'Nome do diagnóstico' : 'Nome da avaliação'} *

        </label>

        <input

          id="survey_name_preview"

          type="text"

          readOnly

          value={surveyName || 'Preencha a competência (MM/AAAA)'}

          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800"

          disabled={disabled}

        />

        <p className="text-xs text-zinc-500">Gerado automaticamente a partir da competência.</p>

      </div>



      <fieldset className="space-y-4" disabled={disabled}>

        <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-900">

          Prazos da pesquisa

        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div className="space-y-1.5">

            <label htmlFor={inicioName} className="block text-sm font-medium text-zinc-700">

              Início da pesquisa

            </label>

            <input

              id={inicioName}

              name={inicioName}

              type="date"

              required

              defaultValue={pesquisaInicioDefault}

              min={pesquisaInicioDefault}

              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"

              disabled={disabled}

            />

            <p className="text-xs text-zinc-500">Sugerido: hoje.</p>

          </div>

          <div className="space-y-1.5">

            <label htmlFor={fimName} className="block text-sm font-medium text-zinc-700">

              Encerramento da pesquisa

            </label>

            <input

              id={fimName}

              name={fimName}

              type="date"

              required

              defaultValue={pesquisaFimDefault}

              min={pesquisaInicioDefault}

              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"

              disabled={disabled}

            />

            <p className="text-xs text-zinc-500">Sugerido: +15 dias após o início.</p>

          </div>

        </div>

        <p className="text-xs text-zinc-500">

          Prazo único da rodada — vale para toda a coleta (IL/IC no Pentagrama; NR-01 na janela de respostas).

        </p>

      </fieldset>

    </>

  )

}

