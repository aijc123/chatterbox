// Coverage extension for `src/lib/api.ts`. The api-core suite already pins
// the room-init / sendDanmaku golden paths and a couple of fan-medal cases;
// this file fills the gaps the coverage report flagged: ensureRoomId SPA
// invalidation, fetchFollowingRooms pagination, checkMedalRoomRestriction,
// the WBI-signed sendDanmaku branch, locked-emoticon early return, HTTP /
// abort error paths, and a few small helper fall-throughs (firstString
// '未知', findMedalEntries nested-list shape, fetchRoomLiveStatus unknown
// fallback, safeExtractRoomNumber catch).
//
// Mocking pattern mirrors api-core.test.ts: stub `'$'`, mock
// custom-chat-events to capture echo calls, and spread the real wbi module
// before overriding `cachedWbiKeys` + `encodeWbi`. This file pre-seeds a
// non-null cachedWbiKeys (api-core covers the null branch) so the WBI
// signing branch is exercised in every sendDanmaku call below.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { BilibiliWbiKeys } from '../src/types'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

interface EchoCall {
  message: string
  uid: string | null
  user: { uname?: string }
}

const echoCalls: EchoCall[] = []

mock.module('../src/lib/custom-chat-events', () => ({
  emitLocalDanmakuEcho: (message: string, uid: string | null, user: { uname?: string }) => {
    echoCalls.push({ message, uid, user })
  },
  subscribeCustomChatWsStatus: (_handler: (status: string) => void) => () => {},
}))

interface WbiCall {
  params: Record<string, unknown>
  keys: BilibiliWbiKeys
}
const wbiCalls: WbiCall[] = []

const realWbi = await import('../src/lib/wbi')
mock.module('../src/lib/wbi', () => ({
  ...realWbi,
  getCachedWbiKeys: () => ({
    img_key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    sub_key: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  }),
  encodeWbi: (params: Record<string, unknown>, keys: BilibiliWbiKeys) => {
    wbiCalls.push({ params, keys })
    return 'web_location=999.88&w_rid=signed&wts=1700000000'
  },
}))

interface FetchCall {
  url: string
  init: RequestInit
}

const fetchCalls: FetchCall[] = []
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> = async (_url, _init) =>
  jsonResponse({ code: 0, data: {} })

let localEchoName = ''
let spmPrefix = ''
const testDocument = {
  cookie: '',
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: (selector: string) => {
    if (selector === 'meta[name="spm_prefix"]') {
      return spmPrefix ? { getAttribute: () => spmPrefix } : null
    }
    if (selector.includes('user-name') || selector.includes('uname') || selector.includes('name')) {
      return localEchoName ? { textContent: localEchoName } : null
    }
    return null
  },
}

let currentHref = 'https://live.bilibili.com/1000'
;(globalThis as typeof globalThis & { document: typeof testDocument }).document = testDocument
;(
  globalThis as typeof globalThis & {
    window: {
      location: { href: string }
      addEventListener: () => void
      removeEventListener: () => void
    }
  }
).window = {
  location: {
    get href() {
      return currentHref
    },
  } as { href: string },
  addEventListener: () => {},
  removeEventListener: () => {},
}
;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const requestInit = init ?? {}
  fetchCalls.push({ url, init: requestInit })
  return fetchImpl(url, requestInit)
}) as typeof fetch

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

const {
  checkMedalRoomRestriction,
  checkSelfRoomRestrictions,
  ensureRoomId,
  fetchFollowingRooms,
  fetchMedalRooms,
  fetchRoomLiveStatus,
  getRoomId,
  sendDanmaku,
} = await import('../src/lib/api')
const { availableDanmakuColors, cachedEmoticonPackages, cachedRoomId, cachedStreamerUid } = await import(
  '../src/lib/store'
)

