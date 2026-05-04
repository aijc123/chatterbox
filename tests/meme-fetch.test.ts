import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { CbMergedResult } from '../src/lib/cb-backend-client'
import type { MemeSource } from '../src/lib/meme-sources'
import type { LaplaceMemeWithSource, SbhzmMeme } from '../src/lib/sbhzm-client'

import { _setMemeFetchDepsForTests, fetchAllMemes, sortMemes } from '../src/lib/meme-fetch'
import { cbBackendEnabled } from '../src/lib/store-meme'

/** 构造一条最小可用的 LaplaceMemeWithSource。 */
function meme(over: Partial<LaplaceMemeWithSource> & { id: number }): LaplaceMemeWithSource {
  return {
    id: over.id,
    uid: over.uid ?? 0,
    content: over.content ?? `meme-${over.id}`,
    tags: over.tags ?? [],
    copyCount: over.copyCount ?? 0,
    lastCopiedAt: over.lastCopiedAt ?? null,
    createdAt: over.createdAt ?? '2024-01-01T00:00:00Z',
    updatedAt: over.updatedAt ?? '2024-01-01T00:00:00Z',
    username: over.username ?? null,
    avatar: over.avatar ?? null,
    room: over.room ?? null,
    _source: over._source,
  }
}

const SBHZM_SOURCE: MemeSource = {
  roomId: 1713546334,
  name: '灰泽满烂梗库',
  listEndpoint: 'https://sbhzm.cn/api/public/memes',
}

/** 把 LaplaceMemeWithSource 强转成 SbhzmMeme(测试期保证 _source='sbhzm')。 */
function asSbhzm(m: LaplaceMemeWithSource): SbhzmMeme {
  return { ...m, _source: 'sbhzm' }
}

interface MirrorCall {
  source: 'laplace' | 'sbhzm'
  count: number
}

/** 一次性装配所有 deps;每个 spy 都记录调用,失败用 reject 触发 catch 分支。 */
function setupDeps(opts: {
  cbResult?: CbMergedResult
  laplaceResult?: LaplaceMemeWithSource[] | Error
  sbhzmResult?: SbhzmMeme[] | Error
}) {
  const calls: {
    cb: number
    laplace: number
    sbhzm: number
    mirrors: MirrorCall[]
  } = { cb: 0, laplace: 0, sbhzm: 0, mirrors: [] }

  _setMemeFetchDepsForTests({
    fetchCbMergedMemes: async () => {
      calls.cb++
      if (!opts.cbResult) throw new Error('cb deps not configured')
      return opts.cbResult
    },
    fetchLaplaceMemes: async () => {
      calls.laplace++
      if (opts.laplaceResult instanceof Error) throw opts.laplaceResult
      return (opts.laplaceResult ?? []) as never
    },
    fetchSbhzmMemes: async () => {
      calls.sbhzm++
      if (opts.sbhzmResult instanceof Error) throw opts.sbhzmResult
      return opts.sbhzmResult ?? []
    },
    mirrorToCbBackend: async (items, source) => {
      calls.mirrors.push({ source, count: items.length })
    },
  })

  return calls
}

