/**
 * Health check leve — uso opcional em cron de warm-up (Vercel).
 * Sem auth, sem DB; não expõe segredos.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() }, { status: 200 })
}
