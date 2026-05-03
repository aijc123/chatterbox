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
