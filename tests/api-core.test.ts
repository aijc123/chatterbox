import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

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
  // store.ts imports subscribeCustomChatWsStatus to wire the liveWsStatus
  // signal at module load. Mocks must expose every export the importer
  // touches or the import throws "Export named ... not found".
  subscribeCustomChatWsStatus: (_handler: (status: string) => void) => () => {},
}))

// IMPORTANT: spread the real module first so other test files that import
// wbi for different named exports (e.g. `wbiDiagnostics` in
// tests/wbi-diagnostics.test.ts) don't fail with "Export named ... not
// found in module 'wbi'" once bun's process-wide `mock.module` retains this
// stub. See tests/_gm-store.ts for the broader rationale.
const realWbi = await import('../src/lib/wbi')
mock.module('../src/lib/wbi', () => ({
  ...realWbi,
  cachedWbiKeys: null,
  encodeWbi: () => '',
}))

interface FetchCall {
  url: string
  init: RequestInit
}

const fetchCalls: FetchCall[] = []
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> = async () => jsonResponse({ code: 0, data: {} })

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
  location: { href: 'https://live.bilibili.com/1000' },
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

function pkg(pkg_id: number, emoticon_unique = `emo-${pkg_id}`) {
  return {
    pkg_id,
    pkg_name: `pkg-${pkg_id}`,
    pkg_type: 1,
    pkg_descript: '',
    emoticons: [
      {
        emoji: '[ok]',
        descript: 'ok',
        url: 'https://example.test/ok.png',
        emoticon_unique,
        emoticon_id: pkg_id,
        perm: 1,
      },
    ],
  }
}

const {
  checkSelfRoomRestrictions,
  fetchEmoticons,
  fetchMedalRooms,
  fetchRoomLiveStatus,
  getCsrfToken,
  getDedeUid,
  getRoomId,
  getSpmPrefix,
  sendDanmaku,
  setDanmakuMode,
  setRandomDanmakuColor,
} = await import('../src/lib/api')
const { availableDanmakuColors, cachedEmoticonPackages, cachedRoomId, cachedStreamerUid } = await import(
  '../src/lib/store'
)

beforeEach(() => {
  fetchCalls.length = 0
  echoCalls.length = 0
  localEchoName = ''
  spmPrefix = ''
  testDocument.cookie = 'DedeUserID=42; bili_jct=csrf-token'
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedEmoticonPackages.value = []
  availableDanmakuColors.value = null
  fetchImpl = async () => jsonResponse({ code: 0, data: {} })
})

afterEach(() => {
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedEmoticonPackages.value = []
  availableDanmakuColors.value = null
})

