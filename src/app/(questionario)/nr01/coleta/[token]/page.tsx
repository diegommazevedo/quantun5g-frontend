/**
 * QUANTUM5G — NR-01 · Coleta pública (anônima)
 * Acesso por token de avaliação. Sem autenticação.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markSurveyInviteOpened } from '@/lib/survey/invites'
import { loadInstrument, LIKERT_LABELS } from '@/lib/nr01/instrument'
import { Nr01Assessment } from '@/types/nr01'
import { submeterRespostaNr01 } from './actions'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ status?: string; error?: string; invite?: string }>
}

export default async function ColetaPublicaNr01Page({ params, searchParams }: Props) {
  const { token } = await params
  const { status, error, invite } = await searchParams
  await markSurveyInviteOpened(invite)
  const supabase = await createClient()

  const { data: assess } = await supabase
    .from('nr01_assessments')
    .select('id, name, status, instrument_version, collection_opens_at, collection_closes_at, k_anonymity_min')
    .eq('collection_token', token)
    .maybeSingle()

  if (!assess) notFound()
  const a = assess as Pick<Nr01Assessment, 'id' | 'name' | 'status' | 'instrument_version' | 'collection_opens_at' | 'collection_closes_at' | 'k_anonymity_min'>

  if (a.status !== 'COLETANDO') {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Coleta não disponível</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta avaliação não está aberta para respostas no momento.
        </p>
      </div>
    )
  }

  if (status === 'ok') {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-emerald-900">Resposta registrada</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Obrigado pela sua participação. Sua resposta é anônima e foi registrada
          com sucesso.
        </p>
      </div>
    )
  }

  const groups = await loadInstrument(a.instrument_version)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-orange-600">Avaliação NR-01</p>
        <h1 className="text-2xl font-bold text-zinc-900">{a.name}</h1>
        <p className="text-sm text-zinc-600">
          Sua resposta é <strong>anônima</strong>. Nenhuma identificação pessoal é coletada
          ou armazenada. Somente agregados com pelo menos {a.k_anonymity_min} respondentes
          são exibidos a líderes ou consultores.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={submeterRespostaNr01} className="space-y-10">
        <input type="hidden" name="token" value={token} />

        <fieldset className="rounded-lg border border-zinc-200 bg-white p-4">
          <legend className="px-2 text-xs uppercase tracking-wide text-zinc-500">
            Dados de contexto (opcionais)
          </legend>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="setor"
              placeholder="Setor"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              name="funcao"
              placeholder="Função"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            {/* Patch 005: opções literais do NR01_GRO.docx (Bloco 1) */}
            <select
              name="vinculo"
              defaultValue=""
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Tipo de vínculo</option>
              <option value="efetivo">Efetivo</option>
              <option value="temporario">Temporário</option>
              <option value="terceirizado">Terceirizado</option>
              <option value="outro">Outro</option>
            </select>
            <select
              name="tempo_casa"
              defaultValue=""
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Tempo de empresa</option>
              <option value="ate_6_meses">Até 6 meses</option>
              <option value="6_meses_1_ano">6 meses a 1 ano</option>
              <option value="1_3_anos">1 a 3 anos</option>
              <option value="3_5_anos">3 a 5 anos</option>
              <option value="mais_5_anos">Mais de 5 anos</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" name="is_leader" value="true" />
              Sou liderança
            </label>
          </div>
        </fieldset>

        {groups.map((g) => (
          <section key={g.dimension.code} className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">{g.dimension.name}</h2>
            <p className="mb-4 text-xs text-zinc-500">{g.dimension.description}</p>
            <div className="space-y-4">
              {g.questions.map((q) => (
                <div key={q.id} className="border-t border-zinc-100 pt-3">
                  <p className="text-sm text-zinc-800">{q.text}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {LIKERT_LABELS.map((l) => (
                      <label key={l.value} className="flex items-center gap-1 text-xs text-zinc-700">
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={l.value}
                          required
                          className="h-3.5 w-3.5"
                        />
                        {l.value} · {l.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <fieldset className="rounded-lg border border-zinc-200 bg-white p-4">
          <legend className="px-2 text-xs uppercase tracking-wide text-zinc-500">
            Bloco 12 — Perguntas abertas (opcionais)
          </legend>
          {/* Patch 005: textos literais do NR01_GRO.docx (linhas 243-251) */}
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-zinc-700">
              <span className="mb-1 block">
                Qual é hoje o principal fator de desgaste no seu trabalho?
              </span>
              <textarea
                name="open_q1"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-700">
              <span className="mb-1 block">
                O que mais contribui positivamente para o seu trabalho?
              </span>
              <textarea
                name="open_q2"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-700">
              <span className="mb-1 block">
                O que precisa mudar com urgência no ambiente de trabalho?
              </span>
              <textarea
                name="open_q3"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-700">
              <span className="mb-1 block">Deseja acrescentar algo?</span>
              <textarea
                name="open_q4"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </fieldset>

        <div className="sticky bottom-4 flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-orange-700"
          >
            Enviar resposta anônima
          </button>
        </div>
      </form>
    </div>
  )
}
