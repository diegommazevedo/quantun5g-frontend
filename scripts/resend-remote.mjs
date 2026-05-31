/**
 * Resend — consulta remota (domínio + teste de envio).
 *
 * Chave "send only" (padrão produção):
 *   npm run resend:send-test -- seu@email.com
 *
 * Chave "Full access" (setup) — também domínio/verify:
 *   RESEND_ADMIN_API_KEY=re_... npm run resend:domain
 *
 * Variáveis (.env.local):
 *   RESEND_API_KEY          — envio (obrigatória)
 *   RESEND_ADMIN_API_KEY    — opcional, full access para GET/verify domains
 *   QUANTUM_EMAIL_FROM      — remetente
 */

const DOMAIN_ID = process.env.RESEND_DOMAIN_ID ?? '4b6512d2-b7e2-4b55-a929-c172f01669ee'

function apiKey(admin = false) {
  const key = admin
    ? process.env.RESEND_ADMIN_API_KEY ?? process.env.RESEND_API_KEY
    : process.env.RESEND_API_KEY
  if (!key) {
    console.error('Defina RESEND_API_KEY no .env.local')
    process.exit(1)
  }
  return key
}

async function resend(path, { method = 'GET', body, admin = false } = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey(admin)}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

function printRecords(domain) {
  const records = domain?.records ?? []
  if (records.length === 0) {
    console.log('(sem records no payload — veja status geral)')
    return
  }
  for (const r of records) {
    const st = r.status ?? r.verification?.status ?? '?'
    console.log(`  ${st.padEnd(10)} ${r.type ?? '?'} ${r.name ?? ''} → ${(r.value ?? r.content ?? '').slice(0, 60)}`)
  }
}

async function cmdDomain(verify = false) {
  if (verify) {
    const { status, json } = await resend(`/domains/${DOMAIN_ID}/verify`, {
      method: 'POST',
      admin: true,
    })
    console.log('POST verify:', status, JSON.stringify(json, null, 2))
  }

  const { status, json } = await resend(`/domains/${DOMAIN_ID}`, { admin: true })
  if (status === 401 && json?.name === 'restricted_api_key') {
    console.error(`
Chave atual é "send only" — não consulta domínios pela API.

No Resend: API Keys → Create → Full access → salve como:
  RESEND_ADMIN_API_KEY=re_...  (.env.local)

Ou verifique no painel: https://resend.com/domains
`)
    process.exit(1)
  }

  console.log('GET domain:', status)
  console.log('  name:', json.name)
  console.log('  status:', json.status)
  console.log('  region:', json.region)
  printRecords(json)
}

async function cmdSendTest(to) {
  const from = process.env.QUANTUM_EMAIL_FROM ?? 'Quantum5G <convites@mail.quantun5g.com.br>'
  const { status, json } = await resend('/emails', {
    method: 'POST',
    body: {
      from,
      to: [to],
      subject: 'Quantum5G — teste Resend',
      text: `Teste de envio ${new Date().toISOString()}\nDomínio: mail.quantun5g.com.br`,
    },
  })
  console.log('POST /emails:', status, JSON.stringify(json, null, 2))
  if (status >= 400) process.exit(1)
  console.log('\nOK — confira inbox e Resend → Emails → Delivered')
}

const cmd = process.argv[2] ?? 'help'
const arg = process.argv[3]

if (cmd === 'domain') {
  await cmdDomain(false)
} else if (cmd === 'verify') {
  await cmdDomain(true)
} else if (cmd === 'send-test') {
  if (!arg?.includes('@')) {
    console.error('Uso: npm run resend:send-test -- email@exemplo.com')
    process.exit(1)
  }
  await cmdSendTest(arg)
} else {
  console.log(`Uso:
  node --env-file=.env.local scripts/resend-remote.mjs domain
  node --env-file=.env.local scripts/resend-remote.mjs verify
  node --env-file=.env.local scripts/resend-remote.mjs send-test seu@email.com

npm:
  npm run resend:domain
  npm run resend:verify
  npm run resend:send-test -- seu@email.com
`)
}