describe('api core Bilibili room and send contracts', () => {
  test('cookie and spm helpers read Bilibili page state with safe fallbacks', () => {
    testDocument.cookie = 'foo=bar; bili_jct=csrf-123; DedeUserID=42'
    spmPrefix = '999.88'

    expect(getCsrfToken()).toBe('csrf-123')
    expect(getDedeUid()).toBe('42')
    expect(getSpmPrefix()).toBe('999.88')

    spmPrefix = ''
    expect(getSpmPrefix()).toBe('444.8')
  })

  test('getRoomId resolves short-room IDs through room_init and caches streamer UID', async () => {
    fetchImpl = async url => {
      expect(url).toContain('/room/v1/Room/room_init?id=233')
      return jsonResponse({ code: 0, data: { room_id: 100233, uid: 9001 } })
    }

    const roomId = await getRoomId('https://live.bilibili.com/233')

    expect(roomId).toBe(100233)
    expect(cachedStreamerUid.value).toBe(9001)
    expect(fetchCalls[0]?.init).toMatchObject({ method: 'GET', credentials: 'include' })
  })

  test('getRoomId falls back to get_info when room_init is unavailable', async () => {
    fetchImpl = async url => {
      if (url.includes('/room/v1/Room/room_init')) throw new Error('primary down')
      expect(url).toContain('/room/v1/Room/get_info?room_id=456')
      return jsonResponse({ code: 0, data: { room_id: 456001, uid: 8001 } })
    }

    await expect(getRoomId('https://live.bilibili.com/456')).resolves.toBe(456001)
    expect(cachedStreamerUid.value).toBe(8001)
  })

  test('fetchRoomLiveStatus maps live/offline/unknown without throwing on API drift', async () => {
    fetchImpl = async url => {
      if (url.includes('id=1')) return jsonResponse({ code: 0, data: { live_status: 1 } })
      if (url.includes('id=2')) return jsonResponse({ code: 0, data: { live_status: 0 } })
      return jsonResponse({ code: -400, data: {} })
    }

    await expect(fetchRoomLiveStatus(1)).resolves.toBe('live')
    await expect(fetchRoomLiveStatus(2)).resolves.toBe('offline')
    await expect(fetchRoomLiveStatus(3)).resolves.toBe('unknown')
  })

  test('fetchEmoticons filters the B-coin package before caching room emoticons', async () => {
    fetchImpl = async url => {
      expect(url).toContain('/emoticon/GetEmoticons?platform=pc&room_id=99')
      return jsonResponse({ code: 0, data: { data: [pkg(100, 'paid'), pkg(1, 'free')] } })
    }

    await fetchEmoticons(99)

    expect(cachedEmoticonPackages.value.map(p => p.pkg_id)).toEqual([1])
    expect(cachedEmoticonPackages.value[0]?.emoticons[0]?.emoticon_unique).toBe('free')
  })

  test('sendDanmaku posts the Bilibili form, marks Chatterbox-originated requests, and emits local echo', async () => {
    localEchoName = 'Tester'
    let sentBody: FormData | null = null
    fetchImpl = async (_url, init) => {
      sentBody = init.body as FormData
      return jsonResponse({ code: 0, data: { dmid: 'ok' } })
    }

    const result = await sendDanmaku('hello', 123, 'csrf-token')

    expect(result.success).toBe(true)
    expect(result.isEmoticon).toBe(false)
    expect(fetchCalls[0]?.url).toContain('/msg/send?cb_send=1')
    expect(fetchCalls[0]?.init).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(sentBody?.get('msg')).toBe('hello')
    expect(sentBody?.get('roomid')).toBe('123')
    expect(sentBody?.get('csrf')).toBe('csrf-token')
    expect(echoCalls).toEqual([{ message: 'hello', uid: '42', user: { uname: 'Tester' } }])
  })

  test('sendDanmaku treats non-zero Bilibili business codes as failed sends and preserves diagnostics', async () => {
    fetchImpl = async () => jsonResponse({ code: 10024, message: '被禁言', data: { until: 60 } })

    const result = await sendDanmaku('blocked', 123, 'csrf-token')

    expect(result).toMatchObject({
      success: false,
      message: 'blocked',
      isEmoticon: false,
      error: '被禁言',
      errorCode: 10024,
      errorData: { until: 60 },
    })
    expect(echoCalls).toHaveLength(0)
  })

  test('setDanmakuMode and setRandomDanmakuColor post best-effort config forms', async () => {
    availableDanmakuColors.value = ['0xabc123']
    const bodies: FormData[] = []
    fetchImpl = async (_url, init) => {
      bodies.push(init.body as FormData)
      return jsonResponse({ code: 0 })
    }

    await setDanmakuMode(123, 'csrf-token', '4')
    await setRandomDanmakuColor(123, 'csrf-token')

    expect(fetchCalls.map(call => call.url)).toEqual([
      'https://api.live.bilibili.com/xlive/web-room/v1/dM/AjaxSetConfig',
      'https://api.live.bilibili.com/xlive/web-room/v1/dM/AjaxSetConfig',
    ])
    expect(bodies[0]?.get('mode')).toBe('4')
    expect(bodies[0]?.get('room_id')).toBe('123')
    expect(bodies[1]?.get('color')).toBe('0xabc123')
    expect(bodies[1]?.get('csrf')).toBe('csrf-token')

    fetchImpl = async () => {
      throw new Error('best effort endpoint down')
    }
    await expect(setDanmakuMode(123, 'csrf-token', '1')).resolves.toBeUndefined()
    await expect(setRandomDanmakuColor(123, 'csrf-token')).resolves.toBeUndefined()
  })
})

