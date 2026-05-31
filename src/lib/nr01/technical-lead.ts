/**
 * Responsável técnico (RT) assinante — por empresa, com snapshot na avaliação/laudo.
 */

export interface TechnicalLeadDisplay {
  name: string
  crp: string | null
  profession: string | null
  email: string | null
}

export interface CompanyTechnicalLeadSource {
  technical_lead_name?: string | null
  technical_lead_crp?: string | null
  technical_lead_profession?: string | null
  technical_lead_email?: string | null
}

export interface AssessmentTechnicalLeadSnapshot {
  technical_lead_name?: string | null
  technical_lead_crp?: string | null
  technical_lead_profession?: string | null
}

export function companyHasTechnicalLead(company: CompanyTechnicalLeadSource): boolean {
  return Boolean(
    company.technical_lead_name?.trim() && company.technical_lead_crp?.trim(),
  )
}

export function technicalLeadFromCompany(
  company: CompanyTechnicalLeadSource,
): TechnicalLeadDisplay | null {
  if (!company.technical_lead_name?.trim()) return null
  return {
    name: company.technical_lead_name.trim(),
    crp: company.technical_lead_crp?.trim() || null,
    profession: company.technical_lead_profession?.trim() || 'Psicólogo',
    email: company.technical_lead_email?.trim() || null,
  }
}

/** Prioridade: snapshot da avaliação → pacote de evidências → cadastro atual da empresa. */
export function resolveTechnicalLeadForLaudo(input: {
  assessment: AssessmentTechnicalLeadSnapshot
  company: CompanyTechnicalLeadSource | null
  evidencePack?: { technical_lead_name: string; technical_lead_crp: string | null } | null
}): TechnicalLeadDisplay {
  const fromAssessment =
    input.assessment.technical_lead_name?.trim()
      ? {
          name: input.assessment.technical_lead_name.trim(),
          crp: input.assessment.technical_lead_crp?.trim() || null,
          profession: input.assessment.technical_lead_profession?.trim() || 'Psicólogo',
          email: null,
        }
      : null

  if (fromAssessment) return fromAssessment

  if (input.evidencePack?.technical_lead_name?.trim()) {
    return {
      name: input.evidencePack.technical_lead_name.trim(),
      crp: input.evidencePack.technical_lead_crp?.trim() || null,
      profession: input.assessment.technical_lead_profession?.trim() || 'Psicólogo',
      email: null,
    }
  }

  const fromCompany = input.company ? technicalLeadFromCompany(input.company) : null
  if (fromCompany) return fromCompany

  return {
    name: 'Responsável técnico não cadastrado',
    crp: null,
    profession: null,
    email: null,
  }
}

export function formatTechnicalLeadLine(rt: TechnicalLeadDisplay): string {
  const parts = [rt.name]
  if (rt.profession) parts.push(rt.profession)
  if (rt.crp) parts.push(rt.crp)
  return parts.join(' · ')
}

export function snapshotTechnicalLeadPayload(
  company: CompanyTechnicalLeadSource,
): AssessmentTechnicalLeadSnapshot {
  return {
    technical_lead_name: company.technical_lead_name?.trim() || null,
    technical_lead_crp: company.technical_lead_crp?.trim() || null,
    technical_lead_profession: company.technical_lead_profession?.trim() || 'Psicólogo',
  }
}
