/**
 * Coverage for the error / edge paths in `src/lib/sbhzm-client.ts` that
 * `tests/hzm-modules.test.ts` does not exercise.
 *
 * Targets:
 *  - `extractListAndTotal` shape variants (object wrappers, nested data, garbage)
 *  - `fetchPage` error paths (gmFetch reject, non-OK status, JSON parse error)
 *  - `fetchSbhzmMemes` cache hit, force-bypass, random fallback chain, no-random source
 *  - `fetchSbhzmFirstPage` empty short-circuit and dedup
 *  - `fetchSbhzmTags` wrapped `{data:[...]}`, malformed wrapper, non-OK throw, type filter
 *  - `inferSbhzmTagIds` swallows fetchSbhzmTags throw, malformed regex, no-map source
 *  - `submitSbhzmMeme` non-OK + missing/invalid id
 *
 * Always uses the `_setGmXhrForTests` DI hook (see `src/lib/gm-fetch.ts:44-58`
 * — bun caches `$` exports across tests so `mock.module` doesn't reach the resolver).
 */

import { afterEach, describe, expect, test } from 'bun:test'

import type { MemeSource } from '../src/lib/meme-sources'

import { _setGmXhrForTests } from '../src/lib/gm-fetch'
import { getMemeSourceForRoom } from '../src/lib/meme-sources'
import {
  _clearSbhzmCacheForTests,
  fetchSbhzmFirstPage,
  fetchSbhzmMemes,
  fetchSbhzmTags,
  inferSbhzmTagIds,
  submitSbhzmMeme,
} from '../src/lib/sbhzm-client'

type XhrLoadResp = {
  status: number
  statusText: string
  responseText: string
  responseHeaders: string
  finalUrl: string
}
type XhrOpts = {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: string
  onload?: (r: XhrLoadResp) => void
  onerror?: (err: { error?: string }) => void
  ontimeout?: () => void
  onabort?: () => void
}
type XhrStub = (opts: XhrOpts) => unknown
const setXhr = (fn: XhrStub) => _setGmXhrForTests(fn as unknown as Parameters<typeof _setGmXhrForTests>[0])

function ok(opts: XhrOpts, responseText: string, status = 200): void {
  setTimeout(() => {
    opts.onload?.({
      status,
      statusText: status === 200 ? 'OK' : 'ERR',
      responseText,
      responseHeaders: '',
      finalUrl: opts.url,
    })
  }, 0)
}

function getDefaultSource(): MemeSource {
  const s = getMemeSourceForRoom(1713546334)
  if (!s) throw new Error('Expected built-in meme source for 1713546334')
  return s
}

afterEach(() => {
  _setGmXhrForTests(null)
  _clearSbhzmCacheForTests()
})

// ---------------------------------------------------------------------------
// extractListAndTotal — exercised through fetchPage via fetchSbhzmFirstPage
// ---------------------------------------------------------------------------

