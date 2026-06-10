/**
 * Formulário unificado de empresa — NR-01 + Pentagrama (mesma tabela companies).
 */

import type { Company } from '@/types/database'
import type { IlLeaderRow } from '@/components/companies/IlLeadersEditor'
import type { CollaboratorRow } from '@/components/companies/CollaboratorsEditor'
import { CnpjInput } from '@/components/companies/CnpjInput'
import { IlLeadersEditor } from '@/components/companies/IlLeadersEditor'
import { CollaboratorsEditor } from '@/components/companies/CollaboratorsEditor'

interface Props {
  company?: Company
  ilLeaders?: IlLeaderRow[]
  collaborators?: CollaboratorRow[]
  /** Consultor/admin: vincula CNPJ ao usuário pagante (limite de slots do contrato). */
  showPayerEmail?: boolean
  payerEmailDefault?: string | null
}

export function EmpresaFormFields({
  company,
  ilLeaders,
  collaborators,
  showPayerEmail,
  payerEmailDefault,
}: Props) {
  return (
    <>
      {showPayerEmail && (
        <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
          <label htmlFor="account_user_email" className="block text-sm font-medium text-violet-900">
            E-mail pagante legado (admin — multi-CNPJ antigo)
          </label>
          <input
            id="account_user_email"
            name="account_user_email"
            type="email"
            defaultValue={payerEmailDefault ?? ''}
            placeholder="lider@grupopasola.com.br"
            className="block w-full rounded-lg border border-violet-200 px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-q-muted">
            Somente migração Pasola/legado. Em LICENSING_V2 os slots ficam no consultor licenciado;
            deixe vazio em cadastros novos.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Nome / razão social *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={company?.name ?? ''}
          placeholder="Ex: Quantum5G - Empresa Demo"
          className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="legal_name" className="block text-sm font-medium text-zinc-700">
            Razão social (opcional)
          </label>
          <input
            id="legal_name"
            name="legal_name"
            defaultValue={company?.legal_name ?? ''}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="trade_name" className="block text-sm font-medium text-zinc-700">
            Nome fantasia (opcional)
          </label>
          <input
            id="trade_name"
            name="trade_name"
            defaultValue={company?.trade_name ?? ''}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CnpjInput defaultValue={company?.cnpj} required />
        <div className="space-y-1.5">
          <label htmlFor="total_collaborators" className="block text-sm font-medium text-zinc-700">
            Total de colaboradores *
          </label>
          <input
            id="total_collaborators"
            name="total_collaborators"
            type="number"
            min={1}
            required
            defaultValue={company?.total_collaborators ?? ''}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="rh_contact_name" className="block text-sm font-medium text-zinc-700">
            Contato RH (nome)
          </label>
          <input
            id="rh_contact_name"
            name="rh_contact_name"
            defaultValue={company?.rh_contact_name ?? ''}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rh_contact_email" className="block text-sm font-medium text-zinc-700">
            Contato RH (e-mail)
          </label>
          <input
            id="rh_contact_email"
            name="rh_contact_email"
            type="email"
            defaultValue={company?.rh_contact_email ?? ''}
            className="block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <fieldset className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
        <legend className="px-1 text-sm font-semibold text-blue-900">
          Responsável técnico assinante (RT)
        </legend>
        <p className="text-xs text-q-muted">
          Profissional habilitado que assina laudos desta empresa (NR-01 e referência técnica
          Pentagrama). Obrigatório em todo cadastro.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="technical_lead_name" className="block text-sm font-medium text-zinc-700">
            Nome completo do RT *
          </label>
          <input
            id="technical_lead_name"
            name="technical_lead_name"
            required
            defaultValue={company?.technical_lead_name ?? ''}
            placeholder="Ex: Jovane Borlini da Silva"
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="technical_lead_profession" className="block text-sm font-medium text-zinc-700">
              Profissão / formação
            </label>
            <input
              id="technical_lead_profession"
              name="technical_lead_profession"
              defaultValue={company?.technical_lead_profession ?? 'Psicólogo'}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="technical_lead_crp" className="block text-sm font-medium text-zinc-700">
              Registro profissional (CRP) *
            </label>
            <input
              id="technical_lead_crp"
              name="technical_lead_crp"
              required
              defaultValue={company?.technical_lead_crp ?? ''}
              placeholder="Ex: CRP 16/4948"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="technical_lead_email" className="block text-sm font-medium text-zinc-700">
            E-mail profissional do RT
          </label>
          <input
            id="technical_lead_email"
            name="technical_lead_email"
            type="email"
            defaultValue={company?.technical_lead_email ?? ''}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm"
          />
        </div>
      </fieldset>

      <IlLeadersEditor initial={ilLeaders} minRows={1} />
      <CollaboratorsEditor initial={collaborators} />
    </>
  )
}
