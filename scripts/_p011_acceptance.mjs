/**
 * QUANTUM5G — P011 acceptance tests (pseudonimização HMAC-SHA256)
 *
 * Valida três comportamentos críticos das funções hashIp e hashEmail
 * sem precisar startar o servidor:
 *
 *   1. HMAC produz outputs distintos quando qualquer input muda
 *      (chave, escopo/assessmentId, identificador)
 *   2. Funções lançam erro claro quando env var ausente (fail loud)
 *   3. Funções rejeitam salt curto (< 64 chars hex = 32 bytes)
 *
 * Rodar com: npx tsx scripts/_p011_acceptance.mjs
 * (tsx resolve imports .ts automaticamente como runtime — não precisa build)
 */

const { hashIp } = await import('../src/lib/nr01/evidence.ts')
const { hashEmail } = await import('../src/lib/nr01/pulse.ts')

let pass = 0
let fail = 0
const log = (ok, msg) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}`)
  ok ? pass++ : fail++
}
const expect = (cond, msg) => log(!!cond, msg)

const KEY1 = 'a'.repeat(64)
const KEY2 = 'b'.repeat(64)

// ============================================================
// 1. HMAC behavior — diferente para cada input distinto
// ============================================================
console.log('\n[1] HMAC se comporta como esperado')

process.env.NR01_IP_HASH_SALT = KEY1
const h1 = hashIp('1.1.1.1', 'uuid-x')
expect(typeof h1 === 'string' && h1.length === 64, 'hashIp produz hex 64 chars')

const h3 = hashIp('1.1.1.1', 'uuid-y')
expect(h1 !== h3, 'hashIp muda quando assessmentId muda')

const h4 = hashIp('2.2.2.2', 'uuid-x')
expect(h1 !== h4, 'hashIp muda quando IP muda')

process.env.NR01_IP_HASH_SALT = KEY2
const h2 = hashIp('1.1.1.1', 'uuid-x')
expect(h1 !== h2, 'hashIp muda quando chave (salt) muda')
console.log(`   Mesmo IP+scope, key diferente: ${h1.slice(0, 8)}... vs ${h2.slice(0, 8)}...`)

process.env.NR01_EMAIL_HASH_SALT = KEY1
const e1 = hashEmail('alice@x.com', 'uuid-x')
expect(typeof e1 === 'string' && e1.length === 64, 'hashEmail produz hex 64 chars')

const e2 = hashEmail('alice@x.com', 'uuid-y')
expect(e1 !== e2, 'hashEmail muda quando assessmentId muda')

const e3 = hashEmail('bob@x.com', 'uuid-x')
expect(e1 !== e3, 'hashEmail muda quando email muda')

process.env.NR01_EMAIL_HASH_SALT = KEY2
const e4 = hashEmail('alice@x.com', 'uuid-x')
expect(e1 !== e4, 'hashEmail muda quando chave muda')

const e5 = hashEmail('  ALICE@X.COM  ', 'uuid-x')
process.env.NR01_EMAIL_HASH_SALT = KEY1
const e6 = hashEmail('alice@x.com', 'uuid-x')
process.env.NR01_EMAIL_HASH_SALT = KEY2
expect(e5 === e4, 'hashEmail normaliza trim+lowercase')

// ============================================================
// 2. Fail loud quando env ausente
// ============================================================
console.log('\n[2] Fail loud quando env ausente')

delete process.env.NR01_IP_HASH_SALT
try {
  hashIp('1.1.1.1', 'uuid-x')
  log(false, 'hashIp deveria ter lançado erro')
} catch (e) {
  expect(
    /NR01_IP_HASH_SALT não configurado/.test(e.message),
    'hashIp lança erro mencionando NR01_IP_HASH_SALT ausente',
  )
}

delete process.env.NR01_EMAIL_HASH_SALT
try {
  hashEmail('alice@x.com', 'uuid-x')
  log(false, 'hashEmail deveria ter lançado erro')
} catch (e) {
  expect(
    /NR01_EMAIL_HASH_SALT não configurado/.test(e.message),
    'hashEmail lança erro mencionando NR01_EMAIL_HASH_SALT ausente',
  )
}

// ============================================================
// 3. Validação de comprimento de salt
// ============================================================
console.log('\n[3] Rejeita salt curto')

process.env.NR01_IP_HASH_SALT = 'abc123'
try {
  hashIp('1.1.1.1', 'uuid-x')
  log(false, 'hashIp deveria rejeitar salt curto')
} catch (e) {
  expect(/muito curto/.test(e.message), 'hashIp rejeita salt < 64 chars')
}

process.env.NR01_EMAIL_HASH_SALT = 'abc123'
try {
  hashEmail('alice@x.com', 'uuid-x')
  log(false, 'hashEmail deveria rejeitar salt curto')
} catch (e) {
  expect(/muito curto/.test(e.message), 'hashEmail rejeita salt < 64 chars')
}

// ============================================================
// Sumário
// ============================================================
console.log(`\n=== ${pass}/${pass + fail} passaram ===`)
process.exit(fail === 0 ? 0 : 1)
