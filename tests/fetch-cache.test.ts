// Coverage for `src/lib/fetch-cache.ts` — currently 66.67% func / 86.21% lines.
// The file is a pure utility (TTL cache + in-flight dedup); no DOM, no GM_*,
// no network. We test it directly without any mocks.
//
// Cases:
//   - hit/miss based on Date.now() and ttlMs
//   - stale entry past TTL → re-fetch
//   - in-flight dedup: two concurrent get(key) → one fetcher invocation
//   - failed fetch is NOT cached and clears the in-flight slot
//   - failed fetch propagates the error to all in-flight callers
//   - invalidate(key) drops one entry; invalidate() drops all
//   - _clearForTests resets cache + in-flight state

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { FetchCache } from '../src/lib/fetch-cache'

const realNow = Date.now

describe('FetchCache.get — TTL caching', () => {
  let cache: FetchCache<string>

  beforeEach(() => {
    cache = new FetchCache<string>()
  })

  afterEach(() => {
    Date.now = realNow
  })

  test('first call invokes fetcher and returns its value', async () => {
    let calls = 0
    const out = await cache.get({
      key: 'k',
      ttlMs: 1000,
      fetcher: async () => {
        calls++
        return 'value-1'
      },
    })
    expect(out).toBe('value-1')
    expect(calls).toBe(1)
  })

  test('second call within TTL hits the cache (no fetcher invocation)', async () => {
    let calls = 0
    const fetcher = async () => {
      calls++
      return `value-${calls}`
    }
    const a = await cache.get({ key: 'k', ttlMs: 1000, fetcher })
    const b = await cache.get({ key: 'k', ttlMs: 1000, fetcher })
    expect(a).toBe('value-1')
    expect(b).toBe('value-1')
    expect(calls).toBe(1)
  })

  test('different keys do NOT share cache', async () => {
    let n = 0
    const fetcher = async () => `value-${++n}`
    const a = await cache.get({ key: 'k1', ttlMs: 1000, fetcher })
    const b = await cache.get({ key: 'k2', ttlMs: 1000, fetcher })
    expect(a).toBe('value-1')
    expect(b).toBe('value-2')
  })

  test('expired entry past TTL re-invokes the fetcher', async () => {
    let now = 1000
    Date.now = () => now
    let calls = 0
    const fetcher = async () => {
      calls++
      return `v${calls}`
    }
    await cache.get({ key: 'k', ttlMs: 100, fetcher })
    expect(calls).toBe(1)
    now = 1500 // 500ms later, ttl was 100ms — expired
    const stale = await cache.get({ key: 'k', ttlMs: 100, fetcher })
    expect(stale).toBe('v2')
    expect(calls).toBe(2)
  })

  test('boundary: at exactly ttlMs after the entry is treated as STALE', async () => {
    // Implementation: `Date.now() - cached.ts < ttlMs` — strict less-than.
    let now = 1000
    Date.now = () => now
    let calls = 0
    await cache.get({
      key: 'k',
      ttlMs: 100,
      fetcher: async () => {
        calls++
        return 'a'
      },
    })
    now = 1100 // exactly TTL — treated as stale per strict < check.
    await cache.get({
      key: 'k',
      ttlMs: 100,
      fetcher: async () => {
        calls++
        return 'b'
      },
    })
    expect(calls).toBe(2)
  })

  test('boundary: ttlMs - 1 still hits the cache', async () => {
    let now = 1000
    Date.now = () => now
    let calls = 0
    await cache.get({
      key: 'k',
      ttlMs: 100,
      fetcher: async () => {
        calls++
        return 'a'
      },
    })
    now = 1099 // just under TTL
    await cache.get({
      key: 'k',
      ttlMs: 100,
      fetcher: async () => {
        calls++
        return 'b'
      },
    })
    expect(calls).toBe(1)
  })
})