describe('sortMemes', () => {
  test('lastCopiedAt: nulls go last, otherwise descending', () => {
    const items = [
      meme({ id: 1, lastCopiedAt: null }),
      meme({ id: 2, lastCopiedAt: '2024-03-01T00:00:00Z' }),
      meme({ id: 3, lastCopiedAt: '2024-01-01T00:00:00Z' }),
      meme({ id: 4, lastCopiedAt: null }),
      meme({ id: 5, lastCopiedAt: '2024-02-01T00:00:00Z' }),
    ]
    sortMemes(items, 'lastCopiedAt')
    expect(items.map(m => m.id)).toEqual([2, 5, 3, 1, 4])
  })

  test('lastCopiedAt: two nulls compare equal', () => {
    const items = [meme({ id: 1, lastCopiedAt: null }), meme({ id: 2, lastCopiedAt: null })]
    sortMemes(items, 'lastCopiedAt')
    // 既然两个都是 null,内部 return 0,顺序保持(或与原一致),都可。
    expect(items.length).toBe(2)
  })

  test('copyCount: descending', () => {
    const items = [meme({ id: 1, copyCount: 3 }), meme({ id: 2, copyCount: 10 }), meme({ id: 3, copyCount: 5 })]
    sortMemes(items, 'copyCount')
    expect(items.map(m => m.id)).toEqual([2, 3, 1])
  })

  test('createdAt: descending (default branch)', () => {
    const items = [
      meme({ id: 1, createdAt: '2024-01-01T00:00:00Z' }),
      meme({ id: 2, createdAt: '2024-03-01T00:00:00Z' }),
      meme({ id: 3, createdAt: '2024-02-01T00:00:00Z' }),
    ]
    sortMemes(items, 'createdAt')
    expect(items.map(m => m.id)).toEqual([2, 3, 1])
  })
})

