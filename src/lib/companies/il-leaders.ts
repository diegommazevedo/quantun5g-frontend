export type IlLeaderInput = { name: string; email: string }

export function parseIlLeadersJson(raw: string | null): IlLeaderInput[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        const o = item as { name?: string; email?: string }
        return {
          name: (o.name ?? '').trim(),
          email: (o.email ?? '').trim().toLowerCase(),
        }
      })
      .filter((l) => l.name && l.email && l.email.includes('@'))
  } catch {
    return []
  }
}

export function validateIlLeaders(leaders: IlLeaderInput[]): string | null {
  if (leaders.length === 0) {
    return 'Cadastre ao menos um líder IL (nome e e-mail).'
  }
  const emails = new Set<string>()
  for (const l of leaders) {
    if (emails.has(l.email)) return `E-mail duplicado na liderança: ${l.email}`
    emails.add(l.email)
  }
  return null
}
