import { NextResponse } from 'next/server'

function suggestTier(collaborators: number) {
  const n = Math.min(5000, Math.max(10, Math.round(collaborators / 10) * 10))
  if (n <= 150) {
    return {
      tier: 'Essencial',
      summary: 'Volume típico para primeira avaliação NR-01 com laudo e plano base.',
      range: '10 a 150 colaboradores',
    }
  }
  if (n <= 800) {
    return {
      tier: 'Profissional',
      summary: 'Pacote Trino recomendado com evidências e audit log para SESMT maduro.',
      range: '151 a 800 colaboradores',
    }
  }
  if (n <= 2500) {
    return {
      tier: 'Enterprise',
      summary: 'Multi-setor ou multi-unidade — exige desenho amostral e governança dedicados.',
      range: '801 a 2500 colaboradores',
    }
  }
  return {
    tier: 'Enterprise+',
    summary: 'Grandes populações: k-anonymity, janelas de coleta e integração com RH críticos.',
    range: '2501+ colaboradores',
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { collaborators?: unknown }
    const raw = body.collaborators
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: 'Número de colaboradores inválido.' }, { status: 400 })
    }
    return NextResponse.json(suggestTier(n))
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }
}
