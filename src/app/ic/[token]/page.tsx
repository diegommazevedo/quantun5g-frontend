/**
 * QUANTUM5G — TELA-06: Formulário IC (Instrumento de Colaboradores)
 * Rota pública — acessada via token único compartilhado com toda a equipe.
 * REGRA INVIOLÁVEL: respondente_anonimo_id gerado no cliente, sem FK.
 */

import { notFound } from 'next/navigation'
import { markSurveyInviteOpened } from '@/lib/survey/invites'
import ICFormClient from './ICFormClient'
import { PENTAGRAMA_LIKERT_SCALE } from '@/lib/pentagrama/likert-labels'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { resolveDiagnosticByIcToken } from '@/lib/pentagrama/public-diagnostic'
import {
  listCompanyDepartments,
  resolveDepartmentFromInviteToken,
} from '@/lib/companies/departments'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function ICPage({ params, searchParams }: Props) {
  const { token } = await params
  const { invite } = await searchParams
  await markSurveyInviteOpened(invite)

  const diag = await resolveDiagnosticByIcToken(token)
  if (!diag) notFound()

  if (!isPentagramaColetaAberta(diag.status)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Coleta encerrada</h1>
          <p className="text-sm text-zinc-500">
            O período de respostas para este diagnóstico foi encerrado. Obrigado!
          </p>
        </div>
      </div>
    )
  }

  const departments = await listCompanyDepartments(diag.companyId)
  const inviteDept = await resolveDepartmentFromInviteToken(invite, diag.companyId)

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <span className="text-sm font-semibold text-zinc-900">Quantum5G</span>
            <span className="mx-2 text-zinc-300">|</span>
            <span className="text-sm text-zinc-500">Instrumento de Colaboradores</span>
          </div>
          <span className="text-xs text-zinc-400">{diag.companyName}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6">
          <h1 className="text-xl font-bold text-zinc-900">
            Pentagrama de Ginger — Instrumento de Colaboradores
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Para cada afirmação abaixo, escolha o número que melhor representa sua experiência
            real nesta empresa.
          </p>
          <p className="text-sm font-medium text-zinc-600">
            Responda com honestidade — suas respostas são totalmente anônimas.
          </p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-medium text-blue-700">
              Anonimato garantido — suas respostas não são vinculadas à sua identidade.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            {PENTAGRAMA_LIKERT_SCALE.map(({ value, lines }) => (
              <span key={value} className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-700">
                  {value}
                </span>
                {lines.join(' ')}
              </span>
            ))}
          </div>
        </div>

        <ICFormClient
          diagnosticId={diag.id}
          token={token}
          inviteToken={invite ?? null}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          lockedDepartmentId={inviteDept.locked ? inviteDept.departmentId : null}
          lockedDepartmentLabel={inviteDept.locked ? inviteDept.departmentLabel : null}
        />
      </div>
    </div>
  )
}
