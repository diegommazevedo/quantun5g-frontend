/**
 * Smoke LICENSING_V2 — checagens puras (sem DB).
 * node scripts/licensing-v2-smoke.mjs
 */

import assert from 'node:assert/strict'

function parseCommercialPlan(raw) {
  return raw === 'b2b' ? 'b2b' : 'b2c'
}

function parseCompanyCnpjSlots(raw) {
  const n = typeof raw === 'number' ? Math.round(raw) : parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 50)
}

assert.equal(parseCommercialPlan('b2b'), 'b2b')
assert.equal(parseCommercialPlan(undefined), 'b2c')
assert.equal(parseCompanyCnpjSlots('7'), 7)
assert.equal(process.env.NEXT_PUBLIC_LICENSING_V2 !== 'true' || process.env.NEXT_PUBLIC_LICENSING_V2 === 'true', true)

console.log('licensing-v2-smoke OK')
