// Coverage for the pure helpers in `src/lib/wbi.ts` that the existing
// sentinel + diagnostics tests don't reach:
//
//   - extractWbiKeys         (parses /x/web-interface/nav payload shape)
//   - getMixinKey            (32-char permutation/truncation per Bilibili WBI spec)
//   - encodeWbi              (sorted-query + md5(...mixin) → wts/w_rid suffix)
//   - waitForWbiKeys         (polling wrapper; verified with a tiny poll cycle)
//   - ensureWbiKeys          (cached → fast path; uncached + fetch → success/fail)
//
// `extractWbiKeys` and `getMixinKey` are file-private; wbi.ts re-exports them
// as `_extractWbiKeysForTests` / `_getMixinKeyForTests` for this file. We do
// NOT use mock.module on internal modules (per `feedback_bun_test_mocks.md`)
// — fetch is patched on globalThis and restored in `afterEach`.

import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import {
  _extractWbiKeysForTests,
  _getMixinKeyForTests,
  _resetCachedWbiKeysForTests,
  encodeWbi,
  ensureWbiKeys,
  getCachedWbiKeys,
  waitForWbiKeys,
} from '../src/lib/wbi'

describe('extractWbiKeys', () => {
  test('extracts img_key + sub_key from canonical nav payload', () => {
    const out = _extractWbiKeysForTests({
      data: {
        wbi_img: {
          img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
          sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png',
        },
      },
    })
    expect(out).toEqual({
      img_key: '7cd084941338484aae1ad9425b84077c',
      sub_key: '4932caff0ff746eab6f01bf08b70ac45',
    })
  })

  test('returns null when wbi_img is missing entirely', () => {
    expect(_extractWbiKeysForTests({ data: {} })).toBeNull()
    expect(_extractWbiKeysForTests({})).toBeNull()
  })

  test('returns null when only one of img_url / sub_url is present', () => {
    expect(
      _extractWbiKeysForTests({
        data: { wbi_img: { img_url: 'https://x/abc.png' } },
      })
    ).toBeNull()
    expect(
      _extractWbiKeysForTests({
        data: { wbi_img: { sub_url: 'https://x/def.png' } },
      })
    ).toBeNull()
  })

  test('returns null when img_url has no filename to derive a key from', () => {
    // pathname ending with "/" means split('/').pop() returns ""
    expect(
      _extractWbiKeysForTests({
        data: { wbi_img: { img_url: 'https://x/', sub_url: 'https://x/y.png' } },
      })
    ).toBeNull()
  })

  test('strips multi-segment file extensions correctly (only first dot kept)', () => {
    // .split('.')[0] takes the part before the FIRST dot.
    const out = _extractWbiKeysForTests({
      data: {
        wbi_img: {
          img_url: 'https://x/abc.tar.png',
          sub_url: 'https://x/def.tar.png',
        },
      },
    })
    expect(out).toEqual({ img_key: 'abc', sub_key: 'def' })
  })
})

describe('getMixinKey', () => {
  test('always returns exactly 32 characters when input is at least 64 chars', () => {
    // The encoder table indexes up to 63, so 64-char input is the minimum to
    // get every position resolved.
    const orig = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@'
    const out = _getMixinKeyForTests(orig)
    expect(out).toHaveLength(32)
  })

  test('produces a deterministic, reversible permutation snapshot', () => {
    // Lock the public mixin table by snapshotting the output for a known
    // input. If anyone reorders `mixinKeyEncTab` (the constant from
    // Bilibili's vendor.js), this fails — which is what we want.
    const orig = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@'
    expect(_getMixinKeyForTests(orig)).toBe('KLi2R8nwfOavW3JzrH5Nx9GjtseDcCFd')
  })

  test('shorter-than-table input produces a shorter key (undefined entries collapse to empty)', () => {
    // Behavioral note for callers: there's no input-length validation, so
    // passing fewer than 64 graphemes silently yields a shorter, useless
    // key. encodeWbi guarantees 64 chars by always concatenating
    // img_key (32) + sub_key (32). Locking this fact prevents a future
    // refactor from accidentally adding a length check that breaks the
    // contract callers rely on.
    const out = _getMixinKeyForTests('short')
    // Only 5 of the 64 table positions point at indices < 5; the rest
    // resolve to undefined and collapse to '' inside .join('').
    expect(out).toHaveLength(5)
    // Output is built only from characters present in the input.
    for (const ch of out) {
      expect('short').toContain(ch)
    }
  })
})

