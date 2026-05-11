// Coverage for `src/lib/laplace-client.ts` — currently 0% functions / 15.79% lines.
//
// LAPLACE uses native `fetch` (not gmFetch) since it has CORS, so we patch
// `globalThis.fetch` directly and restore in afterEach.
//
//   - fetchLaplaceMemes               — happy path, sortBy variants, cache hit, HTTP error throws
//   - sortMemesInPlace (via fetchLaplaceMemes) — null lastCopiedAt handling, copyCount, createdAt
//   - reportLaplaceMemeCopy           — happy path, dedup window, HTTP error → null, network error → null
//   - id <= 0 short-circuit
//   - GC of recent copies map at threshold 64

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { _clearLaplaceCacheForTests, fetchLaplaceMemes, reportLaplaceMemeCopy } from '../src/lib/laplace-client'

const originalFetch = globalThis.fetch

interface CapturedReq {
  url: string
  init?: RequestInit
}
const captured: CapturedReq[] = []

let fetchImpl: (url: string, init?: RequestInit) => Promise<Response>

beforeEach(() => {
  captured.length = 0
  fetchImpl = async (_url, _init) => new Response('{"data":[]}', { status: 200 })
  ;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    captured.push({ url, init })
    return fetchImpl(url, init)
  }) as typeof fetch
  _clearLaplaceCacheForTests()
})

afterEach(() => {
  ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
})

function memesBody(items: unknown[]) {
  return JSON.stringify({ data: items })
}

