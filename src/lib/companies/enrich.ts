import type { Company } from '@/types/database'
import type { EmpresaGridRow } from '@/components/nr01/EmpresaGrid'

export async function enrichCompaniesWithIlCounts(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  companies: Company[],
): Promise<EmpresaGridRow[]> {
  const ids = companies.map((c) => c.id)
  const leaderCount: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: leaders } = await supabase
      .from('company_contacts')
      .select('company_id, contact_role')
      .in('company_id', ids)
      .eq('is_active', true)
    for (const l of leaders ?? []) {
      const row = l as { company_id: string; contact_role: string }
      if (row.contact_role === 'leader') {
        leaderCount[row.company_id] = (leaderCount[row.company_id] ?? 0) + 1
      }
    }
  }
  return companies.map((co) => ({
    ...co,
    il_leaders_count: leaderCount[co.id] ?? (co.il_leader_name ? 1 : 0),
  }))
}