beforeEach(() => {
  fetchCalls.length = 0
  echoCalls.length = 0
  wbiCalls.length = 0
  localEchoName = ''
  spmPrefix = ''
  testDocument.cookie = 'DedeUserID=42; bili_jct=csrf-token'
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedEmoticonPackages.value = []
  availableDanmakuColors.value = null
  currentHref = 'https://live.bilibili.com/1000'
  fetchImpl = async () => jsonResponse({ code: 0, data: {} })
})

afterEach(() => {
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedEmoticonPackages.value = []
  availableDanmakuColors.value = null
})

describe('ensureRoomId SPA-aware caching', () => {
  test('returns cached room id when the URL slug matches the prior resolution', async () => {
    fetchImpl = async () => jsonResponse({ code: 0, data: { room_id: 100200, uid: 7000 } })
    currentHref = 'https://live.bilibili.com/200'

    const first = await ensureRoomId()
    expect(first).toBe(100200)
    expect(fetchCalls).toHaveLength(1)

    // Second call with same URL → no extra network, same result.
    const second = await ensureRoomId()
    expect(second).toBe(100200)
    expect(fetchCalls).toHaveLength(1)
  })

  test('invalidates and re-resolves when the URL slug changes (SPA navigation)', async () => {
    let nextRoom = 100200
    fetchImpl = async url => {
      if (url.includes('room_init')) {
        return jsonResponse({ code: 0, data: { room_id: nextRoom, uid: 7000 } })
      }
      return jsonResponse({ code: 0, data: {} })
    }
    currentHref = 'https://live.bilibili.com/200'

    expect(await ensureRoomId()).toBe(100200)

    nextRoom = 100300
    currentHref = 'https://live.bilibili.com/300'
    expect(await ensureRoomId()).toBe(100300)

    expect(fetchCalls.filter(c => c.url.includes('room_init'))).toHaveLength(2)
  })

  test('safeExtractRoomNumber swallows URL parser errors so ensureRoomId can throw a message error', async () => {
    currentHref = 'not-a-valid-url'
    // No fetch should be issued — the URL parse fails before getRoomId hits
    // any endpoint, and the resulting error message names the URL.
    await expect(ensureRoomId()).rejects.toThrow(/无法从当前页面 URL 解析直播间号/)
    expect(fetchCalls).toHaveLength(0)
  })
})

describe('getRoomId fallback paths', () => {
  test('falls back to directId when room_init HTTP-fails and get_info returns code !== 0', async () => {
    let calls = 0
    fetchImpl = async () => {
      calls += 1
      if (calls === 1) return jsonResponse({}, { status: 503 })
      return jsonResponse({ code: -101, data: {} })
    }
    // Slug "777" passes toNumber and `> 0`, so this exercises the
    // fallbackFailReason='get_info code=-101' assignment (line 124) and
    // then the last-resort directId path returns 777.
    await expect(getRoomId('https://live.bilibili.com/777')).resolves.toBe(777)
  })

  test('throws with both fallback failure messages when get_info returns code !== 0 and slug is 0', async () => {
    let calls = 0
    fetchImpl = async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ code: -1, data: {} }, { status: 503 })
      return jsonResponse({ code: -352, message: 'risk', data: {} })
    }
    await expect(getRoomId('https://live.bilibili.com/0')).rejects.toThrow(/room_init HTTP 503.*get_info code=-352/s)
  })

  test('handles network reject on get_info fallback', async () => {
    let calls = 0
    fetchImpl = async () => {
      calls += 1
      if (calls === 1) return jsonResponse({}, { status: 500 })
      throw new Error('ECONNRESET')
    }
    await expect(getRoomId('https://live.bilibili.com/0')).rejects.toThrow(
      /room_init HTTP 500.*get_info 网络错误.*ECONNRESET/s
    )
  })
})

describe('fetchRoomLiveStatus edge cases', () => {
  test('returns "unknown" when API responds code 0 but live_status is missing', async () => {
    fetchImpl = async () => jsonResponse({ code: 0, data: {} })
    await expect(fetchRoomLiveStatus(99)).resolves.toBe('unknown')
  })

  test('returns "unknown" on HTTP failure', async () => {
    fetchImpl = async () => jsonResponse({}, { status: 503 })
    await expect(fetchRoomLiveStatus(99)).resolves.toBe('unknown')
  })
})

