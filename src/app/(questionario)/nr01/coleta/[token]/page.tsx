/**
 * QUANTUM5G — NR-01 · Coleta pública (anônima)
 * Acesso por token de avaliação. Sem autenticação.
 * Service role no lookup do token (como /ic e /il) — evita 404 quando a janela
 * fecha e a policy RLS pública deixa de enxergar a linha.
 */

import { notFound } from 'next/navigation'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { markSurveyInviteOpened } from '@/lib/survey/invites'
import { loadInstrument } from '@/lib/nr01/instrument'
import { Nr01Assessment } from '@/types/nr01'
import ColetaFormClient from './ColetaFormClient'
import {
  listCompanyDepartments,
  resolveDepartmentFromInviteToken,
} from '@/lib/companies/departments'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ invite?: string }>
}

function isWindowOpen(a: {
  status: string
  collection_opens_at: string | null
  collection_closes_at: string | null
}): boolean {
  if (a.status !== 'COLETANDO') return false
  const now = Date.now()
  if (a.collection_opens_at && new Date(a.collection_opens_at).getTime() > now) return false
  if (a.collection_closes_at && new Date(a.collection_closes_at).getTime() < now) return false
  return true
}

export default async function ColetaPublicaNr01Page({ params, searchParams }: Props) {
  const { token } = await params
  const { invite } = await searchParams
  await markSurveyInviteOpened(invite)

  const admin = createServiceRoleAdmin()
  const { data: assess } = await admin
    .from('nr01_assessments')
    .select(
      'id, name, status, instrument_version, collection_opens_at, collection_closes_at, k_anonymity_min, company_id',
    )
    .eq('collection_token', token)
    .maybeSingle()

  if (!assess) notFound()
  const a = assess as Pick<
    Nr01Assessment,
    | 'id'
    | 'name'
    | 'status'
    | 'instrument_version'
    | 'collection_opens_at'
    | 'collection_closes_at'
    | 'k_anonymity_min'
    | 'company_id'
  >

  if (!isWindowOpen(a)) {
    const closedByDate =
      a.status === 'COLETANDO' &&
      a.collection_closes_at &&
      new Date(a.collection_closes_at).getTime() < Date.now()
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          {closedByDate ? 'Prazo de coleta encerrado' : 'Coleta não disponível'}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          {closedByDate
            ? 'O período definido para respostas desta avaliação já terminou. Fale com o responsável se ainda precisar responder.'
            : 'Esta avaliação não está aberta para respostas no momento.'}
        </p>
      </div>
    )
  }

  const groups = await loadInstrument(a.instrument_version)
  const departments = await listCompanyDepartments(a.company_id)
  const inviteDept = await resolveDepartmentFromInviteToken(invite, a.company_id)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-orange-600">Avaliação NR-01</p>
        <h1 className="text-2xl font-bold text-zinc-900">{a.name}</h1>
        <p className="text-sm text-zinc-600">
          Sua resposta é <strong>anônima</strong>. Nenhuma identificação pessoal é coletada ou
          armazenada. Somente agregados com pelo menos {a.k_anonymity_min} respondentes são
          exibidos a líderes ou consultores.
        </p>
      </header>

      <ColetaFormClient
        token={token}
        inviteToken={invite ?? null}
        groups={groups}
        kAnonymityMin={a.k_anonymity_min}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        lockedDepartmentId={inviteDept.locked ? inviteDept.departmentId : null}
        lockedDepartmentLabel={inviteDept.locked ? inviteDept.departmentLabel : null}
      />
    </div>
  )
}
