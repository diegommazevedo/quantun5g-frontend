/**
 * Parseia linhas de e-mail coladas no onboarding self-service.
 * Formatos: email@empresa.com | Nome <email@empresa.com> | Nome, email@empresa.com
 */

export interface ParsedCollaboratorEmail {
  full_name: string
  email: string
}

const MAX_LINES = 500

export function parseCollaboratorEmails(raw: string | null | undefined): ParsedCollaboratorEmail[] {
  if (!raw?.trim()) return []

  const seen = new Set<string>()
  const results: ParsedCollaboratorEmail[] = []

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let fullName = 'Colaborador'
    let email = trimmed

    const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
    if (angle) {
      fullName = angle[1].trim() || fullName
      email = angle[2].trim()
    } else if (trimmed.includes(',')) {
      const [namePart, emailPart] = trimmed.split(',').map((s) => s.trim())
      if (namePart && emailPart?.includes('@')) {
        fullName = namePart
        email = emailPart
      }
    } else if (trimmed.includes('@')) {
      email = trimmed
      const local = trimmed.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
      if (local) fullName = local
    }

    email = email.toLowerCase()
    if (!email.includes('@') || seen.has(email)) continue

    seen.add(email)
    results.push({ full_name: fullName, email })

    if (results.length >= MAX_LINES) break
  }

  return results
}