describe('fetchMedalRooms helper coverage', () => {
  test('extracts entries from nested {data:{list:[...]}} shape and applies "未知" name fallback', async () => {
    fetchImpl = async url => {
      if (url.includes('/user/MedalWall')) {
        return jsonResponse({
          code: 0,
          // Wraps `list` inside `data` to trip the nested-object branch in
          // findMedalEntries.
          data: {
            data: {
              list: [
                // No anchor name fields anywhere → firstString returns '未知'.
                { medal_info: { roomid: '555' } },
              ],
            },
          },
        })
      }
      throw new Error(`unexpected ${url}`)
    }
    const rooms = await fetchMedalRooms()
    expect(rooms).toEqual([
      { roomId: 555, medalName: '未知', anchorName: '未知', anchorUid: null, source: 'medal-room-id' },
    ])
  })

  test('throws Bilibili business error message when MedalWall returns code !== 0', async () => {
    fetchImpl = async () => jsonResponse({ code: -101, message: '账号未登录' })
    await expect(fetchMedalRooms()).rejects.toThrow('账号未登录')
  })

  test('throws on HTTP failure', async () => {
    fetchImpl = async () => jsonResponse({}, { status: 502 })
    await expect(fetchMedalRooms()).rejects.toThrow(/HTTP 502/)
  })

  test('returns [] when MedalWall response has neither list nor data.list (covers the empty-loop fall-through)', async () => {
    fetchImpl = async () => jsonResponse({ code: 0, data: { something_else: 'x' } })
    await expect(fetchMedalRooms()).resolves.toEqual([])
  })
})

describe('fetchFollowingRooms pagination and resolution', () => {
  test('paginates until a partial page, dedupes by room id, and resolves anchor UIDs concurrently', async () => {
    fetchImpl = async url => {
      if (url.includes('/x/relation/followings')) {
        const u = new URL(url)
        const page = Number(u.searchParams.get('pn'))
        if (page === 1) {
          // Full page: 50 entries to force a second request. Each anchor's
          // mid maps to a unique room except mid 1003 collides with 1001's
          // resolved room (dedup case below).
          const list = Array.from({ length: 50 }, (_, i) => ({ mid: 1000 + i, uname: `主播${i}` }))
          return jsonResponse({ code: 0, data: { list } })
        }
        if (page === 2) {
          return jsonResponse({
            code: 0,
            data: {
              list: [
                // Partial page (<50) → loop terminates after this batch.
                { mid: 2001, uname: '主播X' },
                null,
                { uid: 'not-a-number' },
              ],
            },
          })
        }
        return jsonResponse({ code: 0, data: { list: [] } })
      }
      if (url.includes('/Room/getRoomInfoOld')) {
        const u = new URL(url)
        const mid = Number(u.searchParams.get('mid'))
        // Anchors 1010 → no live room (code 0 but data missing), 1011 → !ok,
        // 2001 collides with 1001's room id to exercise the Map dedup.
        if (mid === 1010) return jsonResponse({ code: 0, data: { roomid: 0 } })
        if (mid === 1011) return jsonResponse({}, { status: 500 })
        if (mid === 2001) return jsonResponse({ code: 0, data: { roomid: 5001 } })
        return jsonResponse({ code: 0, data: { roomid: 4000 + mid } })
      }
      throw new Error(`unexpected ${url}`)
    }

    const rooms = await fetchFollowingRooms(2)

    // 50 anchors on page 1 + 1 valid on page 2 = 51; mid 1010/1011 yield no
    // room, and mid 2001 collides with 1001 (room id 5001). Net unique =
    // 50 - 2 = 48.
    expect(rooms).toHaveLength(48)
    // Spot-check shape and that anchor UID falls back to the followings UID
    // when the resolver omits it.
    const sample = rooms.find(r => r.roomId === 5001)
    expect(sample?.anchorName).toBeTruthy()
    expect(sample?.anchorUid).toBeGreaterThan(0)

    // Two pagination requests.
    expect(fetchCalls.filter(c => c.url.includes('/x/relation/followings'))).toHaveLength(2)
  })

  test('throws when the followings request returns a non-zero business code', async () => {
    fetchImpl = async url => {
      if (url.includes('/x/relation/followings')) {
        return jsonResponse({ code: -799, msg: '请求过于频繁' })
      }
      return jsonResponse({ code: 0, data: {} })
    }
    await expect(fetchFollowingRooms(1)).rejects.toThrow('请求过于频繁')
  })

  test('throws on HTTP failure of the followings page', async () => {
    fetchImpl = async () => jsonResponse({}, { status: 503, statusText: 'down' })
    await expect(fetchFollowingRooms(1)).rejects.toThrow(/HTTP 503/)
  })

  test('refuses to call the API without a login UID cookie', async () => {
    testDocument.cookie = 'bili_jct=csrf-token'
    await expect(fetchFollowingRooms()).rejects.toThrow('未找到登录 UID')
    expect(fetchCalls).toHaveLength(0)
  })
})

