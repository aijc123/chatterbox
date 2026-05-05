/**
 * Phase D.1 SBHZM cron path:
 *  - pullSbhzmIntoMirror writes directly to memes table (replaces old cache-table writes)
 *  - pullSbhzmIfStale gates on contributions table (skip if real user activity recent)
 *  - gcOldSbhzmCache cleans legacy rows
 *  - readSbhzmFromCache stays for legacy data + cold-start fallback
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { env, SELF } from 'cloudflare:test'
import { gcOldSbhzmCache, pullSbhzmIfStale, pullSbhzmIntoMirror, readSbhzmFromCache } from './upstream-sbhzm'

async function clearAll(): Promise<void> {
  await env.DB.exec('DELETE FROM meme_tags')
  await env.DB.exec('DELETE FROM contributions')
  await env.DB.exec('DELETE FROM memes')
  await env.DB.exec('DELETE FROM upstream_sbhzm_cache')
}

beforeEach(clearAll)
afterEach(clearAll)

function fakeFetchOk(
  items: Array<{
    id: number
    content: string
    copy_count?: number
    created_at?: string
    tags?: Array<string | { name: string; emoji?: string }>
  }>
): typeof fetch {
  return (async () => {
    return new Response(JSON.stringify({ items, total: items.length }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

function fakeFetch5xx(): typeof fetch {
  return (async () => new Response('boom', { status: 500 })) as typeof fetch
}

async function insertContribution(actor: string, payload: Record<string, unknown>, ageMinutes = 0): Promise<void> {
  const created = new Date(Date.now() - ageMinutes * 60_000).toISOString()
  await env.DB.prepare(`INSERT INTO contributions (action, actor, payload_json, created_at) VALUES ('mirror', ?, ?, ?)`)
    .bind(actor, JSON.stringify(payload), created)
    .run()
}

describe('pullSbhzmIntoMirror — direct writes to memes table', () => {
  test('happy path: 2 items become approved memes with source_origin=sbhzm', async () => {
    const result = await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([
        { id: 1, content: 'sbhzm-one', copy_count: 5, created_at: '2024-01-01T00:00:00Z' },
        { id: 2, content: 'sbhzm-two', copy_count: 3, created_at: '2024-01-02T00:00:00Z' },
      ]),
      pages: 1,
    })
    expect(result.ok).toBe(true)
    expect(result.fetched).toBe(2)
    expect(result.inserted).toBe(2)

    const rows = await env.DB.prepare(
      "SELECT content, source_origin, status, copy_count FROM memes WHERE source_origin = 'sbhzm' ORDER BY id"
    ).all<{ content: string; source_origin: string; status: string; copy_count: number }>()
    expect(rows.results?.length).toBe(2)
    expect(rows.results?.[0]?.status).toBe('approved')
    expect(rows.results?.[0]?.content).toBe('sbhzm-one')
    expect(rows.results?.[0]?.copy_count).toBe(5)
  })

  test('upstream tags upsert into tags + meme_tags, including backfill onto pre-existing rows', async () => {
    // Pre-existing row without tags (simulates the 1944 already-mirrored memes).
    const { contentHash } = await import('./hash')
    await env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, created_at, updated_at)
       VALUES (0, 'shared-content', 'approved', ?, 'sbhzm', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')`
    )
      .bind(await contentHash('shared-content'))
      .run()

    const result = await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([
        { id: 1, content: 'shared-content', tags: [{ name: '问候', emoji: '👋' }] },
        { id: 2, content: 'fresh-row', tags: ['搞笑', { name: '问候' }] },
      ]),
      pages: 1,
    })
    expect(result.ok).toBe(true)
    expect(result.inserted).toBe(1) // shared-content already exists
    expect(result.tagsLinked).toBe(3) // 1 backfill + 2 fresh

    const tagCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM tags').first<{ n: number }>()
    expect(tagCount?.n).toBe(2) // 问候, 搞笑 (deduped)
    const linkCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM meme_tags').first<{ n: number }>()
    expect(linkCount?.n).toBe(3)

    // Backfill check: pre-existing 'shared-content' row now has the 问候 tag.
    const backfilled = await env.DB.prepare(
      `SELECT t.name FROM meme_tags mt JOIN tags t ON t.id = mt.tag_id JOIN memes m ON m.id = mt.meme_id
       WHERE m.content = 'shared-content'`
    ).all<{ name: string }>()
    expect(backfilled.results?.map(r => r.name)).toEqual(['问候'])
  })

  test('does NOT write to upstream_sbhzm_cache anymore', async () => {
    await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'cache-check' }]),
      pages: 1,
    })
    const cacheCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM upstream_sbhzm_cache').first<{ n: number }>()
    expect(cacheCount?.n).toBe(0)
  })

  test('logs to contributions with provided actor + ok=true', async () => {
    await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'audit-check' }]),
      pages: 1,
      actor: 'cron',
    })
    const row = await env.DB.prepare(
      "SELECT actor, payload_json FROM contributions WHERE action = 'mirror' LIMIT 1"
    ).first<{
      actor: string
      payload_json: string
    }>()
    expect(row?.actor).toBe('cron')
    const payload = JSON.parse(row?.payload_json ?? '{}')
    expect(payload.source).toBe('sbhzm')
    expect(payload.ok).toBe(true)
    expect(payload.inserted).toBe(1)
  })

  test('upstream 5xx → ok=false, no memes inserted, audit row still written with ok=false', async () => {
    const result = await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetch5xx(),
      pages: 1,
    })
    expect(result.ok).toBe(false)
    expect(result.inserted).toBe(0)

    const memeCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM memes').first<{ n: number }>()
    expect(memeCount?.n).toBe(0)

    const audit = await env.DB.prepare("SELECT payload_json FROM contributions WHERE action = 'mirror'").first<{
      payload_json: string
    }>()
    expect(audit).not.toBeNull()
    const payload = JSON.parse(audit?.payload_json ?? '{}')
    expect(payload.ok).toBe(false)
  })

  test('duplicate content_hash (e.g., user already mirrored same item) is skipped, not double-inserted', async () => {
    // Pre-seed memes table with a row.
    await env.DB.prepare(
      `INSERT INTO memes (uid, content, status, content_hash, source_origin, created_at, updated_at)
       VALUES (0, 'pre-existing', 'approved', ?, 'sbhzm', '2024-01-01', '2024-01-01')`
    )
      .bind('hash-placeholder')
      .run()

    // Cron pulls the same content — INSERT OR IGNORE means the row's content_hash
    // collision (computed by the route, not the placeholder above) might not
    // collide. We use a real hash by going through the route and asserting count.
    await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([
        { id: 1, content: 'pre-existing' }, // same content, real hash will conflict
      ]),
      pages: 1,
    })
    // The placeholder's hash differs, so cron's row gets inserted. Run again
    // and confirm the second cron run sees its own row as a duplicate.
    const after1 = await env.DB.prepare("SELECT COUNT(*) AS n FROM memes WHERE content = 'pre-existing'").first<{
      n: number
    }>()

    await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'pre-existing' }]),
      pages: 1,
    })
    const after2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM memes WHERE content = 'pre-existing'").first<{
      n: number
    }>()
    expect(after2?.n).toBe(after1?.n) // no double-insert on same content
  })
})

describe('pullSbhzmIfStale — liveness gate', () => {
  test('skips when a non-cron mirror happened in the last 12h (user is active)', async () => {
    await insertContribution('public', { source: 'sbhzm', inserted: 5 }, /* 30min ago */ 30)

    const result = await pullSbhzmIfStale(env.DB, { fetchImpl: fakeFetchOk([{ id: 1, content: 'should-not-fetch' }]) })
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('recent_user_activity')
    expect(result.recentActivity?.actor).toBe('public')

    const memeCount = await env.DB.prepare('SELECT COUNT(*) AS n FROM memes').first<{ n: number }>()
    expect(memeCount?.n).toBe(0)
  })

  test('does NOT skip when only cron activity is recent (cron should still try)', async () => {
    await insertContribution('cron', { source: 'sbhzm', inserted: 0 }, /* 1h ago */ 60)

    const result = await pullSbhzmIfStale(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'fresh-fetch' }]),
    })
    expect(result.skipped).toBe(false)
    expect(result.pull?.inserted).toBe(1)
  })

  test('does NOT skip when no activity at all', async () => {
    const result = await pullSbhzmIfStale(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'cold-start' }]),
    })
    expect(result.skipped).toBe(false)
    expect(result.pull?.ok).toBe(true)
  })

  test('does NOT skip when last user activity is older than threshold', async () => {
    await insertContribution('public', { source: 'sbhzm', inserted: 5 }, /* 13h ago */ 13 * 60)

    const result = await pullSbhzmIfStale(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'stale-recovered' }]),
    })
    expect(result.skipped).toBe(false)
  })

  test('payload without source=sbhzm (e.g., laplace mirror) does NOT count as activity', async () => {
    await insertContribution('public', { source: 'laplace', inserted: 5 }, 30)

    const result = await pullSbhzmIfStale(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'sbhzm-still-stale' }]),
    })
    expect(result.skipped).toBe(false)
  })

  test('admin refresh activity (actor != cron) DOES count as recent activity', async () => {
    await insertContribution('admin-jane', { source: 'sbhzm', inserted: 100 }, 30)

    const result = await pullSbhzmIfStale(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 1, content: 'should-not-fetch' }]),
    })
    expect(result.skipped).toBe(true)
    expect(result.recentActivity?.actor).toBe('admin-jane')
  })
})

