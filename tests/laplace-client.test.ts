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
  fetchImpl = async () => new Response('{"data":[]}', { status: 200 })
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
