'use client'

import { useState } from 'react'
import type {
  AdminCompanyOption,
  AdminConsultantOption,
  UserVinculosBundle,
} from '@/lib/admin/user-vinculos'

export interface OrgAccountOption {
  id: string
  name: string
  owner_user_id: string
  consultant_id: string
}

function formatCnpj(cnpj: string | null) {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '—'
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

function CompanyCheckboxes({
  companies,
  selected,
  filterOrgId,
}: {
  companies: AdminCompanyOption[]
  selected: string[]
  filterOrgId?: string | null
}) {
  const list = filterOrgId
    ? companies.filter((c) => c.org_account_id === filterOrgId || selected.includes(c.id))
    : companies

  if (list.length === 0) {
    return <p className="text-xs text-zinc-500">Nenhuma empresa disponível.</p>
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3 text-sm">
      {list.map((c) => (
        <label key={c.id} className="flex items-start gap-2">
          <input
            type="checkbox"
            name="company_ids"
            value={c.id}
            defaultChecked={selected.includes(c.id)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">{c.name}</span>
            <span className="block font-mono text-xs text-zinc-500">{formatCnpj(c.cnpj)}</span>
          </span>
        </label>
      ))}
    </div>
  )
}

function GerenteVinculosSection({
  vinculos,
  companies,
  orgAccounts,
}: {
  vinculos: UserVinculosBundle
  companies: AdminCompanyOption[]
  orgAccounts: OrgAccountOption[]
}) {
  const g = vinculos.gerente
  const [gerenteOrgId, setGerenteOrgId] = useState(g?.orgAccountId ?? '')

  return (
    <div className="space-y-3 border-t border-zinc-100 pt-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Filiais do gerente</h3>
        <p className="mt-1 text-xs text-zinc-500">
          CNPJs que este gerente pode operar dentro da organização.
        </p>
      </div>
      <input type="hidden" name="gerente_member_id" value={g?.memberId ?? ''} />
      <div>
        <label className="block text-xs font-medium text-zinc-600">Organização</label>
        <select
          name="gerente_org_id"
          value={gerenteOrgId}
          onChange={(e) => setGerenteOrgId(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {orgAccounts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      {gerenteOrgId ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Filiais atribuídas</label>
          <CompanyCheckboxes
            companies={companies}
            selected={g?.companyIds ?? []}
            filterOrgId={gerenteOrgId}
          />
        </div>
      ) : (
        <p className="text-xs text-amber-700">
          Selecione a organização para listar as filiais disponíveis.
        </p>
      )}
    </div>
  )
}

interface Props {
  userId: string
  role: string
  vinculos: UserVinculosBundle
  companies: AdminCompanyOption[]
  consultants: AdminConsultantOption[]
  orgAccounts: OrgAccountOption[]
}

export function UserVinculosForm({ userId, role, vinculos, companies, consultants, orgAccounts }: Props) {
  if (role === 'admin') {
    return (
      <p className="text-xs text-zinc-500">
        Administradores têm acesso a todas as empresas da plataforma.
      </p>
    )
  }

  if (role === 'consultant') {
    const selected = vinculos.consultantCompanyIds
    const transferOptions = consultants.filter((c) => c.id !== userId)
    const defaultTransfer = transferOptions[0]?.id ?? ''

    return (
      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Empresas vinculadas (operador licenciado)</h3>
          <p className="mt-1 text-xs text-zinc-500">
            CNPJs que este consultor opera na plataforma ({selected.length} ativos).
          </p>
        </div>
        <CompanyCheckboxes companies={companies} selected={selected} />
        {transferOptions.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Ao desvincular, transferir para
            </label>
            <select
              name="transfer_consultant_id"
              defaultValue={defaultTransfer}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              {transferOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  if (role === 'contratante' || role === 'leader') {
    const c = vinculos.contratante
    return (
      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Organização multi-CNPJ</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Grupo contratual do cliente e filiais que o contratante gerencia.
          </p>
        </div>
        <input type="hidden" name="org_id" value={c?.orgId ?? ''} />
        <input
          name="org_name"
          required
          defaultValue={c?.orgName ?? ''}
          placeholder="Nome do grupo (ex.: Grupo Pasola)"
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <div>
          <label className="block text-xs font-medium text-zinc-600">Consultor operador (licença)</label>
          <select
            name="org_consultant_id"
            defaultValue={c?.consultantId ?? consultants[0]?.id}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          >
            {consultants.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name ?? x.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Filiais (CNPJs) do grupo</label>
          <CompanyCheckboxes companies={companies} selected={c?.companyIds ?? []} />
        </div>
      </div>
    )
  }

  if (role === 'gerente') {
    return (
      <GerenteVinculosSection
        vinculos={vinculos}
        companies={companies}
        orgAccounts={orgAccounts}
      />
    )
  }

  return (
    <p className="border-t border-zinc-100 pt-4 text-xs text-zinc-500">
      Este papel não possui vínculo direto com empresas.
    </p>
  )
}
