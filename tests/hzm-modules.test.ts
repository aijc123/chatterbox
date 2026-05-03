import { beforeEach, describe, expect, mock, test } from 'bun:test'

const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_info: { script: { version: 'test' } },
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
  GM_xmlhttpRequest: () => {
    /* overridden per-test */
  },
  unsafeWindow: globalThis,
}))

const { getMemeSourceForRoom, hasMemeSourceForRoom } = await import('../src/lib/meme-sources')

const {
  bumpDailySent,
  bumpDailyLlmCalls,
  getBlacklistTags,
  getDailyStats,
  getRecentSent,
  getSelectedTags,
  hzmDailyStatsByRoom,
  hzmDriveEnabled,
  hzmDriveMode,
  hzmRecentSentByRoom,
  hzmSelectedTagsByRoom,
  hzmBlacklistTagsByRoom,
  pushRecentSent,
  setBlacklistTags,
  setSelectedTags,
} = await import('../src/lib/store-hzm')

describe('meme-sources registry', () => {
  test('returns config for the registered hzm room', () => {
    const src = getMemeSourceForRoom(1713546334)
    expect(src).toBeTruthy()
    expect(src?.name).toBe('灰泽满烂梗库')
    expect(src?.listEndpoint).toContain('sbhzm.cn')
    expect(src?.defaultTags).toContain('满弟')
  })

  test('returns null for unregistered rooms', () => {
    expect(getMemeSourceForRoom(999999)).toBeNull()
    expect(getMemeSourceForRoom(null)).toBeNull()
    expect(hasMemeSourceForRoom(undefined)).toBe(false)
  })
})

describe('store-hzm per-room state', () => {
  beforeEach(() => {
    // Reset to the new defaults: mode is just a preference, the on/off switch
    // is a separate signal. (Old tests set mode='off' which no longer typechecks.)
    hzmDriveMode.value = 'heuristic'
    hzmDriveEnabled.value = false
    hzmSelectedTagsByRoom.value = {}
    hzmBlacklistTagsByRoom.value = {}
    hzmRecentSentByRoom.value = {}
    hzmDailyStatsByRoom.value = {}
  })

  test('hzmDriveEnabled and hzmDriveMode are independent — flipping one does not flip the other', () => {
    expect(hzmDriveEnabled.value).toBe(false)
    expect(hzmDriveMode.value).toBe('heuristic')

    // Mode is a preference; switching it must NOT auto-enable.
    hzmDriveMode.value = 'llm'
    expect(hzmDriveEnabled.value).toBe(false)

    // Toggling enabled must NOT clobber the user's mode choice.
    hzmDriveEnabled.value = true
    expect(hzmDriveMode.value).toBe('llm')

    hzmDriveEnabled.value = false
    expect(hzmDriveMode.value).toBe('llm')
  })

  test('selected/blacklist tags are isolated per room', () => {
    setSelectedTags(1001, ['tag-a'])
    setSelectedTags(1002, ['tag-b'])
    expect(getSelectedTags(1001)).toEqual(['tag-a'])
    expect(getSelectedTags(1002)).toEqual(['tag-b'])

    setBlacklistTags(1001, ['bad'])
    expect(getBlacklistTags(1001)).toEqual(['bad'])
    expect(getBlacklistTags(1002)).toEqual([])
  })

  test('pushRecentSent caps at max length and dedupes', () => {
    pushRecentSent(1001, 'a', 3)
    pushRecentSent(1001, 'b', 3)
    pushRecentSent(1001, 'c', 3)
    pushRecentSent(1001, 'd', 3)
    const recent = getRecentSent(1001)
    expect(recent.length).toBe(3)
    expect(recent[recent.length - 1]).toBe('d')
    expect(recent).not.toContain('a')

    // duplicate moves to tail
    pushRecentSent(1001, 'b', 3)
    expect(getRecentSent(1001).at(-1)).toBe('b')
  })

  test('daily stats auto-reset when date changes', () => {
    bumpDailySent(1001)
    bumpDailySent(1001)
    bumpDailyLlmCalls(1001)
    const today = getDailyStats(1001)
    expect(today.sent).toBe(2)
    expect(today.llmCalls).toBe(1)

    // Manually rewrite to simulate yesterday
    const key = String(1001)
    hzmDailyStatsByRoom.value = {
      ...hzmDailyStatsByRoom.value,
      [key]: { date: '2000-01-01', sent: 99, llmCalls: 50 },
    }
    const fresh = getDailyStats(1001)
    expect(fresh.date).not.toBe('2000-01-01')
    expect(fresh.sent).toBe(0)
    expect(fresh.llmCalls).toBe(0)
  })

  test('null roomId returns empty/zeroed values', () => {
    expect(getSelectedTags(null)).toEqual([])
    expect(getRecentSent(null)).toEqual([])
    const stats = getDailyStats(null)
    expect(stats.sent).toBe(0)
    expect(stats.llmCalls).toBe(0)
  })
})