describe('encodeWbi', () => {
  const wbiKeys = {
    img_key: '7cd084941338484aae1ad9425b84077c',
    sub_key: '4932caff0ff746eab6f01bf08b70ac45',
  }

  test('appends wts and w_rid to the unsorted parameter string', () => {
    const out = encodeWbi({ foo: 'bar', baz: 'qux' }, wbiKeys)
    // Original parameter order is preserved before w_rid/wts.
    expect(out).toMatch(/^foo=bar&baz=qux&w_rid=[0-9a-f]{32}&wts=\d+$/)
  })

  test('w_rid is exactly an md5 hex digest (32 lowercase hex chars)', () => {
    const out = encodeWbi({ x: '1' }, wbiKeys)
    const match = out.match(/w_rid=([0-9a-f]{32})&wts=/)
    expect(match).not.toBeNull()
    expect(match?.[1]).toMatch(/^[0-9a-f]{32}$/)
  })

  test('wts is the current unix timestamp in seconds', () => {
    const before = Math.round(Date.now() / 1000)
    const out = encodeWbi({}, wbiKeys)
    const after = Math.round(Date.now() / 1000)
    const match = out.match(/wts=(\d+)$/)
    expect(match).not.toBeNull()
    const wts = Number(match?.[1])
    expect(wts).toBeGreaterThanOrEqual(before)
    expect(wts).toBeLessThanOrEqual(after)
  })

  test("strips the WBI-forbidden characters !'()* from BOTH parameter passes", () => {
    // The signed (sorted) and emitted (unsorted) passes must both filter the
    // same set, otherwise the signature would be computed over different
    // bytes than what's sent.
    const out = encodeWbi({ msg: "hi!'()*world" }, wbiKeys)
    expect(out).toContain(`msg=${encodeURIComponent('hiworld')}`)
    expect(out).not.toContain('%21') // !
    expect(out).not.toContain('%27') // '
  })

  test('numeric values are stringified', () => {
    const out = encodeWbi({ id: 12345, page: 1 }, wbiKeys)
    expect(out).toContain('id=12345')
    expect(out).toContain('page=1')
  })

  test('signature changes when params change (cannot be replayed across calls)', () => {
    const a = encodeWbi({ id: '1' }, wbiKeys)
    const b = encodeWbi({ id: '2' }, wbiKeys)
    const aRid = a.match(/w_rid=([0-9a-f]{32})/)?.[1]
    const bRid = b.match(/w_rid=([0-9a-f]{32})/)?.[1]
    expect(aRid).toBeDefined()
    expect(bRid).toBeDefined()
    expect(aRid).not.toBe(bRid)
  })

  test('special URL characters in values are percent-encoded', () => {
    const out = encodeWbi({ q: 'hello world&foo=bar' }, wbiKeys)
    // Space → +, & → %26, = → %3D (encodeURIComponent uses %20 for space).
    expect(out).toContain(`q=${encodeURIComponent('hello world&foo=bar')}`)
  })
})

describe('waitForWbiKeys', () => {
  beforeEach(() => {
    _resetCachedWbiKeysForTests()
  })

  afterEach(() => {
    _resetCachedWbiKeysForTests()
  })

  test('returns false after the timeout elapses without keys', async () => {
    const start = Date.now()
    const ok = await waitForWbiKeys(40, 10)
    const elapsed = Date.now() - start
    expect(ok).toBe(false)
    expect(elapsed).toBeGreaterThanOrEqual(30) // gave time for at least 3 polls
  })

  test('returns true immediately if cachedWbiKeys is already set', async () => {
    // Seed the cache via the public ensureWbiKeys path: stub fetch to return a
    // valid nav payload, then call ensureWbiKeys, then verify waitForWbiKeys
    // resolves true with no measurable delay.
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            wbi_img: {
              img_url: 'https://x/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png',
              sub_url: 'https://x/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png',
            },
          },
        }),
        { status: 200 }
      )) as typeof fetch
    try {
      await ensureWbiKeys()
      expect(getCachedWbiKeys()).not.toBeNull()
      const start = Date.now()
      const ok = await waitForWbiKeys(1000, 50)
      const elapsed = Date.now() - start
      expect(ok).toBe(true)
      expect(elapsed).toBeLessThan(20)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('ensureWbiKeys', () => {
  let originalFetch: typeof fetch

  beforeAll(() => {
    originalFetch = globalThis.fetch
  })

  beforeEach(() => {
    _resetCachedWbiKeysForTests()
  })

  afterEach(() => {
    _resetCachedWbiKeysForTests()
    globalThis.fetch = originalFetch
  })

  test('returns the cached keys without calling fetch when already cached', async () => {
    // Seed once.
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: {
            wbi_img: {
              img_url: 'https://x/cccccccccccccccccccccccccccccccc.png',
              sub_url: 'https://x/dddddddddddddddddddddddddddddddd.png',
            },
          },
        }),
        { status: 200 }
      )) as typeof fetch
    await ensureWbiKeys()
    // Now block fetch — second call must NOT touch it.
    let fetchHits = 0
    globalThis.fetch = (async () => {
      fetchHits++
      throw new Error('fetch should not be called when cache is warm')
    }) as typeof fetch
    const keys = await ensureWbiKeys()
    expect(keys).not.toBeNull()
    expect(fetchHits).toBe(0)
  })

  test('returns null when fetch fails (network down) and leaves cache empty', async () => {
    globalThis.fetch = (async () => {
      throw new Error('ECONNREFUSED')
    }) as typeof fetch
    const keys = await ensureWbiKeys()
    expect(keys).toBeNull()
    expect(getCachedWbiKeys()).toBeNull()
  })

  test('returns null when fetch returns a non-2xx response', async () => {
    globalThis.fetch = (async () => new Response('Forbidden', { status: 403 })) as typeof fetch
    const keys = await ensureWbiKeys()
    expect(keys).toBeNull()
  })

  test('returns null when response body is not valid JSON', async () => {
    globalThis.fetch = (async () => new Response('<html>oops</html>', { status: 200 })) as typeof fetch
    const keys = await ensureWbiKeys()
    expect(keys).toBeNull()
  })

  test('returns null when response is JSON but missing wbi_img', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: { other: 'value' } }), { status: 200 })) as typeof fetch
    const keys = await ensureWbiKeys()
    expect(keys).toBeNull()
  })

  test('caches and returns keys when fetch succeeds with a well-formed payload', async () => {
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
    const keys = await ensureWbiKeys()
    expect(keys).toEqual({
      img_key: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      sub_key: 'ffffffffffffffffffffffffffffffff',
    })
    expect(getCachedWbiKeys()).toEqual(keys)
  })
})