describe('getRoomId — enriched error messages', () => {
  test('non-room URL: error includes URL slice + issues link + how-to hint', async () => {
    await expect(getRoomId('https://example.com/some/page')).rejects.toThrow(
      /无法从当前页面 URL 解析直播间号.*example\.com.*live\.bilibili\.com.*github\.com\/aijc123/s
    )
  })

  test('all endpoints fail + slug=0 (fails directId guard): error names both fallback failures + cause hint + issues link', async () => {
    // Slug "0" passes the URL parser but fails the `directId > 0` last-resort
    // check, so the error path with the enriched fallback-failure message is
    // actually reachable.
    fetchImpl = async () => jsonResponse({ code: -1, data: {} }, { status: 503, statusText: 'Service Unavailable' })
    await expect(getRoomId('https://live.bilibili.com/0')).rejects.toThrow(
      /无法获取真实直播间 ID.*room_init HTTP 503.*get_info HTTP 503.*github\.com\/aijc123/s
    )
  })

  test('network error on primary, success on fallback: returns the room id without throwing', async () => {
    let callCount = 0
    fetchImpl = async () => {
      callCount += 1
      if (callCount === 1) throw new Error('ENETUNREACH')
      return jsonResponse({ code: 0, data: { room_id: 999, uid: 12345 } })
    }
    await expect(getRoomId('https://live.bilibili.com/100')).resolves.toBe(999)
  })
})

describe('api core medal and restriction checks', () => {
  test('fetchMedalRooms parses direct room IDs, live links, UID fallback, and dedupes by room', async () => {
    fetchImpl = async url => {
      if (url.includes('/user/MedalWall')) {
        expect(url).toContain('target_id=42')
        return jsonResponse({
          code: 0,
          data: {
            list: [
              {
                medal_info: { roomid: '101', medal_name: '牌A', target_id: '501' },
                anchor_info: { uname: '主播A' },
              },
              {
                link: 'https://live.bilibili.com/blanc/202',
                medal_info: { name: '牌B' },
                target_name: '主播B',
              },
              {
                medal_info: { medal_name: '牌C', target_id: '503' },
                anchor_info: { name: '主播C' },
              },
              {
                room_id: 101,
                medal_name: '牌A-重复',
                uname: '主播A-new',
              },
              null,
            ],
          },
        })
      }
      if (url.includes('/Room/getRoomInfoOld?mid=503')) {
        return jsonResponse({ code: 0, data: { roomid: 303 } })
      }
      throw new Error(`unexpected fetch ${url}`)
    }

    const rooms = await fetchMedalRooms()

    expect(rooms).toEqual([
      { roomId: 101, medalName: '牌A-重复', anchorName: '主播A-new', anchorUid: null, source: 'medal-room-id' },
      { roomId: 202, medalName: '牌B', anchorName: '主播B', anchorUid: null, source: 'medal-link' },
      { roomId: 303, medalName: '牌C', anchorName: '主播C', anchorUid: 503, source: 'anchor-uid' },
    ])
  })

  test('fetchMedalRooms fails before network when the login UID cookie is missing', async () => {
    testDocument.cookie = 'bili_jct=csrf-token'

    await expect(fetchMedalRooms()).rejects.toThrow('未找到登录 UID')
    expect(fetchCalls).toHaveLength(0)
  })

  test('checkSelfRoomRestrictions merges getInfoByUser and silent-list signals for the current UID', async () => {
    fetchImpl = async url => {
      if (url.includes('/index/getInfoByUser')) {
        return jsonResponse({ code: 0, data: { profile: { is_silent: true, remain_seconds: 60 } } })
      }
      if (url.includes('/banned/GetSilentUserList')) {
        return jsonResponse({ code: 0, data: { list: [{ uid: 42, msg: 'mute hit' }] } })
      }
      throw new Error(`unexpected fetch ${url}`)
    }

    const signals = await checkSelfRoomRestrictions(777)

    expect(signals.map(signal => signal.kind)).toEqual(['muted', 'muted'])
    expect(signals.map(signal => signal.source)).toEqual(['getInfoByUser', 'GetSilentUserList'])
    expect(fetchCalls.map(call => call.url)).toEqual([
      'https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByUser?room_id=777&from=0',
      'https://api.live.bilibili.com/xlive/web-ucenter/v1/banned/GetSilentUserList?room_id=777&ps=50&pn=1',
    ])
  })
})