describe('FetchCache.get — in-flight deduplication', () => {
  test('two concurrent gets for same key share one fetcher promise', async () => {
    const cache = new FetchCache<string>()
    let calls = 0
    let resolveFetcher: ((v: string) => void) | null = null
    const fetcher = () =>
      new Promise<string>(resolve => {
        calls++
        resolveFetcher = resolve
      })
    const p1 = cache.get({ key: 'k', ttlMs: 1000, fetcher })
    const p2 = cache.get({ key: 'k', ttlMs: 1000, fetcher })
    expect(calls).toBe(1) // both share one fetcher invocation
    resolveFetcher?.('shared-value')
    expect(await p1).toBe('shared-value')
    expect(await p2).toBe('shared-value')
  })

  test('after fetcher resolves, in-flight slot is cleared (next get triggers cache, not new fetch)', async () => {
    const cache = new FetchCache<string>()
    let calls = 0
    await cache.get({
      key: 'k',
      ttlMs: 10000,
      fetcher: async () => {
        calls++
        return 'v'
      },
    })
    // Subsequent call should hit the cache (NOT a new fetcher call).
    await cache.get({
      key: 'k',
      ttlMs: 10000,
      fetcher: async () => {
        calls++
        return 'v2'
      },
    })
    expect(calls).toBe(1)
  })

  test('rejected fetcher: error propagates to all concurrent callers', async () => {
    const cache = new FetchCache<string>()
    let rejectFetcher: ((err: Error) => void) | null = null
    const fetcher = () =>
      new Promise<string>((_, reject) => {
        rejectFetcher = reject
      })
    const p1 = cache.get({ key: 'k', ttlMs: 1000, fetcher })
    const p2 = cache.get({ key: 'k', ttlMs: 1000, fetcher })
    // Attach catch handlers BEFORE rejecting so the unhandled-rejection guard
    // doesn't fire.
    const c1 = p1.catch(e => e)
    const c2 = p2.catch(e => e)
    rejectFetcher?.(new Error('boom'))
    expect((await c1).message).toBe('boom')
    expect((await c2).message).toBe('boom')
  })

  test('rejected fetcher does NOT cache the failure (next call retries)', async () => {
    const cache = new FetchCache<string>()
    let calls = 0
    const fetcher = async (): Promise<string> => {
      calls++
      if (calls === 1) throw new Error('first-fail')
      return 'second-success'
    }
    await expect(cache.get({ key: 'k', ttlMs: 1000, fetcher })).rejects.toThrow('first-fail')
    const out = await cache.get({ key: 'k', ttlMs: 1000, fetcher })
    expect(out).toBe('second-success')
    expect(calls).toBe(2)
  })

  test('rejected fetcher clears in-flight: new get after the rejection starts fresh', async () => {
    const cache = new FetchCache<string>()
    let rejectFirst: ((err: Error) => void) | null = null
    let secondCalls = 0
    const fetcher1 = () =>
      new Promise<string>((_, reject) => {
        rejectFirst = reject
      })
    const fetcher2 = async () => {
      secondCalls++
      return 'recovery'
    }
    const p1 = cache.get({ key: 'k', ttlMs: 1000, fetcher: fetcher1 })
    const c1 = p1.catch(e => e) // attach handler first
    rejectFirst?.(new Error('down'))
    expect((await c1).message).toBe('down')
    const out = await cache.get({ key: 'k', ttlMs: 1000, fetcher: fetcher2 })
    expect(out).toBe('recovery')
    expect(secondCalls).toBe(1)
  })
})

describe('FetchCache.invalidate', () => {
  test('invalidate(key) drops one entry but leaves others alone', async () => {
    const cache = new FetchCache<string>()
    let kCalls = 0
    let jCalls = 0
    await cache.get({ key: 'k', ttlMs: 10000, fetcher: async () => `k-${++kCalls}` })
    await cache.get({ key: 'j', ttlMs: 10000, fetcher: async () => `j-${++jCalls}` })

    cache.invalidate('k')

    // 'k' must re-fetch; 'j' still cached.
    const k2 = await cache.get({ key: 'k', ttlMs: 10000, fetcher: async () => `k-${++kCalls}` })
    const j2 = await cache.get({ key: 'j', ttlMs: 10000, fetcher: async () => `j-${++jCalls}` })
    expect(k2).toBe('k-2')
    expect(kCalls).toBe(2)
    expect(j2).toBe('j-1')
    expect(jCalls).toBe(1)
  })

  test('invalidate() with no arg drops EVERY entry', async () => {
    const cache = new FetchCache<string>()
    let kCalls = 0
    let jCalls = 0
    await cache.get({ key: 'k', ttlMs: 10000, fetcher: async () => `k-${++kCalls}` })
    await cache.get({ key: 'j', ttlMs: 10000, fetcher: async () => `j-${++jCalls}` })

    cache.invalidate()

    await cache.get({ key: 'k', ttlMs: 10000, fetcher: async () => `k-${++kCalls}` })
    await cache.get({ key: 'j', ttlMs: 10000, fetcher: async () => `j-${++jCalls}` })
    expect(kCalls).toBe(2)
    expect(jCalls).toBe(2)
  })

  test('invalidate(key) for a non-existent key is a no-op', () => {
    const cache = new FetchCache<string>()
    expect(() => cache.invalidate('never-set')).not.toThrow()
  })
})

describe('FetchCache._clearForTests', () => {
  test('clears both cache and in-flight state', async () => {
    const cache = new FetchCache<string>()
    let resolveFetcher: ((v: string) => void) | null = null
    let calls = 0
    // Start a never-resolving fetcher.
    const inFlightP = cache.get({
      key: 'k',
      ttlMs: 10000,
      fetcher: () =>
        new Promise<string>(r => {
          calls++
          resolveFetcher = r
        }),
    })
    expect(calls).toBe(1)

    cache._clearForTests()

    // After clear, a new get should start a fresh fetcher (not piggyback the
    // pending one).
    let secondCalls = 0
    const p2 = cache.get({
      key: 'k',
      ttlMs: 10000,
      fetcher: async () => {
        secondCalls++
        return 'fresh'
      },
    })
    expect(secondCalls).toBe(1)
    // Resolve the original to avoid hanging.
    resolveFetcher?.('original')
    expect(await inFlightP).toBe('original')
    expect(await p2).toBe('fresh')
  })
})