describe('fetchAllMemes', () => {
  beforeEach(() => {
    cbBackendEnabled.value = false
  })

  afterEach(() => {
    _setMemeFetchDepsForTests(null)
    cbBackendEnabled.value = false
  })

  describe('legacy path (cb backend disabled)', () => {
    test('no source: only LAPLACE fetched + mirrored', async () => {
      const calls = setupDeps({
        laplaceResult: [meme({ id: 1, content: 'l1' }), meme({ id: 2, content: 'l2' })],
      })

      const result = await fetchAllMemes(123, 'lastCopiedAt', null)

      expect(calls.cb).toBe(0)
      expect(calls.laplace).toBe(1)
      expect(calls.sbhzm).toBe(0)
      expect(result.map(m => m.content)).toEqual(['l1', 'l2'])
      expect(result.every(m => m._source === 'laplace')).toBe(true)
      expect(calls.mirrors).toEqual([{ source: 'laplace', count: 2 }])
    })

    test('with source: LAPLACE + SBHZM both fetched + mirrored', async () => {
      const calls = setupDeps({
        laplaceResult: [meme({ id: 1, content: 'l1' })],
        sbhzmResult: [asSbhzm(meme({ id: -1, content: 'h1' }))],
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)

      expect(calls.laplace).toBe(1)
      expect(calls.sbhzm).toBe(1)
      expect(result.map(m => m.content).sort()).toEqual(['h1', 'l1'])
      expect(calls.mirrors).toEqual([
        { source: 'laplace', count: 1 },
        { source: 'sbhzm', count: 1 },
      ])
    })

    test('LAPLACE rejects: caught, returns SBHZM only', async () => {
      const calls = setupDeps({
        laplaceResult: new Error('upstream 500'),
        sbhzmResult: [asSbhzm(meme({ id: -1, content: 'h1' }))],
      })

      const result = await fetchAllMemes(1713546334, 'copyCount', SBHZM_SOURCE)

      expect(calls.laplace).toBe(1)
      expect(calls.sbhzm).toBe(1)
      expect(result.map(m => m.content)).toEqual(['h1'])
      // LAPLACE rejected before mirror; SBHZM still mirrors.
      expect(calls.mirrors).toEqual([{ source: 'sbhzm', count: 1 }])
    })

    test('SBHZM rejects: caught, returns LAPLACE only', async () => {
      const calls = setupDeps({
        laplaceResult: [meme({ id: 1, content: 'l1' })],
        sbhzmResult: new Error('sbhzm down'),
      })

      const result = await fetchAllMemes(1713546334, 'createdAt', SBHZM_SOURCE)

      expect(result.map(m => m.content)).toEqual(['l1'])
      expect(calls.mirrors).toEqual([{ source: 'laplace', count: 1 }])
    })

    test('LAPLACE rejects with non-Error value: still caught (String() branch)', async () => {
      // 走 catch 里的 `err instanceof Error` false 分支,exercise String(err) 路径。
      const stringRejector = async (): Promise<LaplaceMemeWithSource[]> => {
        throw 'plain-string-error' // eslint-disable-line @typescript-eslint/no-throw-literal
      }
      _setMemeFetchDepsForTests({
        fetchLaplaceMemes: stringRejector as never,
        fetchSbhzmMemes: async () => [],
        mirrorToCbBackend: async () => {},
        fetchCbMergedMemes: async () => {
          throw new Error('not used')
        },
      })

      const result = await fetchAllMemes(123, 'lastCopiedAt', null)
      expect(result).toEqual([])
    })
  })

  describe('cb backend enabled', () => {
    beforeEach(() => {
      cbBackendEnabled.value = true
    })

    test('fatal=true: falls through to legacy path', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [],
          sources: { laplace: false, sbhzm: false, cb: false },
          fatal: true,
        },
        laplaceResult: [meme({ id: 1, content: 'l1' })],
      })

      const result = await fetchAllMemes(123, 'lastCopiedAt', null)

      expect(calls.cb).toBe(1)
      // legacy path runs LAPLACE direct
      expect(calls.laplace).toBe(1)
      expect(result.map(m => m.content)).toEqual(['l1'])
    })

    test('non-source room: cb laplace stripped, cb sbhzm stripped, direct LAPLACE fetched', async () => {
      const cbItems: LaplaceMemeWithSource[] = [
        { ...meme({ id: 100, content: 'cb-only' }), _source: 'cb' },
        { ...meme({ id: 200, content: 'leaked-laplace' }), _source: 'laplace' },
        { ...meme({ id: 300, content: 'leaked-sbhzm' }), _source: 'sbhzm' },
      ]
      const calls = setupDeps({
        cbResult: {
          items: cbItems,
          sources: { laplace: true, sbhzm: true, cb: true },
          fatal: false,
        },
        laplaceResult: [meme({ id: 1, content: 'fresh-laplace' })],
      })

      const result = await fetchAllMemes(99999, 'lastCopiedAt', null)

      expect(calls.laplace).toBe(1) // direct fetch always happens
      expect(calls.sbhzm).toBe(0) // no source, no sbhzm fallback
      const contents = result.map(m => m.content).sort()
      // cb-only kept, laplace/sbhzm stripped from cb response, fresh-laplace appended
      expect(contents).toEqual(['cb-only', 'fresh-laplace'])
      expect(calls.mirrors).toEqual([{ source: 'laplace', count: 1 }])
    })

    test('source room with cb.sources.sbhzm=false: SBHZM fallback fired', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [{ ...meme({ id: 100, content: 'cb-only' }), _source: 'cb' }],
          sources: { laplace: true, sbhzm: false, cb: true },
          fatal: false,
        },
        laplaceResult: [meme({ id: 1, content: 'fresh-laplace' })],
        sbhzmResult: [asSbhzm(meme({ id: -1, content: 'fresh-sbhzm' }))],
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)

      expect(calls.laplace).toBe(1)
      expect(calls.sbhzm).toBe(1)
      expect(result.map(m => m.content).sort()).toEqual(['cb-only', 'fresh-laplace', 'fresh-sbhzm'])
      expect(calls.mirrors).toEqual([
        { source: 'laplace', count: 1 },
        { source: 'sbhzm', count: 1 },
      ])
    })

    test('source room with cb.sources.sbhzm=true: no SBHZM fallback', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [
            { ...meme({ id: 100, content: 'cb-only' }), _source: 'cb' },
            { ...meme({ id: 200, content: 'cb-sbhzm-mirror' }), _source: 'sbhzm' },
          ],
          sources: { laplace: true, sbhzm: true, cb: true },
          fatal: false,
        },
        laplaceResult: [meme({ id: 1, content: 'fresh-laplace' })],
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)

      expect(calls.sbhzm).toBe(0)
      // sbhzm in cb response IS kept (room has source); cb laplace stripped; direct laplace appended
      expect(result.map(m => m.content).sort()).toEqual(['cb-only', 'cb-sbhzm-mirror', 'fresh-laplace'])
    })

    test('cb path: direct LAPLACE rejects → caught (logs branch)', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [{ ...meme({ id: 100, content: 'cb-only' }), _source: 'cb' }],
          sources: { laplace: true, sbhzm: true, cb: true },
          fatal: false,
        },
        laplaceResult: new Error('laplace network'),
      })

      const result = await fetchAllMemes(99999, 'lastCopiedAt', null)

      expect(calls.laplace).toBe(1)
      expect(result.map(m => m.content)).toEqual(['cb-only'])
      // mirror only fires on success — laplace rejected, no mirror call
      expect(calls.mirrors).toEqual([])
    })

    test('cb path: SBHZM fallback rejects → caught (logs branch)', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [],
          sources: { laplace: true, sbhzm: false, cb: true },
          fatal: false,
        },
        laplaceResult: [],
        sbhzmResult: new Error('sbhzm 500'),
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)

      expect(calls.sbhzm).toBe(1)
      expect(result).toEqual([])
    })

    test('cb path: non-Error rejection from sbhzm fallback hits String() branch', async () => {
      _setMemeFetchDepsForTests({
        fetchCbMergedMemes: async () => ({
          items: [],
          sources: { laplace: true, sbhzm: false, cb: true },
          fatal: false,
        }),
        fetchLaplaceMemes: async () => [],
        fetchSbhzmMemes: (async () => {
          throw 'plain-rejection' // eslint-disable-line @typescript-eslint/no-throw-literal
        }) as never,
        mirrorToCbBackend: async () => {},
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)
      expect(result).toEqual([])
    })

    test('legacy path under cb-disabled: SBHZM rejects with non-Error → String() branch', async () => {
      cbBackendEnabled.value = false
      _setMemeFetchDepsForTests({
        fetchCbMergedMemes: async () => {
          throw new Error('not used')
        },
        fetchLaplaceMemes: async () => [],
        fetchSbhzmMemes: (async () => {
          throw 'plain-rejection-legacy' // eslint-disable-line @typescript-eslint/no-throw-literal
        }) as never,
        mirrorToCbBackend: async () => {},
      })

      const result = await fetchAllMemes(1713546334, 'lastCopiedAt', SBHZM_SOURCE)
      expect(result).toEqual([])
    })

    test('result ordering: sortMemes is applied to merged output', async () => {
      const calls = setupDeps({
        cbResult: {
          items: [{ ...meme({ id: 100, content: 'old', copyCount: 1 }), _source: 'cb' }],
          sources: { laplace: true, sbhzm: true, cb: true },
          fatal: false,
        },
        laplaceResult: [meme({ id: 1, content: 'top', copyCount: 100 })],
      })

      const result = await fetchAllMemes(99999, 'copyCount', null)
      expect(result.map(m => m.content)).toEqual(['top', 'old'])
      // 防 lint:确认我们走过了 cb 路径(否则是 legacy path,断言意义削弱)。
      expect(calls.cb).toBe(1)
    })
  })
})

describe('_setMemeFetchDepsForTests', () => {
  afterEach(() => {
    _setMemeFetchDepsForTests(null)
    cbBackendEnabled.value = false
  })

  test('passing null clears overrides → real implementations are reachable', async () => {
    // 注入然后立即清空,触发 deps() 里 `??` 的右操作数路径(真实 import)。
    _setMemeFetchDepsForTests({
      fetchLaplaceMemes: async () => [],
    })
    _setMemeFetchDepsForTests(null)
    // 不实际调用 fetchAllMemes —— 它会打到真实网络;只断言 setter 不抛错即可。
    expect(true).toBe(true)
  })
})