describe('checkMedalRoomRestriction status mapping', () => {
  const room = {
    roomId: 1234,
    medalName: '牌',
    anchorName: '主播',
    anchorUid: 9999,
    source: 'medal-room-id' as const,
  }

  test('returns ok with note when no signals and no deactivation', async () => {
    fetchImpl = async () => jsonResponse({ code: 0, data: {} })
    const result = await checkMedalRoomRestriction(room)
    expect(result.status).toBe('ok')
    expect(result.note).toBe('接口未发现禁言/封禁信号')
    expect(result.signals).toEqual([])
  })

  test('returns restricted when getInfoByUser surfaces a muted signal', async () => {
    fetchImpl = async url => {
      if (url.includes('getInfoByUser')) {
        return jsonResponse({ code: 0, data: { profile: { is_silent: true, remain_seconds: 60 } } })
      }
      return jsonResponse({ code: 0, data: {} })
    }
    const result = await checkMedalRoomRestriction(room)
    expect(result.status).toBe('restricted')
    expect(result.note).toBeUndefined()
    expect(result.signals.some(s => s.kind === 'muted')).toBe(true)
  })

  test('returns deactivated when only a deactivated signal is present', async () => {
    fetchImpl = async url => {
      if (url.includes('getInfoByUser')) {
        return jsonResponse({ code: 0, data: { reason: '账号已注销' } })
      }
      return jsonResponse({ code: 0, data: {} })
    }
    const result = await checkMedalRoomRestriction(room)
    expect(result.status).toBe('deactivated')
    expect(result.note).toBe('主播账号已注销，跳过禁言判断')
  })

  test('returns unknown with an error note when the API throws', async () => {
    fetchImpl = async () => {
      throw new Error('boom')
    }
    const result = await checkMedalRoomRestriction(room)
    expect(result.status).toBe('unknown')
    expect(result.signals).toEqual([])
    expect(result.note).toBe('boom')
  })

  test('checkSelfRoomRestrictions filters out unknown-kind signals from non-zero getInfoByUser', async () => {
    // Drives the `code !== 0` branch in fetchRoomUserInfoSignals (lines
    // 484-491). The synthesized 'unknown' signal is then filtered out by
    // checkSelfRoomRestrictions, so the user-facing array stays empty.
    fetchImpl = async url => {
      if (url.includes('getInfoByUser')) {
        return jsonResponse({ code: -101, message: '账号未登录' })
      }
      return jsonResponse({ code: 0, data: {} })
    }
    const signals = await checkSelfRoomRestrictions(101)
    expect(signals).toEqual([])
  })
})