describe('gcOldSbhzmCache', () => {
  async function insertCacheRow(json: string, ageDays: number): Promise<void> {
    const fetchedAt = new Date(Date.now() - ageDays * 24 * 3600_000).toISOString()
    await env.DB.prepare('INSERT INTO upstream_sbhzm_cache (json, fetched_at) VALUES (?, ?)')
      .bind(json, fetchedAt)
      .run()
  }

  test('deletes rows older than retainDays, keeps newer rows', async () => {
    await insertCacheRow(JSON.stringify([]), /* 10 days old */ 10)
    await insertCacheRow(JSON.stringify([]), /* 8 days old */ 8)
    await insertCacheRow(JSON.stringify([]), /* 5 days old */ 5)
    await insertCacheRow(JSON.stringify([]), /* 1 day old */ 1)

    const result = await gcOldSbhzmCache(env.DB, 7)
    expect(result.deleted).toBe(2)

    const remaining = await env.DB.prepare('SELECT COUNT(*) AS n FROM upstream_sbhzm_cache').first<{ n: number }>()
    expect(remaining?.n).toBe(2)
  })

  test('empty table → 0 deleted, no error', async () => {
    const result = await gcOldSbhzmCache(env.DB, 7)
    expect(result.deleted).toBe(0)
  })

  test('default retainDays is 1: 2-day-old row is purged with no explicit arg', async () => {
    // 这个 case 把 7→1 的 default 改动锁死。如果以后有人手滑把默认改回 7,
    // 2 天前的行就不该被 GC,这里立刻红。
    await insertCacheRow(JSON.stringify([]), 2)
    await insertCacheRow(JSON.stringify([]), 0.5) // 12 小时前,应该保留
    const result = await gcOldSbhzmCache(env.DB)
    expect(result.deleted).toBe(1)
    const remaining = await env.DB.prepare('SELECT COUNT(*) AS n FROM upstream_sbhzm_cache').first<{ n: number }>()
    expect(remaining?.n).toBe(1)
  })

  test('pullSbhzmIfStale runs GC each invocation', async () => {
    await insertCacheRow(JSON.stringify([]), 10) // 10 days old → should be GC'd

    await pullSbhzmIfStale(env.DB, { fetchImpl: fakeFetchOk([]) })

    const remaining = await env.DB.prepare('SELECT COUNT(*) AS n FROM upstream_sbhzm_cache').first<{ n: number }>()
    expect(remaining?.n).toBe(0)
  })
})

