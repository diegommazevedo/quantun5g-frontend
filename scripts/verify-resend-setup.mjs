/**
 * Verifica setup Resend + webhook no projeto.
 * Uso: node --env-file=.env.local scripts/verify-resend-setup.mjs
 */

const required = ['RESEND_API_KEY', 'QUANTUM_EMAIL_FROM']
const recommended = ['PENTAGRAMA_EMAIL_FROM', 'NR01_EMAIL_FROM', 'RESEND_WEBHOOK_SECRET']
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

let ok = true

function line(label, status, detail = '') {
  const icon = status ? '✓' : '✗'
  if (!status) ok = false
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('Quantum5G — verificação Resend\n')

for (const k of required) {
  line(k, Boolean(process.env[k]?.trim()))
}

for (const k of recommended) {
  const v = process.env[k]?.trim()
  line(k, Boolean(v), v ? '' : 'recomendado para produção/webhook')
}

const devResend = process.env.EMAIL_USE_RESEND_IN_DEV === 'true'
line(
  'Driver em dev',
  process.env.NODE_ENV !== 'development' || devResend || !process.env.RESEND_API_KEY,
  process.env.NODE_ENV === 'development'
    ? devResend
      ? 'Resend (EMAIL_USE_RESEND_IN_DEV=true)'
      : 'console (adicione EMAIL_USE_RESEND_IN_DEV=true para Resend local)'
    : 'produção usa Resend se RESEND_API_KEY existir',
)

const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/resend`
console.log(`\nWebhook URL (cadastrar no Resend): ${webhookUrl}`)

if (!process.env.RESEND_WEBHOOK_SECRET?.trim()) {
  console.log('\n⚠ Sem RESEND_WEBHOOK_SECRET: envio funciona; entrega/bounce/abertura no app não atualizam.')
  console.log('  Resend → Webhooks → Add → copie whsec_... → .env.local e Vercel')
}

if (appUrl.includes('localhost') && process.env.RESEND_WEBHOOK_SECRET?.trim()) {
  console.log('\n⚠ Webhook local: Resend não alcança localhost — use ngrok ou configure só em produção.')
}

console.log('\nTeste de envio: npm run resend:send-test -- seu@email.com')

process.exit(ok ? 0 : 1)
