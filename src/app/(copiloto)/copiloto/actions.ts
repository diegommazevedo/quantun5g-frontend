'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getPageActor } from '@/lib/org/page-actor'
import { scoreCrmAccount } from '@/lib/copiloto/score'

export async function rescoreMyAccounts() {
  const { user, db } = await getPageActor()
  const { data: accounts } = await db
    .from('crm_accounts')
    .select(
      'id, name, avg_ticket, purchase_cycle_days, last_purchase_at, last_contact_at, crm_deals(title, stage, next_step_at)',
    )
    .eq('owner_user_id', user.id)

  for (const raw of accounts ?? []) {
    const a = raw as {
      id: string
      name: string
      avg_ticket: number | null
      purchase_cycle_days: number | null
      last_purchase_at: string | null
      last_contact_at: string | null
      crm_deals: Array<{ title: string; stage: string; next_step_at: string | null }> | null
    }
    const open = (a.crm_deals ?? []).find((d) => d.stage === 'open' || d.stage === 'proposal')
    const scored = scoreCrmAccount({
      id: a.id,
      name: a.name,
      avgTicket: a.avg_ticket,
      purchaseCycleDays: a.purchase_cycle_days,
      lastPurchaseAt: a.last_purchase_at,
      lastContactAt: a.last_contact_at,
      openDealNextStepAt: open?.next_step_at ?? null,
      openDealTitle: open?.title ?? null,
    })
    await db.from('crm_scores').upsert(
      {
        account_id: scored.accountId,
        score: scored.score,
        reasons: scored.reasons,
        suggested_action: scored.suggestedAction,
        scored_at: new Date().toISOString(),
      } as never,
      { onConflict: 'account_id' },
    )
  }

  revalidatePath('/copiloto')
  redirect('/copiloto?scored=1')
}

export async function importCrmCsv(formData: FormData) {
  const { user, db } = await getPageActor()
  const raw = String(formData.get('csv') ?? '')
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    redirect('/copiloto/importar?error=Cole+um+CSV+com+cabecalho+e+ao+menos+1+linha')
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const nameI = idx('name')
  if (nameI < 0) redirect('/copiloto/importar?error=Coluna+name+obrigatoria')

  let imported = 0
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const name = cols[nameI]
    if (!name) continue

    const get = (col: string) => {
      const i = idx(col)
      return i >= 0 ? cols[i] || null : null
    }

    const cycleRaw = get('purchase_cycle_days')
    const ticketRaw = get('avg_ticket')

    const { data: acc, error } = await db
      .from('crm_accounts')
      .insert({
        owner_user_id: user.id,
        name,
        segment: get('segment'),
        avg_ticket: ticketRaw ? Number(ticketRaw) : null,
        purchase_cycle_days: cycleRaw ? Number(cycleRaw) : 30,
        last_purchase_at: get('last_purchase_at'),
        last_contact_at: get('last_contact_at'),
        notes: get('notes'),
      } as never)
      .select('id')
      .single()

    if (error || !acc) continue
    imported++

    const email = get('email')
    const phone = get('phone')
    const contactName = get('contact_name') ?? name
    if (email || phone) {
      await db.from('crm_contacts').insert({
        account_id: (acc as { id: string }).id,
        name: contactName,
        email,
        phone,
        is_primary: true,
      } as never)
    }
  }

  revalidatePath('/copiloto')
  redirect(`/copiloto/importar?ok=${imported}`)
}

export async function logCrmActivity(formData: FormData) {
  const { user, db } = await getPageActor()
  const accountId = String(formData.get('account_id') ?? '')
  const kind = String(formData.get('kind') ?? 'note')
  const summary = String(formData.get('summary') ?? '').trim()
  if (!accountId || !summary) redirect(`/copiloto/conta/${accountId}?error=resumo`)

  await db.from('crm_activities').insert({
    account_id: accountId,
    actor_user_id: user.id,
    kind,
    summary,
  } as never)

  await db
    .from('crm_accounts')
    .update({
      last_contact_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', accountId)
    .eq('owner_user_id', user.id)

  revalidatePath(`/copiloto/conta/${accountId}`)
  revalidatePath('/copiloto')
  redirect(`/copiloto/conta/${accountId}?saved=1`)
}