describe('readSbhzmFromCache (legacy)', () => {
  test('empty → ok=false', async () => {
    const r = await readSbhzmFromCache(env.DB)
    expect(r.ok).toBe(false)
    expect(r.items).toEqual([])
  })

  test('fresh row → ok=true with parsed items', async () => {
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
    await env.DB.prepare('INSERT INTO upstream_sbhzm_cache (json, fetched_at) VALUES (?, ?)')
      .bind(JSON.stringify([{ id: -1, content: 'legacy', _source: 'sbhzm' }]), oneHourAgo)
      .run()
    const r = await readSbhzmFromCache(env.DB)
    expect(r.ok).toBe(true)
    expect(r.items).toHaveLength(1)
  })

  test('stale row > 24h → ok=false', async () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString()
    await env.DB.prepare('INSERT INTO upstream_sbhzm_cache (json, fetched_at) VALUES (?, ?)')
      .bind(JSON.stringify([{ id: -1, content: 'old', _source: 'sbhzm' }]), old)
      .run()
    const r = await readSbhzmFromCache(env.DB)
    expect(r.ok).toBe(false)
  })

  test('malformed JSON → ok=false, no throw', async () => {
    await env.DB.prepare('INSERT INTO upstream_sbhzm_cache (json, fetched_at) VALUES (?, ?)')
      .bind('{not json', new Date().toISOString())
      .run()
    const r = await readSbhzmFromCache(env.DB)
    expect(r.ok).toBe(false)
  })
})

describe('GET /memes integration: SBHZM data surfaces from memes table after cron writes', () => {
  test('cron-written SBHZM row shows up via /memes?source=sbhzm', async () => {
    await pullSbhzmIntoMirror(env.DB, {
      fetchImpl: fakeFetchOk([{ id: 7, content: 'cron-written', copy_count: 1, created_at: '2024-06-01T00:00:00Z' }]),
      pages: 1,
    })

    const r = await SELF.fetch('http://example.com/memes?source=sbhzm')
    expect(r.status).toBe(200)
    const body = (await r.json()) as {
      items: Array<{ content: string; _source: string }>
      sources: { sbhzm: boolean }
    }
    expect(body.sources.sbhzm).toBe(true)
    expect(body.items.find(i => i.content === 'cron-written')).toBeDefined()
  })
})