describe('sbhzm-client tag fetch + submit', () => {
  test('fetchSbhzmTags + submitSbhzmMeme work via DI xhr', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')

    const calls: Array<{ method?: string; url: string; body?: string }> = []
    type XhrOpts = {
      method?: string
      url: string
      data?: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    _setGmXhrForTests(((opts: XhrOpts) => {
      calls.push({ method: opts.method, url: opts.url, body: opts.data })
      let responseText = '[]'
      if (opts.url.includes('/api/public/tags')) {
        responseText = JSON.stringify([
          { id: 17, name: '打Call' },
          { id: 30, name: '爱灰泽满' },
          { id: 8, name: '满弟' },
        ])
      } else if (opts.url.includes('/api/admin/memes') && opts.method === 'POST') {
        responseText = JSON.stringify({
          id: 1751,
          content: JSON.parse(opts.data ?? '{}').content,
          copy_count: 0,
          created_at: '2026-05-02T20:54:43.495776',
          tags: [{ id: 17, name: '打Call' }],
        })
      }
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText,
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    try {
      const { fetchSbhzmTags, submitSbhzmMeme, inferSbhzmTagIds, _clearSbhzmCacheForTests } = await import(
        '../src/lib/sbhzm-client'
      )
      _clearSbhzmCacheForTests()

      const tags = await fetchSbhzmTags()
      expect(tags.find(t => t.name === '打Call')?.id).toBe(17)
      expect(tags.length).toBe(3)

      // Re-call should hit cache → no new HTTP call
      const sizeBefore = calls.length
      await fetchSbhzmTags()
      expect(calls.length).toBe(sizeBefore)

      // Inference: '冲耳朵啊' should match the '冲耳朵|耳朵痛|...' regex → '满弟' tag → id 8
      const source = getMemeSourceForRoom(1713546334)
      if (!source) throw new Error('Expected meme source for room 1713546334')
      const inferred = await inferSbhzmTagIds('冲耳朵啊兄弟', source)
      expect(inferred).toContain(8)

      // POST submit
      const result = await submitSbhzmMeme('我看灰泽满真是除了可爱一无是处啊', [17])
      expect(result.id).toBe(1751)
      expect(result.content).toContain('灰泽满')
      const submitCall = calls.at(-1)
      if (!submitCall) throw new Error('Expected submit call')
      expect(submitCall.method).toBe('POST')
      expect(submitCall.url).toContain('/api/admin/memes')
      const sentBody = JSON.parse(submitCall.body ?? '{}')
      expect(sentBody.content).toBe('我看灰泽满真是除了可爱一无是处啊')
      expect(sentBody.tag_ids).toEqual([17])
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('submit empty content rejects without HTTP call', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    let called = false
    _setGmXhrForTests(((_opts: unknown) => {
      called = true
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { submitSbhzmMeme } = await import('../src/lib/sbhzm-client')
      await expect(submitSbhzmMeme('   ')).rejects.toThrow(/为空/)
      expect(called).toBe(false)
    } finally {
      _setGmXhrForTests(null)
    }
  })
})

describe('sbhzm-client normalization', () => {
  test('normalizes raw memes to MemeWithUser shape with negative ids and _source tag', async () => {
    // Use the gm-fetch DI hook to inject a fake GM_xmlhttpRequest. (See
    // gm-fetch.ts comment: bun caches `$` exports across tests, so
    // mock.module('$') / mock.module('../src/lib/gm-fetch') don't reliably
    // reach gmFetch's resolver.)
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    _setGmXhrForTests(((opts: XhrOpts) => {
      const url = opts.url
      const body = url.includes('page=1')
        ? [
            { id: 100, content: '冲耳朵啊医生', tags: ['满弟', '医生'], copy_count: 42 },
            { id: 101, content: '想休息了', tags: [{ name: '略弥', emoji: '😴' }], copy_count: 10 },
            { id: 100, content: '冲耳朵啊医生', tags: ['满弟'], copy_count: 99 }, // dup id
            { content: 'no-id-fallback', tags: [] },
          ]
        : []
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText: JSON.stringify(body),
          responseHeaders: '',
          finalUrl: url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    try {
      const { fetchSbhzmMemes, _clearSbhzmCacheForTests } = await import('../src/lib/sbhzm-client')
      _clearSbhzmCacheForTests()
      const source = getMemeSourceForRoom(1713546334)
      if (!source) throw new Error('Expected meme source for room 1713546334')
      const memes = await fetchSbhzmMemes(source, true)

      expect(memes.length).toBeGreaterThanOrEqual(2)
      for (const m of memes) {
        expect(m._source).toBe('sbhzm')
        expect(m.id).toBeLessThan(0) // negative to avoid LAPLACE id collisions
        expect(typeof m.content).toBe('string')
        expect(m.content.length).toBeGreaterThan(0)
      }
      const contents = memes.map(m => m.content)
      const unique = new Set(contents)
      expect(unique.size).toBe(contents.length)

      const found = memes.find(m => m.content === '想休息了')
      expect(found?.tags[0]?.name).toBe('略弥')
      expect(found?.tags[0]?.emoji).toBe('😴')
    } finally {
      _setGmXhrForTests(null)
    }
  })

  // sbhzm API 不返回 last_copied_at；为了避免「最近使用」排序时所有 sbhzm 条堆底，
  // 我们用 created_at 当 lastCopiedAt 的代理。这样和 LAPLACE 的真实 lastCopiedAt
  // 在同一时间维度上参与排序，混合后的顺序仍然合理。
  test('sbhzm normalization uses created_at as lastCopiedAt fallback (not null)', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    _setGmXhrForTests(((opts: XhrOpts) => {
      const body = opts.url.includes('page=1')
        ? [
            { id: 1, content: 'A', copy_count: 5, created_at: '2026-05-01T10:00:00.000000', tags: [] },
            { id: 2, content: 'B', copy_count: 3, created_at: '2026-04-15T12:00:00.000000', tags: [] },
            // No created_at provided — should fall back to null lastCopiedAt
            { id: 3, content: 'C', copy_count: 1, tags: [] },
          ]
        : []
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText: JSON.stringify(body),
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    try {
      const { fetchSbhzmMemes, _clearSbhzmCacheForTests } = await import('../src/lib/sbhzm-client')
      _clearSbhzmCacheForTests()
      const source = getMemeSourceForRoom(1713546334)
      if (!source) throw new Error('Expected meme source for room 1713546334')
      const memes = await fetchSbhzmMemes(source, true)

      const a = memes.find(m => m.content === 'A')
      const b = memes.find(m => m.content === 'B')
      const c = memes.find(m => m.content === 'C')

      // created_at present → mirrors into lastCopiedAt (NOT null)
      expect(a?.lastCopiedAt).toBe('2026-05-01T10:00:00.000000')
      expect(a?.createdAt).toBe('2026-05-01T10:00:00.000000')
      expect(b?.lastCopiedAt).toBe('2026-04-15T12:00:00.000000')

      // No created_at → lastCopiedAt stays null (sortMemes pushes to bottom — acceptable)
      expect(c?.lastCopiedAt).toBeNull()
      expect(c?.createdAt).toBe('')
    } finally {
      _setGmXhrForTests(null)
    }
  })
})

describe('llm-driver testLLMConnection', () => {
  test('rejects empty API key without HTTP call', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    let httpCalled = false
    _setGmXhrForTests(((_opts: unknown) => {
      httpCalled = true
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      const r = await testLLMConnection({ provider: 'anthropic', apiKey: '   ', model: 'haiku' })
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/API key/)
      expect(httpCalled).toBe(false)
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('rejects openai-compat without baseURL', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    let httpCalled = false
    _setGmXhrForTests(((_opts: unknown) => {
      httpCalled = true
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      const r = await testLLMConnection({ provider: 'openai-compat', apiKey: 'sk-x', model: 'm', baseURL: '' })
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/base URL/)
      expect(httpCalled).toBe(false)
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('anthropic provider posts to /v1/messages with x-api-key and parses content[]', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      method?: string
      headers?: Record<string, string>
      data?: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    const seen: { url?: string; method?: string; headers?: Record<string, string> } = {}
    _setGmXhrForTests(((opts: XhrOpts) => {
      seen.url = opts.url
      seen.method = opts.method
      seen.headers = opts.headers
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText: JSON.stringify({ content: [{ text: '1' }] }),
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      const r = await testLLMConnection({
        provider: 'anthropic',
        apiKey: 'ant-12345',
        model: 'claude-haiku-4-5-20251001',
      })
      expect(r.ok).toBe(true)
      expect(r.error).toBeUndefined()
      expect(seen.url).toContain('api.anthropic.com/v1/messages')
      expect(seen.method).toBe('POST')
      expect(seen.headers?.['x-api-key']).toBe('ant-12345')
      expect(seen.headers?.['anthropic-version']).toBeTruthy()
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('openai provider posts to /v1/chat/completions with Bearer + choices parse', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      method?: string
      headers?: Record<string, string>
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    const seen: { url?: string; auth?: string } = {}
    _setGmXhrForTests(((opts: XhrOpts) => {
      seen.url = opts.url
      seen.auth = opts.headers?.Authorization
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText: JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      const r = await testLLMConnection({ provider: 'openai', apiKey: 'sk-abc', model: 'gpt-4o-mini' })
      expect(r.ok).toBe(true)
      expect(seen.url).toContain('api.openai.com/v1/chat/completions')
      expect(seen.auth).toBe('Bearer sk-abc')
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('openai-compat routes to user baseURL with /v1/chat/completions appended', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    let seenUrl = ''
    _setGmXhrForTests(((opts: XhrOpts) => {
      seenUrl = opts.url
      setTimeout(() => {
        opts.onload?.({
          status: 200,
          statusText: 'OK',
          responseText: JSON.stringify({ choices: [{ message: { content: '1' } }] }),
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      // Trailing slash on baseURL should be trimmed; route should match exactly once.
      const r = await testLLMConnection({
        provider: 'openai-compat',
        apiKey: 'sk-deepseek',
        model: 'deepseek-chat',
        baseURL: 'https://api.deepseek.com/',
      })
      expect(r.ok).toBe(true)
      expect(seenUrl).toBe('https://api.deepseek.com/v1/chat/completions')
    } finally {
      _setGmXhrForTests(null)
    }
  })

  test('non-2xx response surfaces as ok=false with error message', async () => {
    const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
    type XhrOpts = {
      url: string
      onload?: (r: {
        status: number
        statusText: string
        responseText: string
        responseHeaders: string
        finalUrl: string
      }) => void
    }
    _setGmXhrForTests(((opts: XhrOpts) => {
      setTimeout(() => {
        opts.onload?.({
          status: 401,
          statusText: 'Unauthorized',
          responseText: '{"error":"invalid_api_key"}',
          responseHeaders: '',
          finalUrl: opts.url,
        })
      }, 0)
      return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
    try {
      const { testLLMConnection } = await import('../src/lib/llm-driver')
      const r = await testLLMConnection({ provider: 'anthropic', apiKey: 'bad-key', model: 'm' })
      expect(r.ok).toBe(false)
      expect(r.error).toMatch(/401/)
    } finally {
      _setGmXhrForTests(null)
    }
  })
})
