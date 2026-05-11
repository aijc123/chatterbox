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

  test('rate limit: 30 prior submits in past hour from same ip → 429 + Retry-After', async () => {
    // Same backfill trick as bulk-mirror: seed one real submit so we learn the ip_hash
    // SELF.fetch produces, then duplicate the contributions row up to the limit.
    // Audit Finding #5.
    const seed = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'seed-row' }),
    })
    expect(seed.status).toBe(201)
    const ipHashRow = await env.DB.prepare("SELECT ip_hash FROM contributions WHERE action = 'submit' LIMIT 1").first<{
      ip_hash: string
    }>()
    const ipHash = ipHashRow?.ip_hash ?? ''
    expect(ipHash).not.toBe('')
    const now = new Date().toISOString()

    // Pad to exactly 30 submit rows in the last hour. Seed counted as 1 → insert 29 more.
    for (let i = 0; i < 29; i++) {
      await env.DB.prepare(
        `INSERT INTO contributions (action, actor, ip_hash, created_at) VALUES ('submit', 'public', ?, ?)`
      )
        .bind(ipHash, now)
        .run()
    }

    // The 31st submit should trip the limit.
    const blocked = await SELF.fetch('http://example.com/memes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'blocked-row' }),
    })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBe('3600')
    const body = (await blocked.json()) as { error: string }
    expect(body.error).toBe('rate_limited')
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

  test('tags in mirror payload only attach to net-new memes (IDOR fix)', async () => {
    // 安全:之前 bulk-mirror 会用 content_hash 把 tag attach 到 *任意已存在的*
    // approved meme,这是 IDOR——攻击者可以提交一个 content 等于已知 meme 的
    // 包,把任意 tag(slur/色情/政治词)涂到老行上。现在 attachTagsByHash
    // 仅作用于 "本次新插入" 的 meme;预先存在的行不会被改。
    // 历史回填 tag 走 admin 路径或 cron,不走 public bulk-mirror。
    await env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, created_at, updated_at)
       VALUES (0, 'pre-existing meme', 'approved', ?, 'sbhzm', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    )
      .bind(await (await import('../lib/hash')).contentHash('pre-existing meme'))
      .run()

    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'sbhzm',
        items: [
          // 1) 试图给老行涂 tag —— 必须被忽略。
          { content: 'pre-existing meme', tags: [{ name: '搞笑', color: 'red', emoji: '😂' }] },
          // 2) 全新一行 —— tag 正常落表。
          { content: 'fresh-row', tags: [{ name: '搞笑' }, { name: '问候' }] },
        ],
      }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { inserted: number; tagsLinked: number; total: number }
    expect(body.inserted).toBe(1) // 只有 fresh-row 是新插
    expect(body.tagsLinked).toBe(2) // 仅 fresh-row×2(pre-existing 的 tag 被丢)
    expect(body.total).toBe(2)

    // tags 表里 '搞笑' 是从 fresh-row 那条带过来的(color/emoji 为 null,因为
    // upsertTagsWithMeta 用 *第一个* 出现的 meta;迭代顺序保证 pre-existing 的
    // {color: red, emoji: 😂} 是首个写入,所以 '搞笑' 仍然有 color/emoji ——
    // tag 元数据的 upsert 路径和 meme→tag 链接路径是分开的,upsert 不受
    // attach-only-on-new 的过滤影响。这是预期行为:tag 元数据池可以由任何
    // mirror 调用扩充,只是没法把 tag 强行绑到老 meme 上。
    const tags = await env.DB.prepare('SELECT name, color, emoji FROM tags ORDER BY name').all<{
      name: string
      color: string | null
      emoji: string | null
    }>()
    expect(tags.results?.length).toBe(2)
    const xiaogao = tags.results?.find(t => t.name === '搞笑')
    expect(xiaogao?.color).toBe('red')
    expect(xiaogao?.emoji).toBe('😂')

    // meme_tags 总条数 = 2(只有 fresh-row)。pre-existing 行没有任何链接。
    const linkCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM meme_tags').first<{ n: number }>()
    expect(linkCount?.n).toBe(2)
    const preLinks = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM meme_tags
         WHERE meme_id = (SELECT id FROM memes WHERE content = 'pre-existing meme')`
    ).first<{ n: number }>()
    expect(preLinks?.n).toBe(0)
  })

  test('tag count cap: more than 8 tags per item are silently truncated', async () => {
    const tags = Array.from({ length: 12 }, (_, i) => ({ name: `t-${i}` }))
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'laplace', items: [{ content: 'cap-test', tags }] }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { tagsLinked: number }
    expect(body.tagsLinked).toBe(8)
    const linkCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM meme_tags').first<{ n: number }>()
    expect(linkCount?.n).toBe(8)
  })

  test('malformed tag entries (non-object, missing name, oversize) are silently skipped', async () => {
    const r = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'laplace',
        items: [
          {
            content: 'mixed-tags',
            tags: [
              null,
              123,
              { color: 'no-name' },
              { name: '   ' },
              { name: 'good-one' },
              { name: 'a'.repeat(500) }, // overlong → trim to 40
            ],
          },
        ],
      }),
    })
    expect(r.status).toBe(200)
    const tags = await env.DB.prepare('SELECT name FROM tags ORDER BY name').all<{ name: string }>()
    const names = tags.results?.map(t => t.name) ?? []
    expect(names).toContain('good-one')
    expect(names.some(n => n.length > 40)).toBe(false)
    expect(names).not.toContain('') // no empty tag survived
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
  test('handles approved row counts above D1 bind-variable limits', async () => {
    const items = Array.from({ length: 125 }, (_, i) => ({ content: `bulk-row-${i}`, id: i + 1 }))
    const seed = await SELF.fetch('http://example.com/memes/bulk-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'laplace', items }),
    })
    expect(seed.status).toBe(200)

    const r = await SELF.fetch('http://example.com/memes?perPage=1')
    expect(r.status).toBe(200)
    const body = (await r.json()) as { total: number; items: Array<{ content: string }> }
    expect(body.total).toBe(125)
    expect(body.items).toHaveLength(1)
  })

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

describe('GET /memes — room-specific SBHZM visibility', () => {
  const insert = (content: string, src: 'laplace' | 'sbhzm', hashSuffix: string) =>
    env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, created_at, updated_at)
       VALUES (0, ?, 'approved', ?, ?, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    )
      .bind(content, `room-hash-${hashSuffix}`, src)
      .run()

  test('default all-source view hides SBHZM outside the registered room', async () => {
    await insert('global-laplace', 'laplace', 'lp-room')
    await insert('hzm-only', 'sbhzm', 'sb-room')

    const r = await SELF.fetch('http://example.com/memes?roomId=12345')
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      items: Array<{ content: string; _source: string }>
      total: number
      sources: { laplace: boolean; sbhzm: boolean }
    }
    expect(body.total).toBe(1)
    expect(body.items.map(m => m.content)).toEqual(['global-laplace'])
    expect(body.items.some(m => m._source === 'sbhzm')).toBe(false)
    expect(body.sources.sbhzm).toBe(false)
  })

  test('default all-source view includes SBHZM in the registered room', async () => {
    await insert('global-laplace', 'laplace', 'lp-hzm')
    await insert('hzm-only', 'sbhzm', 'sb-hzm')

    const r = await SELF.fetch('http://example.com/memes?roomId=1713546334')
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      items: Array<{ content: string; _source: string }>
      total: number
      sources: { sbhzm: boolean }
    }
    expect(body.total).toBe(2)
    expect(body.items.some(m => m.content === 'hzm-only' && m._source === 'sbhzm')).toBe(true)
    expect(body.sources.sbhzm).toBe(true)
  })
})

describe('POST /memes/copy/batch — batched copy reports', () => {
  const insertApproved = (content: string, hashSuffix: string) =>
    env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, copy_count, created_at, updated_at)
       VALUES (0, ?, 'approved', ?, 'cb', 0, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    )
      .bind(content, `copy-batch-${hashSuffix}`)
      .run()

  test('aggregates duplicates: same id 3x → copy_count += 3 in one round-trip', async () => {
    await insertApproved('aaa', 'a')
    const idRow = await env.DB.prepare("SELECT id FROM memes WHERE content_hash = 'copy-batch-a'").first<{
      id: number
    }>()
    expect(idRow?.id).toBeGreaterThan(0)
    const id = idRow?.id as number

    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [id, id, id] }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      updated: number
      missing: number
      results: Array<{ id: number; copyCount: number }>
    }
    expect(body.updated).toBe(1)
    expect(body.missing).toBe(0)
    expect(body.results).toEqual([{ id, copyCount: 3 }])

    const dbRow = await env.DB.prepare('SELECT copy_count, last_copied_at FROM memes WHERE id = ?')
      .bind(id)
      .first<{ copy_count: number; last_copied_at: string | null }>()
    expect(dbRow?.copy_count).toBe(3)
    expect(dbRow?.last_copied_at).toBeTruthy()
  })

  test('mixed: existing ids update, unknown ids land in missing', async () => {
    await insertApproved('bbb', 'b')
    const real = (
      await env.DB.prepare("SELECT id FROM memes WHERE content_hash = 'copy-batch-b'").first<{ id: number }>()
    )?.id as number

    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [real, 999_999, real, 888_888] }),
    })
    const body = (await r.json()) as {
      updated: number
      missing: number
      results: Array<{ id: number; copyCount: number }>
    }
    expect(body.updated).toBe(1)
    expect(body.missing).toBe(2)
    expect(body.results).toEqual([{ id: real, copyCount: 2 }])
  })

  test('skips pending/rejected memes (only approved counts)', async () => {
    await env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, copy_count, created_at, updated_at)
       VALUES (0, 'pending-meme', 'pending', 'copy-batch-pending', 'cb', 0, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    ).run()
    const id = (
      await env.DB.prepare("SELECT id FROM memes WHERE content_hash = 'copy-batch-pending'").first<{ id: number }>()
    )?.id as number

    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [id] }),
    })
    const body = (await r.json()) as { updated: number; missing: number }
    expect(body.updated).toBe(0)
    expect(body.missing).toBe(1)

    const row = await env.DB.prepare('SELECT copy_count FROM memes WHERE id = ?')
      .bind(id)
      .first<{ copy_count: number }>()
    expect(row?.copy_count).toBe(0)
  })

  test('empty items → 200 with zeroes (not an error)', async () => {
    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { updated: number; missing: number; results: unknown[] }
    expect(body.updated).toBe(0)
    expect(body.missing).toBe(0)
    expect(body.results).toEqual([])
  })

  test('non-array items → 422', async () => {
    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: 'not-an-array' }),
    })
    expect(r.status).toBe(422)
  })

  test('batch > MAX_COPY_BATCH (100) → 413', async () => {
    const items = Array.from({ length: 101 }, (_, i) => i + 1)
    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    expect(r.status).toBe(413)
  })

  test('invalid id values (negative, zero, NaN, non-int) silently filtered', async () => {
    await insertApproved('ccc', 'c')
    const real = (
      await env.DB.prepare("SELECT id FROM memes WHERE content_hash = 'copy-batch-c'").first<{ id: number }>()
    )?.id as number

    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [real, -1, 0, 1.5, 'abc', null] }),
    })
    expect(r.status).toBe(200)
    const body = (await r.json()) as { updated: number; missing: number }
    expect(body.updated).toBe(1)
    // -1, 0, 1.5, 'abc', null are all filtered before the SQL UPDATE → not counted as missing.
    expect(body.missing).toBe(0)
  })

  test('invalid JSON body → 400', async () => {
    const r = await SELF.fetch('http://example.com/memes/copy/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    expect(r.status).toBe(400)
  })
})
