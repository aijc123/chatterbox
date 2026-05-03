/**
 * Public route contracts that previously had no test coverage.
 *
 *   - POST /memes               : same content_hash twice → dedup, no second row
 *   - POST /memes/bulk-mirror   : oversize batch → 413, missing source → 422
 *   - POST /memes/bulk-mirror   : per-IP rate limit → 429
 *   - GET  /memes?source=cb     : returns only source_origin='cb' rows
 *
 * No mocking of internals — exercises the real Hono pipeline against
 * a real (empty) D1 instance booted by @cloudflare/vitest-pool-workers.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { env, SELF } from 'cloudflare:test'

async function clearAllTables(): Promise<void> {
  await env.DB.exec('DELETE FROM meme_tags')
  await env.DB.exec('DELETE FROM contributions')
  await env.DB.exec('DELETE FROM memes')
  await env.DB.exec('DELETE FROM upstream_sbhzm_cache')
}

beforeEach(clearAllTables)
afterEach(clearAllTables)

describe('POST /memes — submission + dedup', () => {
  test('first submission inserts a row with status=pending', async () => {
    const r = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'hello world' }),
    })
    expect(r.status).toBe(201)
    const body = (await r.json()) as { id: number; status: string; dedup: boolean }
    expect(body.status).toBe('pending')
    expect(body.dedup).toBe(false)
    expect(body.id).toBeGreaterThan(0)

    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM memes').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })

  test('second submission of same content_hash is deduped (no new row)', async () => {
    const first = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'twice me' }),
    })
    expect(first.status).toBe(201)
    const firstBody = (await first.json()) as { id: number }

    const second = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Different surface form — `Twice  Me` — but normalizeContent collapses
      // it to the same hash, which is exactly what dedup is supposed to catch.
      body: JSON.stringify({ content: '  Twice  Me  ' }),
    })
    expect(second.status).toBe(200)
    const secondBody = (await second.json()) as { id: number; dedup: boolean }
    expect(secondBody.dedup).toBe(true)
    expect(secondBody.id).toBe(firstBody.id)

    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM memes').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })

  test('content too short → 422', async () => {
    const r = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '  ' }),
    })
    expect(r.status).toBe(422)
  })

  test('content > 200 chars → 422', async () => {
    const r = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'a'.repeat(201) }),
    })
    expect(r.status).toBe(422)
  })

  test('invalid JSON body → 400', async () => {
    const r = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    expect(r.status).toBe(400)
  })
})

describe('POST /memes/bulk-mirror — input validation', () => {
  test('source missing or invalid → 422', async () => {
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [], source: 'something-else' }),
    })
    expect(r.status).toBe(422)
  })

  test('empty items array → 200, all zeroes', async () => {
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [], source: 'laplace' }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { inserted: number; total: number }
    expect(body.inserted).toBe(0)
    expect(body.total).toBe(0)
  })

  test('batch > 200 items → 413', async () => {
    const items = Array.from({ length: 201 }, (_, i) => ({ content: `item-${i}` }))
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items, source: 'laplace' }),
    })
    expect(r.status).toBe(413)
  })

  test('happy path: 2 valid items inserted as approved with source_origin=laplace', async () => {
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'laplace',
        items: [
          { content: 'mirror-one', id: 101 },
          { content: 'mirror-two', id: 102 },
        ],
      }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { inserted: number; total: number }
    expect(body.inserted).toBe(2)
    expect(body.total).toBe(2)

    const rows = await env.DB.prepare(
      "SELECT content, source_origin, status FROM memes WHERE source_origin = 'laplace' ORDER BY id"
    ).all<{ content: string; source_origin: string; status: string }>()
    expect(rows.results?.length).toBe(2)
    expect(rows.results?.[0]?.status).toBe('approved')
    expect(rows.results?.[0]?.source_origin).toBe('laplace')
  })

  test('rate limit: 60 prior mirror calls in past hour → 429', async () => {
    // Backfill 60 contributions rows with the SAME ip_hash that the request
    // will produce. The route hashes 'unknown' (no cf-connecting-ip header in
    // SELF.fetch) with the test salt; we must match exactly so the COUNT(*)
    // gate fires.
    //
    // We can't precompute the hash here without async, so insert via the
    // route once first to learn the ip_hash, then duplicate it 59 times.
    const seed = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'laplace', items: [{ content: 'rl-seed' }] }),
    })
    expect(seed.status).toBe(200)
    const ipHashRow = await env.DB.prepare("SELECT ip_hash FROM contributions WHERE action = 'mirror' LIMIT 1").first<{
      ip_hash: string
    }>()
    const ipHash = ipHashRow?.ip_hash ?? ''
    expect(ipHash).not.toBe('')
    const now = new Date().toISOString()

    // Insert 59 more rows (we already have 1 from the seed → total 60).
    for (let i = 0; i < 59; i++) {
      await env.DB.prepare(
        `INSERT INTO contributions (action, actor, ip_hash, created_at) VALUES ('mirror', 'public', ?, ?)`
      )
        .bind(ipHash, now)
        .run()
    }

    // The 61st (n+1) should trip the limit.
    const blocked = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'laplace', items: [{ content: 'rl-blocked' }] }),
    })
    expect(blocked.status).toBe(429)
    const body = (await blocked.json()) as { error: string }
    expect(body.error).toBe('rate_limited')
  })
})

describe('GET /memes?source=cb — source filter', () => {
  test('only returns rows whose source_origin matches the filter', async () => {
    // Insert one approved row per source.
    const insert = (content: string, src: 'cb' | 'laplace' | 'sbhzm', hashSuffix: string) =>
      env.DB.prepare(
        `INSERT INTO memes (uid, content, status, content_hash, source_origin, created_at, updated_at)
         VALUES (0, ?, 'approved', ?, ?, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
      )
        .bind(content, `hash-${hashSuffix}`, src)
        .run()

    await insert('cb-only', 'cb', 'cb1')
    await insert('laplace-only', 'laplace', 'lp1')
    await insert('sbhzm-only', 'sbhzm', 'sb1')

    const r = await SELF.fetch('http://example.com/memes?source=cb')
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      items: Array<{ content: string; _source: string }>
      total: number
      sources: { cb: boolean; laplace: boolean; sbhzm: boolean }
    }
    expect(body.total).toBe(1)
    expect(body.items[0]?._source).toBe('cb')
    expect(body.items[0]?.content).toBe('cb-only')
    expect(body.sources.cb).toBe(true)
    expect(body.sources.laplace).toBe(false)
  })
})
