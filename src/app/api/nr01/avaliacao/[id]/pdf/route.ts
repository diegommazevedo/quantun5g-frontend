/**
 * QUANTUM5G — NR-01 · Geração de PDF via Playwright + Chromium serverless
 *
 * Estratégia:
 *  - Auth via SSR client (consultor dono ou admin)
 *  - Carrega dados via loadLaudoData
 *  - Monta HTML via buildLaudoHtml
 *  - Lança Chromium (Vercel: @sparticuz/chromium-min via CDN; local: PUPPETEER_EXECUTABLE_PATH se setada)
 *  - page.setContent(html) — sem fetch HTTP roundtrip, sem dor de auth
 *  - page.pdf({ format: 'A4', printBackground: true })
 *  - SHA-256, persiste no nr01_evidence_pack (cria linha mínima se não existir)
 *  - Audit log PDF_GENERATED
 *  - Devolve binary com Content-Disposition attachment
 *
 * Determinismo de hash: NÃO exigido (decisão Diego P4). O hash original
 * é calculado uma única vez por geração e fica imutável.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { loadLaudoData } from '@/lib/nr01/pdf-data'
import { buildLaudoHtml } from '@/lib/nr01/pdf-template'
import { launchPdfBrowser } from '@/lib/nr01/launch-pdf-browser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: assessmentId } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Carrega dados
  const data = await loadLaudoData(supabase, assessmentId)
  if (!data) {
    return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
  }

  // Permissão: consultor dono ou admin
  if (data.assessment.consultant_id !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((profile as { role?: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  if (data.assessment.status !== 'CONCLUIDO') {
    return NextResponse.json(
      { error: 'PDF disponível apenas após conclusão da avaliação.' },
      { status: 400 },
    )
  }

  const html = buildLaudoHtml(data)

  // ============================================================
  // PLAYWRIGHT
  // ============================================================
  let pdfBuffer: Buffer
  let pageCount = 0
  let browser: Awaited<ReturnType<typeof launchPdfBrowser>> | null = null

  try {
    browser = await launchPdfBrowser()
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    // setContent + waitUntil 'networkidle' garante que as fontes do Google
    // tenham terminado de carregar antes do PDF.
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 })

    pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      preferCSSPageSize: true,
    })

    // Estimativa simples de page count: ~40K bytes por página A4 com texto + CSS embed.
    // Não é exato (varia com conteúdo). Um valor melhor exige biblioteca extra.
    pageCount = Math.max(1, Math.ceil(pdfBuffer.length / 40000))
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Falha ao gerar PDF (Playwright/Chromium).',
        detail: (err as Error).message,
        hint: process.env.VERCEL
          ? 'Em Vercel: confirma que vercel.json libera memory ≥ 1024 e maxDuration ≥ 60. Verifica logs da função.'
          : 'Em dev: instale Chrome ou rode "npx playwright install chromium". Opcional: PUPPETEER_EXECUTABLE_PATH no .env.local.',
      },
      { status: 500 },
    )
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }

  // ============================================================
  // HASH + PERSISTÊNCIA
  // ============================================================
  const sha256 = createHash('sha256').update(pdfBuffer).digest('hex')
  const generatedAt = new Date().toISOString()
  const byteSize = pdfBuffer.length

  // Atualiza pacote de evidências (se já existe) ou cria linha mínima
  // (situação esperada: pacote já gerado em /avaliacao/[id] antes do PDF).
  const { data: existingPack } = await supabase
    .from('nr01_evidence_pack')
    .select('id, pdf_sha256')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (existingPack) {
    const e = existingPack as { id: string; pdf_sha256: string | null }
    // Se pdf_sha256 já existe, NÃO sobrescreve (Diego P4: hash original imutável).
    // Apenas atualiza pdf_generated_at + pdf_byte_size + pdf_page_count para tracking.
    if (e.pdf_sha256 == null) {
      await supabase
        .from('nr01_evidence_pack')
        .update({
          pdf_sha256: sha256,
          pdf_generated_at: generatedAt,
          pdf_byte_size: byteSize,
          pdf_page_count: pageCount,
        } as never)
        .eq('id', e.id)
    } else {
      // Regeneração: tracking só, sem mexer no hash original.
      await supabase
        .from('nr01_evidence_pack')
        .update({
          pdf_byte_size: byteSize,
          pdf_page_count: pageCount,
        } as never)
        .eq('id', e.id)
    }
  }
  // Se não existe pacote, deixa para o consultor gerar via fluxo normal —
  // não criamos pacote silenciosamente (ele exige hash do instrumento etc).

  // ============================================================
  // AUDIT
  // ============================================================
  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'PDF_GENERATED',
    payload: {
      pdf_sha256: sha256,
      pdf_byte_size: byteSize,
      pdf_page_count: pageCount,
      regeneration: existingPack && (existingPack as { pdf_sha256: string | null }).pdf_sha256 != null,
    },
  } as never)

  // ============================================================
  // RESPONSE
  // ============================================================
  const filename = `laudo-nr01-${(data.assessment.companies?.name ?? 'empresa')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}-${assessmentId.slice(0, 8)}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length.toString(),
      'X-PDF-SHA256': sha256,
    },
  })
}
