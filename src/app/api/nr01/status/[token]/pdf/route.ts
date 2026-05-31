/**
 * QUANTUM5G — NR-01 · PDF público via token
 *
 * GET /api/nr01/status/[token]/pdf
 *
 * Acessível sem login. Valida token ativo (revoked_at IS NULL).
 * Apenas serve PDF se a avaliação já teve PDF emitido pelo menos uma
 * vez (evidence_pack.pdf_sha256 IS NOT NULL) — caso contrário 404,
 * para evitar que o cliente baixe um documento "incompleto".
 *
 * Esta rota REGENERA o PDF a cada request (sem armazenamento). O hash
 * original em evidence_pack.pdf_sha256 permanece imutável. Quando
 * Supabase Storage entrar (próxima onda), passa a servir o original.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { loadLaudoData } from '@/lib/nr01/pdf-data'
import { buildLaudoHtml } from '@/lib/nr01/pdf-template'
import { launchPdfBrowser } from '@/lib/nr01/launch-pdf-browser'
import { hashIp } from '@/lib/nr01/evidence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params
  const supabase = await createClient()

  // 1. Valida token
  const { data: tokenData } = await supabase
    .from('nr01_public_status_tokens')
    .select('id, assessment_id, revoked_at')
    .eq('token', token)
    .maybeSingle()

  if (!tokenData || (tokenData as { revoked_at: string | null }).revoked_at) {
    return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
  }
  const t = tokenData as { id: string; assessment_id: string }

  // 2. Carrega dados
  const data = await loadLaudoData(supabase, t.assessment_id)
  if (!data) {
    return NextResponse.json({ error: 'Avaliação não encontrada.' }, { status: 404 })
  }

  // 3. Bloqueia se PDF nunca foi gerado pelo consultor (evidência incompleta)
  if (!data.evidencePack?.pdf_sha256) {
    return NextResponse.json(
      { error: 'Laudo técnico ainda não emitido pelo responsável técnico.' },
      { status: 404 },
    )
  }

  if (data.assessment.status !== 'CONCLUIDO') {
    return NextResponse.json(
      { error: 'PDF disponível apenas após conclusão da avaliação.' },
      { status: 400 },
    )
  }

  const html = buildLaudoHtml(data)

  // 4. Playwright
  let pdfBuffer: Buffer
  let browser: Awaited<ReturnType<typeof launchPdfBrowser>> | null = null
  try {
    browser = await launchPdfBrowser()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 })
    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      preferCSSPageSize: true,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha ao gerar PDF.', detail: (err as Error).message },
      { status: 500 },
    )
  } finally {
    if (browser) await browser.close().catch(() => {})
  }

  // 5. Audit (sem mexer no pdf_sha256 original)
  const sha256Now = createHash('sha256').update(pdfBuffer).digest('hex')
  const fwd = request.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? null
  const ua = request.headers.get('user-agent') ?? null

  await supabase.from('nr01_audit_log').insert({
    assessment_id: t.assessment_id,
    actor_id: null,
    actor_role: 'collaborator',
    event_type: 'PUBLIC_STATUS_PDF_DOWNLOADED',
    payload: {
      token_id: t.id,
      regen_sha256: sha256Now,
      original_sha256: data.evidencePack.pdf_sha256,
    },
    ip_hash: hashIp(ip, t.assessment_id),
    user_agent: ua,
  } as never)

  const filename = `laudo-nr01-${(data.assessment.companies?.name ?? 'empresa')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-PDF-Original-SHA256': data.evidencePack.pdf_sha256,
      'Cache-Control': 'private, no-cache',
    },
  })
}
