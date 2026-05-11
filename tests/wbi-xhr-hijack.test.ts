/**
 * Integration coverage for the XHR hijack IIFE in `src/lib/wbi.ts`.
 *
 * The existing `wbi-sentinel.test.ts` confirms the install-once GUARD pattern.
 * `wbi-diagnostics.test.ts` covers the counter invariants via static-source
 * structural assertions. `wbi-pure.test.ts` covers the pure helpers. What's
 * left uncovered:
 *
 *   - The wrapped `open()` invocation path (capturing the URL into `_url`).
 *   - The wrapped `send()` "load" listener body:
 *       (a) URL doesn't match `/x/web-interface/nav` → no parsing branch.
 *       (b) URL matches + valid JSON + valid wbi_img → setCachedWbiKeys.
 *       (c) URL matches + invalid JSON → bump parseFailures and clear cache.
 *       (d) URL matches + valid JSON but missing wbi_img → bump extractMisses.
 *
 * Strategy: install ONE `FakeXhr` global, import wbi.ts ONCE so the IIFE
 * wraps that FakeXhr's prototype. Then every test allocates a fresh
 * `FakeXhr` instance to exercise the wrapped methods. The wbi module's
 * `cachedWbiKeys` / `wbiDiagnostics` are observed/reset between tests via
 * the existing `_setCachedWbiKeysForTests` / `_resetCachedWbiKeysForTests`
 * test seams.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

const NAV_URL = 'https://api.bilibili.com/x/web-interface/nav'

class FakeXhr {
  responseText = ''
  status = 200
  listeners: Record<string, Array<() => void>> = {}

  addEventListener(name: string, fn: () => void): void {
    let list = this.listeners[name]
    if (!list) {
      list = []
      this.listeners[name] = list
    }
    list.push(fn)
  }

  open(_method: string, _url: string, _async?: boolean, _u?: string | null, _p?: string | null): void {
    // No-op; the wrapper writes `this._url` before delegating to us.
  }

  send(_body?: unknown): void {
    // No-op; the wrapper has already registered any 'load' listeners.
  }

  fireLoad(): void {
    for (const fn of this.listeners.load ?? []) fn.call(this)
  }
}

let mod: typeof import('../src/lib/wbi')
let originalXhr: unknown

beforeAll(async () => {
  originalXhr = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest
  // Define a minimal window so the wbi module-load attach (line ~17-20)
  // executes its truthy branch.
  if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true })
  }
  // Install our fake BEFORE the wbi module loads. The IIFE will patch
  // FakeXhr.prototype.open / send. We cache-bust the import so the IIFE
  // re-runs on our FakeXhr; the IIFE's prototype-sentinel guard would
  // otherwise short-circuit on TestXMLHttpRequest's already-wrapped class.
  ;(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr
  mod = await import('../src/lib/wbi?freshXhrHijack=1')
})

afterAll(() => {
  ;(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = originalXhr
})

beforeEach(() => {
  mod._resetCachedWbiKeysForTests()
})

function newXhr(): FakeXhr {
  return new (globalThis as { XMLHttpRequest: typeof FakeXhr }).XMLHttpRequest()
}

describe('wbi XHR hijack — open() capture', () => {
  test('wrapped open() stores the URL (string form) on the instance', () => {
    const xhr = newXhr()
    xhr.open('GET', '/some/path', true, null, null)
    expect((xhr as unknown as { _url: string })._url).toBe('/some/path')
  })

  test('wrapped open() coerces a URL object to its string form', () => {
    const xhr = newXhr()
    const u = new URL('https://example.com/foo?bar=1')
    xhr.open('GET', u as unknown as string)
    expect((xhr as unknown as { _url: string })._url).toBe(u.toString())
  })
})

describe('wbi XHR hijack — load handler URL filter', () => {
  test('unrelated URLs do not register a load listener (no parsing path)', () => {
    const xhr = newXhr()
    xhr.open('GET', 'https://example.com/not-nav')
    xhr.send()
    expect(xhr.listeners.load).toBeUndefined()
  })

  test('NAV URL registers exactly one load listener', () => {
    const xhr = newXhr()
    xhr.open('GET', NAV_URL)
    xhr.send()
    expect(xhr.listeners.load?.length).toBe(1)
  })
})

describe('wbi XHR hijack — load handler parsing branches', () => {
  test('matching URL + valid payload populates cachedWbiKeys via setCachedWbiKeys', () => {
    const xhr = newXhr()
    xhr.open('GET', NAV_URL)
    xhr.responseText = JSON.stringify({
      data: {
        wbi_img: {
          img_url: 'https://i0.hdslb.com/bfs/wbi/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
          sub_url: 'https://i0.hdslb.com/bfs/wbi/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png',
        },
      },
    })
    xhr.send()
    xhr.fireLoad()
    expect(mod.cachedWbiKeys).toEqual({
      img_key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sub_key: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    })
  })

  test('matching URL + malformed JSON bumps parseFailures AND clears any prior cache', () => {
    // Seed a "stale" cache so we can verify the clear behavior.
    mod._setCachedWbiKeysForTests({ img_key: 'STALE_a', sub_key: 'STALE_b' })
    expect(mod.cachedWbiKeys).not.toBeNull()

    const before = mod.wbiDiagnostics.parseFailures
    const xhr = newXhr()
    xhr.open('GET', NAV_URL)
    xhr.responseText = '<html>not json</html>'
    xhr.send()
    xhr.fireLoad()
    expect(mod.wbiDiagnostics.parseFailures).toBe(before + 1)
    // Critical: stale cache MUST be wiped so callers fall back to ensureWbiKeys.
    expect(mod.cachedWbiKeys).toBeNull()
  })

  test('matching URL + JSON without wbi_img bumps extractMisses BUT preserves a prior cache', () => {
    mod._setCachedWbiKeysForTests({ img_key: 'OK_a', sub_key: 'OK_b' })
    const before = mod.wbiDiagnostics.extractMisses
    const xhr = newXhr()
    xhr.open('GET', NAV_URL)
    xhr.responseText = JSON.stringify({ data: { other: 'unrelated payload' } })
    xhr.send()
    xhr.fireLoad()
    expect(mod.wbiDiagnostics.extractMisses).toBe(before + 1)
    expect(mod.cachedWbiKeys).toEqual({ img_key: 'OK_a', sub_key: 'OK_b' })
  })

  test('substring match: any URL CONTAINING /x/web-interface/nav triggers the hijack', () => {
    const xhr = newXhr()
    xhr.open('GET', '/proxy/x/web-interface/nav?extra=1')
    xhr.responseText = JSON.stringify({
      data: {
        wbi_img: {
          img_url: 'https://x/cccccccccccccccccccccccccccccccc.png',
          sub_url: 'https://x/dddddddddddddddddddddddddddddddd.png',
        },
      },
    })
    xhr.send()
    xhr.fireLoad()
    expect(mod.cachedWbiKeys?.img_key).toBe('cccccccccccccccccccccccccccccccc')
  })
})

describe('wbi XHR hijack — _setCachedWbiKeysForTests', () => {
  test('round-trip set → read → reset', () => {
    mod._setCachedWbiKeysForTests({ img_key: 'X', sub_key: 'Y' })
    expect(mod.cachedWbiKeys).toEqual({ img_key: 'X', sub_key: 'Y' })
    mod._setCachedWbiKeysForTests(null)
    expect(mod.cachedWbiKeys).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Smoke-cover the pure helpers on this cache-busted module instance too.
// bun's `--coverage` aggregates per-filename, but a cache-busted import is
// reported separately, so without these calls the file would show lower line
// coverage even though the pure helpers ARE tested in `wbi-pure.test.ts`.
// We re-exercise them here so the cache-busted instance contributes to the
// merged coverage data.
// ---------------------------------------------------------------------------

describe('wbi (cache-busted instance) — pure-helper coverage assist', () => {
  test('encodeWbi produces a wts/w_rid suffix', () => {
    const out = mod.encodeWbi({ x: '1' }, { img_key: 'a'.repeat(32), sub_key: 'b'.repeat(32) })
    expect(out).toMatch(/w_rid=[0-9a-f]{32}/)
    expect(out).toMatch(/wts=\d+/)
  })

  test('_extractWbiKeysForTests handles canonical payload', () => {
    const keys = mod._extractWbiKeysForTests({
      data: {
        wbi_img: {
          img_url: 'https://x/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
          sub_url: 'https://x/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png',
        },
      },
    })
    expect(keys?.img_key).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
  })

  test('_getMixinKeyForTests permutes deterministically', () => {
    const out = mod._getMixinKeyForTests('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@')
    expect(out).toHaveLength(32)
  })

  test('waitForWbiKeys honors timeout when cache is null', async () => {
    mod._resetCachedWbiKeysForTests()
    const ok = await mod.waitForWbiKeys(20, 10)
    expect(ok).toBe(false)
  })

  test('ensureWbiKeys returns the cached value when already set', async () => {
    mod._setCachedWbiKeysForTests({ img_key: 'cached', sub_key: 'value' })
    const keys = await mod.ensureWbiKeys()
    expect(keys?.img_key).toBe('cached')
    mod._resetCachedWbiKeysForTests()
  })

  test('ensureWbiKeys falls through fetch — success', async () => {
    mod._resetCachedWbiKeysForTests()
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            wbi_img: {
              img_url: 'https://x/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
              sub_url: 'https://x/ffffffffffffffffffffffffffffffff.png',
            },
          },
        }),
        { status: 200 }
      )) as typeof fetch
    try {
      const keys = await mod.ensureWbiKeys()
      expect(keys?.img_key).toBe('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    } finally {
      globalThis.fetch = original
      mod._resetCachedWbiKeysForTests()
    }
  })

  test('ensureWbiKeys falls through fetch — non-2xx returns null', async () => {
    mod._resetCachedWbiKeysForTests()
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('forbidden', { status: 403 })) as typeof fetch
    try {
      const keys = await mod.ensureWbiKeys()
      expect(keys).toBeNull()
    } finally {
      globalThis.fetch = original
    }
  })

  test('ensureWbiKeys falls through fetch — invalid JSON bumps parseFailures', async () => {
    mod._resetCachedWbiKeysForTests()
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('<html>', { status: 200 })) as typeof fetch
    const before = mod.wbiDiagnostics.parseFailures
    try {
      const keys = await mod.ensureWbiKeys()
      expect(keys).toBeNull()
      expect(mod.wbiDiagnostics.parseFailures).toBeGreaterThan(before)
    } finally {
      globalThis.fetch = original
    }
  })

  test('ensureWbiKeys falls through fetch — missing wbi_img bumps extractMisses', async () => {
    mod._resetCachedWbiKeysForTests()
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: {} }), { status: 200 })) as typeof fetch
    const before = mod.wbiDiagnostics.extractMisses
    try {
      const keys = await mod.ensureWbiKeys()
      expect(keys).toBeNull()
      expect(mod.wbiDiagnostics.extractMisses).toBeGreaterThan(before)
    } finally {
      globalThis.fetch = original
    }
  })

  test('ensureWbiKeys falls through fetch — network error returns null gracefully', async () => {
    mod._resetCachedWbiKeysForTests()
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED')
    }) as typeof fetch
    try {
      const keys = await mod.ensureWbiKeys()
      expect(keys).toBeNull()
    } finally {
      globalThis.fetch = original
    }
  })
})
