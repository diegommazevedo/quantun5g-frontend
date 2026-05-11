import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string
      email?: string
      company?: string
      phone?: string
      collaborators?: string
      message?: string
      source?: string
    }
    const name = (body.name || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const company = (body.company || '').trim()
    if (name.length < 2) {
      return NextResponse.json({ error: 'Indique o nome completo.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }
    if (company.length < 2) {
      return NextResponse.json({ error: 'Indique a empresa.' }, { status: 400 })
    }
    const payload = {
      name,
      email,
      company,
      phone: (body.phone || '').trim(),
      collaborators: (body.collaborators || '').trim(),
      message: (body.message || '').trim().slice(0, 4000),
      source: body.source || 'lp_nr01',
      receivedAt: new Date().toISOString(),
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[lp/lead]', payload)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
}
