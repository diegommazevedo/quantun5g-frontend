import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { ParsedCollaboratorEmail } from '@/lib/nr01/parse-collaborator-emails'

const PG_UNIQUE_VIOLATION = '23505'

export interface SeedCompanyContactsResult {
  inserted: number
  skipped: number
}

export async function seedCompanyCollaborators(
  companyId: string,
  contacts: ParsedCollaboratorEmail[],
): Promise<SeedCompanyContactsResult> {
  if (!contacts.length) return { inserted: 0, skipped: 0 }

  const admin = createServiceRoleAdmin()
  let inserted = 0
  let skipped = 0

  for (const contact of contacts) {
    const { error } = await admin.from('company_contacts').insert({
      company_id: companyId,
      full_name: contact.full_name,
      email: contact.email,
      contact_role: 'collaborator',
    } as never)

    if (error?.code === PG_UNIQUE_VIOLATION) {
      skipped += 1
      continue
    }
    if (error) {
      console.warn('[seed-company-contacts] insert skipped:', error.message, contact.email)
      skipped += 1
      continue
    }
    inserted += 1
  }

  return { inserted, skipped }
}