describe('extractListAndTotal shape variants', () => {
  test('items wrapper with numeric total', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ items: [{ id: 1, content: 'a' }], total: 1, page: 1, page_size: 100 }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toHaveLength(1)
    expect(memes[0]?.content).toBe('a')
  })

  test('top-level data array wrapper', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ data: [{ id: 2, content: 'b' }] }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes.map(m => m.content)).toEqual(['b'])
  })

  test('results wrapper', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ results: [{ id: 3, content: 'c' }] }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes.map(m => m.content)).toEqual(['c'])
  })

  test('nested data.data array', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ data: { data: [{ id: 4, content: 'd' }] } }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes.map(m => m.content)).toEqual(['d'])
  })

  test('nested data.items array', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ data: { items: [{ id: 5, content: 'e' }] } }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes.map(m => m.content)).toEqual(['e'])
  })

  test('unknown wrapper (no list anywhere) yields empty', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ surprise: 'not-a-list', count: 7 }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('null body yields empty', async () => {
    setXhr(opts => {
      ok(opts, 'null')
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// fetchPage error paths — caught and logged, return empty page
// ---------------------------------------------------------------------------

describe('fetchPage error paths', () => {
  test('gmFetch network error → fetchSbhzmFirstPage returns []', async () => {
    setXhr(opts => {
      setTimeout(() => opts.onerror?.({ error: 'simulated' }), 0)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('non-OK 500 → empty', async () => {
    setXhr(opts => {
      ok(opts, 'Internal Server Error', 500)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('non-OK 401 → empty', async () => {
    setXhr(opts => {
      ok(opts, '{"error":"unauthorized"}', 401)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('non-OK 403 → empty', async () => {
    setXhr(opts => {
      ok(opts, 'forbidden', 403)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('non-OK 429 → empty', async () => {
    setXhr(opts => {
      ok(opts, 'too many', 429)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('invalid JSON body → caught, returns []', async () => {
    setXhr(opts => {
      ok(opts, 'not-json{{{')
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// fetchSbhzmMemes — cache + random fallback chain
// ---------------------------------------------------------------------------

describe('fetchSbhzmMemes cache + fallback chain', () => {
  test('second call within TTL hits cache (no extra HTTP)', async () => {
    let calls = 0
    setXhr(opts => {
      calls++
      const isPage1 = opts.url.includes('page=1')
      const body = isPage1 ? [{ id: 1, content: 'cached', tags: [], copy_count: 0 }] : []
      ok(opts, JSON.stringify(body))
    })
    const source = getDefaultSource()
    const first = await fetchSbhzmMemes(source)
    expect(first).toHaveLength(1)
    const callsAfterFirst = calls

    const second = await fetchSbhzmMemes(source)
    expect(second).toEqual(first)
    expect(calls).toBe(callsAfterFirst) // no new calls
  })

  test('force=true bypasses cache', async () => {
    let calls = 0
    setXhr(opts => {
      calls++
      const body = opts.url.includes('page=1') ? [{ id: 1, content: 'a', tags: [], copy_count: 0 }] : []
      ok(opts, JSON.stringify(body))
    })
    const source = getDefaultSource()
    await fetchSbhzmMemes(source)
    const before = calls
    await fetchSbhzmMemes(source, true)
    expect(calls).toBeGreaterThan(before)
  })

  test('list empty → falls back to random endpoint and returns dedup result', async () => {
    let randomHits = 0
    setXhr(opts => {
      if (opts.url.includes('/random')) {
        randomHits++
        ok(opts, JSON.stringify({ id: 999, content: 'rand-only', tags: [], copy_count: 1 }))
      } else {
        ok(opts, JSON.stringify({ items: [], total: 0 }))
      }
    })
    const memes = await fetchSbhzmMemes(getDefaultSource())
    expect(memes.length).toBeGreaterThanOrEqual(1)
    expect(memes[0]?.content).toBe('rand-only')
    // BATCH=20 random calls fired
    expect(randomHits).toBeGreaterThan(0)
  })

  test('list empty + random returns junk → triggers warn path, returns []', async () => {
    setXhr(opts => {
      if (opts.url.includes('/random')) {
        ok(opts, JSON.stringify({})) // no .content field
      } else {
        ok(opts, JSON.stringify({ items: [], total: 0 }))
      }
    })
    const memes = await fetchSbhzmMemes(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('list empty + random gmFetch errors → caught, returns []', async () => {
    setXhr(opts => {
      if (opts.url.includes('/random')) {
        setTimeout(() => opts.onerror?.({ error: 'boom' }), 0)
      } else {
        ok(opts, JSON.stringify({ items: [], total: 0 }))
      }
    })
    const memes = await fetchSbhzmMemes(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('source without randomEndpoint and empty list → []', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ items: [] }))
    })
    const noRandom: MemeSource = {
      roomId: 9000001,
      name: 'NoRandomTest',
      listEndpoint: 'https://example.invalid/api/memes',
    }
    const memes = await fetchSbhzmMemes(noRandom)
    expect(memes).toEqual([])
  })

  test('paginated dedup stops when no new ids are added', async () => {
    let pageCalls = 0
    setXhr(opts => {
      // every page returns the same single item; loop should bail after first
      pageCalls++
      ok(opts, JSON.stringify({ items: [{ id: 1, content: 'dup', tags: [], copy_count: 0 }] }))
    })
    const memes = await fetchSbhzmMemes(getDefaultSource())
    expect(memes).toHaveLength(1)
    // Only page 1 produces new items; page 2 adds 0 new and breaks.
    expect(pageCalls).toBeLessThanOrEqual(2)
  })

  test('paginated stops when knownTotal reached', async () => {
    let pageCalls = 0
    setXhr(opts => {
      pageCalls++
      // total=1 lets the loop exit even if a page came back full
      ok(opts, JSON.stringify({ items: [{ id: pageCalls, content: `m${pageCalls}`, tags: [] }], total: 1 }))
    })
    const memes = await fetchSbhzmMemes(getDefaultSource())
    expect(memes).toHaveLength(1)
    expect(pageCalls).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// fetchSbhzmFirstPage — short-circuit and dedup
// ---------------------------------------------------------------------------

describe('fetchSbhzmFirstPage', () => {
  test('returns [] when first page is empty', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ items: [] }))
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('returns [] when first page errors', async () => {
    setXhr(opts => {
      ok(opts, '', 500)
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    expect(memes).toEqual([])
  })

  test('dedupes by content within first page', async () => {
    setXhr(opts => {
      ok(
        opts,
        JSON.stringify({
          items: [
            { id: 1, content: 'same', tags: [], copy_count: 1 },
            { id: 2, content: 'same', tags: [], copy_count: 9 },
            { id: 3, content: '   ', tags: [] }, // empty after trim → dropped
            { id: 4, content: 'unique', tags: [] },
          ],
        })
      )
    })
    const memes = await fetchSbhzmFirstPage(getDefaultSource())
    const contents = memes.map(m => m.content).sort()
    expect(contents).toEqual(['same', 'unique'])
  })
})

// ---------------------------------------------------------------------------
// fetchSbhzmTags — wrapped variants + filter + non-OK
// ---------------------------------------------------------------------------

describe('fetchSbhzmTags edge cases', () => {
  test('accepts wrapped {data:[...]} form', async () => {
    setXhr(opts => {
      ok(
        opts,
        JSON.stringify({
          data: [
            { id: 1, name: 'alpha' },
            { id: 2, name: 'beta' },
          ],
        })
      )
    })
    const tags = await fetchSbhzmTags()
    expect(tags.map(t => t.name).sort()).toEqual(['alpha', 'beta'])
  })

  test('unknown wrapper shape yields empty list', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ unexpected: [{ id: 1, name: 'x' }] }))
    })
    const tags = await fetchSbhzmTags()
    expect(tags).toEqual([])
  })

  test('filters entries with non-numeric id or non-string name', async () => {
    setXhr(opts => {
      ok(
        opts,
        JSON.stringify([
          { id: 1, name: 'good' },
          { id: '2', name: 'string-id' }, // dropped
          { id: 3, name: 42 }, // dropped
          { id: 4, name: '   ' }, // empty after trim
          { id: 5, name: 'kept' },
        ])
      )
    })
    const tags = await fetchSbhzmTags()
    expect(tags.map(t => t.name).sort()).toEqual(['good', 'kept'])
  })

  test('non-OK status throws', async () => {
    setXhr(opts => {
      ok(opts, 'fail', 503)
    })
    await expect(fetchSbhzmTags()).rejects.toThrow(/HTTP 503/)
  })

  test('cached result is returned on second call', async () => {
    let calls = 0
    setXhr(opts => {
      calls++
      ok(opts, JSON.stringify([{ id: 1, name: 'cached-tag' }]))
    })
    const a = await fetchSbhzmTags()
    const b = await fetchSbhzmTags()
    expect(a).toBe(b) // same reference returned from cache
    expect(calls).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// inferSbhzmTagIds — error-swallowing branches
// ---------------------------------------------------------------------------

describe('inferSbhzmTagIds edge cases', () => {
  test('returns [] when fetchSbhzmTags throws', async () => {
    setXhr(opts => {
      ok(opts, '', 500) // tags endpoint fails
    })
    const ids = await inferSbhzmTagIds('冲耳朵啊兄弟', getDefaultSource())
    expect(ids).toEqual([])
  })

  test('returns [] for source without keywordToTag', async () => {
    const noMap: MemeSource = {
      roomId: 9000002,
      name: 'NoMap',
      listEndpoint: 'https://example.invalid/api/memes',
    }
    const ids = await inferSbhzmTagIds('anything', noMap)
    expect(ids).toEqual([])
  })

  test('skips malformed regex without crashing', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify([{ id: 99, name: 'kept' }]))
    })
    const malformedSource: MemeSource = {
      roomId: 9000003,
      name: 'BadRegex',
      listEndpoint: 'https://example.invalid/api/memes',
      keywordToTag: {
        '[unclosed': 'kept', // throws inside RegExp constructor → caught
        good: 'kept',
      },
    }
    const ids = await inferSbhzmTagIds('good morning', malformedSource)
    expect(ids).toEqual([99])
  })

  test('returns [] when no keyword pattern matches', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify([{ id: 1, name: '满弟' }]))
    })
    const ids = await inferSbhzmTagIds('totally unrelated text', getDefaultSource())
    expect(ids).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// submitSbhzmMeme — error paths
// ---------------------------------------------------------------------------

describe('submitSbhzmMeme errors', () => {
  test('non-OK status throws HTTP error with truncated body preview', async () => {
    setXhr(opts => {
      ok(opts, 'denied'.repeat(100), 401)
    })
    await expect(submitSbhzmMeme('hello', [])).rejects.toThrow(/HTTP 401/)
  })

  test('500 throws HTTP 500', async () => {
    setXhr(opts => {
      ok(opts, 'oops', 500)
    })
    await expect(submitSbhzmMeme('hello', [])).rejects.toThrow(/HTTP 500/)
  })

  test('429 throws HTTP 429', async () => {
    setXhr(opts => {
      ok(opts, 'rate-limited', 429)
    })
    await expect(submitSbhzmMeme('hello', [])).rejects.toThrow(/HTTP 429/)
  })

  test('missing id in 200 response throws', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ content: 'echoed' })) // no id
    })
    await expect(submitSbhzmMeme('hello', [])).rejects.toThrow(/id/)
  })

  test('non-numeric id throws', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ id: 'not-a-number', content: 'echoed' }))
    })
    await expect(submitSbhzmMeme('hello', [])).rejects.toThrow(/id/)
  })

  test('numeric string id is parsed via Number() and accepted', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ id: '4242', content: 'echoed' }))
    })
    const r = await submitSbhzmMeme('hello', [])
    expect(r.id).toBe(4242)
    expect(r.content).toBe('echoed')
  })

  test('non-string content falls back to trimmed input', async () => {
    setXhr(opts => {
      ok(opts, JSON.stringify({ id: 1, content: 999 }))
    })
    const r = await submitSbhzmMeme('  hi  ', [])
    expect(r.id).toBe(1)
    expect(r.content).toBe('hi')
  })
})