describe('sendDanmaku branches not exercised by api-core', () => {
  test('signs the request with WBI when cached keys are present and includes the marker', async () => {
    fetchImpl = async () => jsonResponse({ code: 0, data: { dmid: 'ok' } })

    const result = await sendDanmaku('hi', 1, 'csrf-token')

    expect(result.success).toBe(true)
    expect(wbiCalls).toHaveLength(1)
    expect(wbiCalls[0]?.keys.img_key).toMatch(/^a+$/)
    // url should include the stub-signed query AND the marker.
    expect(fetchCalls[0]?.url).toContain('w_rid=signed')
    expect(fetchCalls[0]?.url).toContain('cb_send=1')
  })

  test('rejects locked emoticons before posting and surfaces the unlock requirement', async () => {
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'pack',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '[lock]',
            descript: 'lock',
            url: 'https://example.test/lock.png',
            emoticon_unique: 'lock-unique',
            emoticon_id: 1,
            perm: 0,
            unlock_show_text: '点亮粉丝牌',
          },
        ],
      },
    ]

    const result = await sendDanmaku('lock-unique', 99, 'csrf')
    expect(result).toMatchObject({
      success: false,
      isEmoticon: true,
      error: '表情权限不足，需要 点亮粉丝牌',
    })
    expect(fetchCalls).toHaveLength(0)
    expect(echoCalls).toHaveLength(0)
  })

  test('locked emoticon without unlock_show_text falls back to the generic reason', async () => {
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'pack',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '[lock]',
            descript: 'lock',
            url: 'https://example.test/lock.png',
            emoticon_unique: 'lock-unique',
            emoticon_id: 1,
            perm: 0,
          },
        ],
      },
    ]
    const result = await sendDanmaku('lock-unique', 99, 'csrf')
    expect(result.error).toBe('表情权限不足')
  })

  test('unlocked unique emoticons append dm_type=1 and an empty emoticon_options blob', async () => {
    cachedEmoticonPackages.value = [
      {
        pkg_id: 2,
        pkg_name: 'pack',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '[ok]',
            descript: 'ok',
            url: 'https://example.test/ok.png',
            emoticon_unique: 'ok-unique',
            emoticon_id: 9,
            perm: 1,
          },
        ],
      },
    ]
    let body: FormData | null = null
    fetchImpl = async (_url, init) => {
      body = init.body as FormData
      return jsonResponse({ code: 0, data: { dmid: 'ok' } })
    }
    const result = await sendDanmaku('ok-unique', 1, 'csrf')
    expect(result.success).toBe(true)
    expect(result.isEmoticon).toBe(true)
    expect(body?.get('dm_type')).toBe('1')
    expect(body?.get('emoticon_options')).toBe('{}')
  })

  test('returns an HTTP error result when the send endpoint responds non-2xx', async () => {
    fetchImpl = async () => jsonResponse({}, { status: 502, statusText: 'Bad Gateway' })
    const result = await sendDanmaku('hi', 1, 'csrf')
    expect(result).toMatchObject({ success: false, error: 'HTTP 502' })
    expect(echoCalls).toHaveLength(0)
  })

  test('treats AbortError as the timeout-shaped error message', async () => {
    fetchImpl = async () => {
      throw new DOMException('aborted', 'AbortError')
    }
    const result = await sendDanmaku('hi', 1, 'csrf')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/无响应$/)
  })

  test('reports generic Error.message when the fetch rejects with a real Error', async () => {
    fetchImpl = async () => {
      throw new Error('network down')
    }
    const result = await sendDanmaku('hi', 1, 'csrf')
    expect(result).toMatchObject({ success: false, error: 'network down' })
  })

  test('falls back to "我" for the local echo display name when no DOM selectors match', async () => {
    localEchoName = ''
    fetchImpl = async () => jsonResponse({ code: 0, data: { dmid: 'ok' } })
    await sendDanmaku('hi', 1, 'csrf')
    expect(echoCalls).toEqual([{ message: 'hi', uid: '42', user: { uname: '我' } }])
  })
})
