/**
 * Admin auth gating — first server-side test for chatterbox-cloud.
 *
 * Covers requireAdmin's four contracts:
 *   1. No Authorization header               → 401
 *   2. Bearer token whose hash isn't in DB   → 401
 *   3. Bearer token row exists but revoked   → 401
 *   4. Bearer token valid, scopes='admin'    → 200
 *
 * Plus one negative-scope check for completeness:
 *   5. Bearer token valid, scopes='read'     → 403
 *
 * Uses GET /admin/pending — a pure DB read that doesn't trigger any
 * outbound network from the worker, so it's the cleanest gate-only probe.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { env, SELF } from 'cloudflare:test'
import { tokenHash } from '../lib/hash'

async function insertApiKey(label: string, plaintext: string, scopes = 'admin', revoked = false): Promise<void> {
  const hash = await tokenHash(plaintext)
  await env.DB.prepare(`INSERT INTO api_keys (label, key_hash, scopes, revoked_at) VALUES (?, ?, ?, ?)`)
    .bind(label, hash, scopes, revoked ? new Date().toISOString() : null)
    .run()
}

async function clearApiKeys(): Promise<void> {
  await env.DB.exec('DELETE FROM api_keys')
}

beforeEach(async () => {
  await clearApiKeys()
})

afterEach(async () => {
  await clearApiKeys()
})

describe('requireAdmin (via GET /admin/pending)', () => {
  test('no Authorization header → 401', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending')
    expect(r.status).toBe(401)
    const body = (await r.json()) as { error: string; detail?: string }
    expect(body.error).toBe('unauthorized')
  })

  test('non-Bearer Authorization → 401', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    })
    expect(r.status).toBe(401)
  })

  test('Bearer token with no matching row in api_keys → 401', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    })
    expect(r.status).toBe(401)
  })

  test('Bearer token whose row is revoked → 401', async () => {
    await insertApiKey('revoked-key', 'revoked-token-plaintext', 'admin', true)
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer revoked-token-plaintext' },
    })
    expect(r.status).toBe(401)
  })

  test('Bearer token valid + admin scope → 200', async () => {
    await insertApiKey('valid-admin', 'valid-admin-token')
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer valid-admin-token' },
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { items: unknown[]; total: number }
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  test('Bearer token valid but scope is not admin → 403', async () => {
    await insertApiKey('readonly-key', 'readonly-token', 'read')
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer readonly-token' },
    })
    expect(r.status).toBe(403)
    const body = (await r.json()) as { error: string }
    expect(body.error).toBe('forbidden')
  })

  test('Bearer token is whitespace-padded → trims and works', async () => {
    await insertApiKey('padded', 'padded-token')
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: '  Bearer   padded-token  ' },
    })
    expect(r.status).toBe(200)
  })
})

/**
 * 鉴权失败的审计日志:每次 401/403 都要在 contributions 写一行 action='auth_fail',
 * 否则被探测的频率/来源完全不可见。详见 audit Finding #4。
 */
describe('requireAdmin — audit log on failure', () => {
  beforeEach(async () => {
    await env.DB.exec('DELETE FROM contributions')
  })

  test('missing bearer → writes auth_fail row with reason=missing_bearer', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending')
    expect(r.status).toBe(401)
    const row = await env.DB.prepare("SELECT payload_json FROM contributions WHERE action = 'auth_fail'").first<{
      payload_json: string
    }>()
    expect(row).not.toBeNull()
    const payload = JSON.parse(row!.payload_json)
    expect(payload.reason).toBe('missing_bearer')
    expect(payload.path).toBe('/admin/pending')
    expect(payload.hashPrefix).toBeNull()
  })

  test('unknown bearer → writes auth_fail row with hash prefix only', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer some-bogus-token' },
    })
    expect(r.status).toBe(401)
    const row = await env.DB.prepare(
      "SELECT payload_json FROM contributions WHERE action = 'auth_fail' ORDER BY id DESC LIMIT 1"
    ).first<{ payload_json: string }>()
    expect(row).not.toBeNull()
    const payload = JSON.parse(row!.payload_json)
    expect(payload.reason).toBe('unknown_or_revoked')
    // hashPrefix = first 8 hex chars of sha-256(plaintext) — proves we logged a fingerprint
    // but stored nothing reversible.
    expect(typeof payload.hashPrefix).toBe('string')
    expect(payload.hashPrefix).toHaveLength(8)
  })

  test('valid bearer → no auth_fail row written', async () => {
    await insertApiKey('happy-path', 'happy-token')
    const r = await SELF.fetch('http://example.com/admin/pending', {
      headers: { Authorization: 'Bearer happy-token' },
    })
    expect(r.status).toBe(200)
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM contributions WHERE action = 'auth_fail'").first<{
      n: number
    }>()
    expect(row?.n).toBe(0)
  })
})

/**
 * CORS narrowing on /admin/* — admin UI is same-origin, no cross-origin caller has
 * any business hitting these endpoints. A wildcard CORS combined with a stolen Bearer
 * token would let any attacker page call admin APIs. Audit Finding #3.
 */
describe('CORS — /admin/* must not advertise wildcard origin', () => {
  test('OPTIONS /admin/pending from foreign origin → no Access-Control-Allow-Origin: *', async () => {
    const r = await SELF.fetch('http://example.com/admin/pending', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://attacker.example',
        'Access-Control-Request-Method': 'GET',
      },
    })
    // Either no CORS header at all, or one that doesn't grant the foreign origin.
    const allow = r.headers.get('Access-Control-Allow-Origin')
    expect(allow).not.toBe('*')
    expect(allow).not.toBe('https://attacker.example')
  })

  test('OPTIONS /memes (public) DOES advertise wildcard origin', async () => {
    // Sanity check: the narrowing didn't accidentally strip CORS from public routes.
    const r = await SELF.fetch('http://example.com/memes', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://live.bilibili.com',
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