describe('fetchLaplaceMemes — sort + cache contract', () => {
  test('happy path returns the data array', async () => {
    fetchImpl = async () =>
      new Response(memesBody([{ id: 1, content: 'meme', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null }]), {
        status: 200,
      })
    const out = await fetchLaplaceMemes(12345, 'createdAt')
    expect(out).toHaveLength(1)
    expect(out[0].content).toBe('meme')
    expect(captured[0].url).toContain('roomId=12345')
    expect(captured[0].url).toContain('sortBy=createdAt')
  })

  test('empty data field defaults to []', async () => {
    fetchImpl = async () => new Response(JSON.stringify({}), { status: 200 })
    const out = await fetchLaplaceMemes(1, 'createdAt')
    expect(out).toEqual([])
  })

  test('sortBy=copyCount sorts descending by copyCount', async () => {
    fetchImpl = async () =>
      new Response(
        memesBody([
          { id: 1, content: 'a', copyCount: 5, createdAt: '2026-01-01', lastCopiedAt: null },
          { id: 2, content: 'b', copyCount: 50, createdAt: '2026-01-02', lastCopiedAt: null },
          { id: 3, content: 'c', copyCount: 10, createdAt: '2026-01-03', lastCopiedAt: null },
        ]),
        { status: 200 }
      )
    const out = await fetchLaplaceMemes(1, 'copyCount')
    expect(out.map(m => m.copyCount)).toEqual([50, 10, 5])
  })

  test('sortBy=createdAt sorts descending by createdAt string', async () => {
    fetchImpl = async () =>
      new Response(
        memesBody([
          { id: 1, content: 'a', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
          { id: 2, content: 'b', copyCount: 0, createdAt: '2026-03-01', lastCopiedAt: null },
          { id: 3, content: 'c', copyCount: 0, createdAt: '2026-02-01', lastCopiedAt: null },
        ]),
        { status: 200 }
      )
    const out = await fetchLaplaceMemes(1, 'createdAt')
    expect(out.map(m => m.createdAt)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01'])
  })

  test('sortBy=lastCopiedAt sorts descending, putting null entries at the end', async () => {
    fetchImpl = async () =>
      new Response(
        memesBody([
          { id: 1, content: 'never-copied', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
          { id: 2, content: 'recent', copyCount: 1, createdAt: '2026-01-01', lastCopiedAt: '2026-04-01' },
          { id: 3, content: 'ancient', copyCount: 1, createdAt: '2026-01-01', lastCopiedAt: '2026-01-15' },
          { id: 4, content: 'also-never', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
        ]),
        { status: 200 }
      )
    const out = await fetchLaplaceMemes(1, 'lastCopiedAt')
    // Recent first, ancient second, both nulls last (their relative order is
    // undefined / preserves input — assert both are at the tail).
    expect(out[0].content).toBe('recent')
    expect(out[1].content).toBe('ancient')
    expect(out.slice(2).every(m => m.lastCopiedAt === null)).toBe(true)
  })

  test('cache hit: same (roomId, sortBy) within TTL → no second HTTP', async () => {
    fetchImpl = async () => new Response(memesBody([]), { status: 200 })
    await fetchLaplaceMemes(1, 'createdAt')
    expect(captured).toHaveLength(1)
    await fetchLaplaceMemes(1, 'createdAt')
    expect(captured).toHaveLength(1)
  })

  test('different sortBy → different cache keys → both fetched', async () => {
    fetchImpl = async () => new Response(memesBody([]), { status: 200 })
    await fetchLaplaceMemes(1, 'createdAt')
    await fetchLaplaceMemes(1, 'copyCount')
    expect(captured).toHaveLength(2)
  })

  test('different roomId → different cache keys → both fetched', async () => {
    fetchImpl = async () => new Response(memesBody([]), { status: 200 })
    await fetchLaplaceMemes(1, 'createdAt')
    await fetchLaplaceMemes(2, 'createdAt')
    expect(captured).toHaveLength(2)
  })

  test('non-2xx HTTP throws with status code', async () => {
    fetchImpl = async () => new Response('Server Error', { status: 503, statusText: 'Service Unavailable' })
    await expect(fetchLaplaceMemes(1, 'createdAt')).rejects.toThrow(/HTTP 503/)
  })

  test('failed fetch is NOT cached (next call retries)', async () => {
    let calls = 0
    fetchImpl = async () => {
      calls++
      return calls === 1
        ? new Response('boom', { status: 500 })
        : new Response(
            memesBody([{ id: 1, content: 'ok', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null }]),
            { status: 200 }
          )
    }
    await expect(fetchLaplaceMemes(1, 'createdAt')).rejects.toThrow()
    const out = await fetchLaplaceMemes(1, 'createdAt')
    expect(out).toHaveLength(1)
    expect(captured).toHaveLength(2)
  })
})

describe('reportLaplaceMemeCopy', () => {
  test('memeId <= 0 short-circuits to null without HTTP', async () => {
    expect(await reportLaplaceMemeCopy(0)).toBeNull()
    expect(await reportLaplaceMemeCopy(-1)).toBeNull()
    expect(captured).toHaveLength(0)
  })

  test('happy path returns the new copyCount from the response', async () => {
    fetchImpl = async () => new Response(JSON.stringify({ copyCount: 7 }), { status: 200 })
    const result = await reportLaplaceMemeCopy(42)
    expect(result).toBe(7)
    expect(captured[0].url).toMatch(/\/42$/)
    expect(captured[0].init?.method).toBe('POST')
  })

  test('window dedup: second call within 2s for the same id returns null without HTTP', async () => {
    fetchImpl = async () => new Response(JSON.stringify({ copyCount: 1 }), { status: 200 })
    const first = await reportLaplaceMemeCopy(99)
    const httpsBefore = captured.length
    const second = await reportLaplaceMemeCopy(99)
    expect(first).toBe(1)
    expect(second).toBeNull()
    expect(captured.length).toBe(httpsBefore) // no new HTTP
  })

  test('different ids in the same window are NOT deduped against each other', async () => {
    fetchImpl = async () => new Response(JSON.stringify({ copyCount: 1 }), { status: 200 })
    await reportLaplaceMemeCopy(100)
    await reportLaplaceMemeCopy(101)
    await reportLaplaceMemeCopy(102)
    expect(captured).toHaveLength(3)
  })

  test('non-2xx HTTP → returns null (does NOT throw)', async () => {
    fetchImpl = async () => new Response('boom', { status: 500 })
    const result = await reportLaplaceMemeCopy(1)
    expect(result).toBeNull()
  })

  test('network error → returns null', async () => {
    fetchImpl = async () => {
      throw new Error('ECONNREFUSED')
    }
    const result = await reportLaplaceMemeCopy(1)
    expect(result).toBeNull()
  })

  test('GC threshold: pushing >64 distinct ids triggers cleanup of expired entries', async () => {
    // Hard to observe directly, but at least verify that >64 calls all complete
    // without throwing and without unexpected dedup of fresh ids.
    fetchImpl = async () => new Response(JSON.stringify({ copyCount: 1 }), { status: 200 })
    for (let i = 1; i <= 70; i++) {
      const r = await reportLaplaceMemeCopy(i)
      expect(r).toBe(1)
    }
    expect(captured).toHaveLength(70)
  })
})

// Time-boundary fortification — stryker survivors on lines 83 / 89 / 91 are
// EqualityOperator and ConditionalExpression mutants around `<` vs `<=`,
// `>` vs `>=`, etc. They survive without a Date.now mock because the
// uncontrolled clock makes exact-boundary assertions flaky. Mocking gives
// us deterministic 0/1999/2000/2001 / 64/65 boundaries.
describe('reportLaplaceMemeCopy — time-boundary kill-zone', () => {
  let originalNow: typeof Date.now
  let fakeNow: number

  beforeEach(() => {
    originalNow = Date.now
    fakeNow = 1_000_000
    Date.now = () => fakeNow
    fetchImpl = async () => new Response(JSON.stringify({ copyCount: 1 }), { status: 200 })
  })

  afterEach(() => {
    Date.now = originalNow
  })

  test('dedup boundary: second call AT exactly 1999ms is still deduped (locks `< 2000` not `<= 1999`)', async () => {
    const first = await reportLaplaceMemeCopy(7)
    expect(first).toBe(1)
    expect(captured).toHaveLength(1)
    fakeNow += 1999 // 1ms before the window closes
    const second = await reportLaplaceMemeCopy(7)
    expect(second).toBeNull()
    expect(captured).toHaveLength(1) // no new HTTP
  })

  test('dedup boundary: second call AT exactly 2000ms is allowed through (locks `<` not `<=`)', async () => {
    // The check is `now - last < LAPLACE_COPY_DEDUP_MS`. At delta=2000 the
    // strict `<` is false → call goes through. A mutation to `<=` would
    // dedup this case, breaking it.
    await reportLaplaceMemeCopy(7)
    expect(captured).toHaveLength(1)
    fakeNow += 2000
    const second = await reportLaplaceMemeCopy(7)
    expect(second).toBe(1)
    expect(captured).toHaveLength(2)
  })

  test('dedup boundary: 2001ms also goes through', async () => {
    await reportLaplaceMemeCopy(7)
    fakeNow += 2001
    const second = await reportLaplaceMemeCopy(7)
    expect(second).toBe(1)
    expect(captured).toHaveLength(2)
  })

  test('GC boundary: at exactly 64 entries no cleanup runs (locks `> 64` not `>= 64`)', async () => {
    // Fill exactly 64 entries — GC condition `size > 64` is false at 64.
    for (let i = 1; i <= 64; i++) {
      await reportLaplaceMemeCopy(i)
    }
    expect(captured).toHaveLength(64)
    // Re-call id 1 within window → still deduped (entry was not GC'd
    // because GC didn't run at 64).
    const r = await reportLaplaceMemeCopy(1)
    expect(r).toBeNull() // deduped
  })

  test('GC boundary: at 65 entries cleanup runs and removes expired entries (locks `> 64`)', async () => {
    // Fill 64 entries at t=0.
    for (let i = 1; i <= 64; i++) {
      await reportLaplaceMemeCopy(i)
    }
    // Advance time PAST the dedup window so existing entries are "expired".
    fakeNow += 2001
    // 65th entry → triggers GC (size > 64 after this set call). The GC
    // loop checks `now - ts >= LAPLACE_COPY_DEDUP_MS` and deletes expired.
    await reportLaplaceMemeCopy(65)
    expect(captured).toHaveLength(65)

    // Now ids 1–64 should have been cleaned. Re-calling id 1 in the same
    // tick (no time advance) is NOT deduped because the entry was GC'd.
    const r = await reportLaplaceMemeCopy(1)
    expect(r).toBe(1)
    expect(captured).toHaveLength(66)
  })

  test('GC keeps a fresh entry that has NOT yet expired (locks `now - ts >= DEDUP_MS` not `>`)', async () => {
    // Fill 64 entries at t=0.
    for (let i = 1; i <= 64; i++) {
      await reportLaplaceMemeCopy(i)
    }
    // Advance only 1000ms (still inside the dedup window).
    fakeNow += 1000
    // 65th entry → triggers GC, but at delta=1000 < 2000 none of the
    // existing entries should be cleaned.
    await reportLaplaceMemeCopy(65)
    // Re-call id 1 → still inside window (delta=1000) → deduped.
    const r = await reportLaplaceMemeCopy(1)
    expect(r).toBeNull()
  })
})

// Sort stability — the `if (a.lastCopiedAt === null && b.lastCopiedAt === null) return 0`
// branch is an explicit equal-rank case for the null pair. Stryker mutates
// it to `return -1` or `return 1` which destabilizes order. Pin by
// observing that two null-lastCopiedAt entries retain their relative input
// order (V8/Bun's `Array.sort` is stable).
describe('fetchLaplaceMemes — null-null sort stability', () => {
  test('both lastCopiedAt null: relative input order is preserved (stable sort, locks `return 0`)', async () => {
    fetchImpl = async () =>
      new Response(
        memesBody([
          { id: 'first', content: 'A', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
          { id: 'second', content: 'B', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
          { id: 'third', content: 'C', copyCount: 0, createdAt: '2026-01-01', lastCopiedAt: null },
        ]),
        { status: 200 }
      )
    const out = await fetchLaplaceMemes(1, 'lastCopiedAt')
    // If the null-null branch returned non-zero, V8's stable sort would
    // shuffle these into a deterministic but non-input order.
    expect(out.map(m => m.id)).toEqual(['first', 'second', 'third'])
  })
})
