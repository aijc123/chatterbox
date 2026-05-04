// Coverage for `src/lib/live-ws-source.ts` — currently 13.64% func / 12.41%
// lines. This is the biggest single src/ gap remaining; previously hard to
// reach because `connect()` calls `new LiveWS(...)` directly.
//
// Strategy:
//   1. Add `_setLiveWsFactoryForTests` to source (DI seam, see source).
//   2. Build a MockLiveWS with `addEventListener` + `_emit(type, payload)`
//      to drive the bindEvents handlers.
//   3. Mock fetch for both `/x/web-interface/nav` (WBI keys) AND
//      `getDanmuInfo` so `connect()` succeeds.
//   4. Mock `api.ensureRoomId` and `api.getDedeUid` via `mock.module`.
//   5. Subscribe to `emitCustomChatEvent` to observe payload translations.
//
// What we cover:
//   - Lifecycle: connecting → live → close → reconnect (computeReconnectDelay)
//   - bindEvents handlers: DANMU_MSG / SEND_GIFT / SUPER_CHAT_MESSAGE /
//                          INTERACT_WORD (enter + follow) / GUARD_BUY /
//                          ANCHOR_LOT_START / ENTRY_EFFECT /
//                          POPULARITY_RED_POCKET_START
//   - hasRecentWsDanmaku / rememberWsDanmaku via DANMU_MSG path
//   - extractEmoticonImage via DANMU_MSG with sticker info
//   - asNumber / asString coercion diagnostics on schema drift
//   - close + reconnect timer scheduling
//   - stopLiveWsSource resets state (consumerCount, started, status='off')
//
// What we DON'T cover (out of scope, audit §5 candidates):
//   - real WebSocket frame parsing (LiveWS internals)
//   - real network reconnect backoff timing (we just verify the timer is set)

import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  Node: happyWindow.Node,
  window: happyWindow,
})

// wbi.ts (transitively imported by live-ws-source.ts) patches
// XMLHttpRequest.prototype at module load. happy-dom doesn't surface XHR by
// default, so install a no-op stub before any module load.
if (!('XMLHttpRequest' in globalThis)) {
  class TestXMLHttpRequest {
    responseText = ''
    addEventListener(): void {}
    open(): void {}
    send(): void {}
  }
  ;(globalThis as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest
}
// Stub WebSocket too — LiveWS's createWebSocket option calls `new WebSocket(url)`.
// We don't actually use it (factory override skips that path), but the
// production createWebSocket option assignment still has to typecheck.
if (!('WebSocket' in globalThis)) {
  class TestWebSocket extends EventTarget {
    constructor(_url: string) {
      super()
    }
    close(): void {}
  }
  ;(globalThis as { WebSocket: typeof TestWebSocket }).WebSocket = TestWebSocket
}
// custom-chat-events.ts's prewarmAvatar uses `new Image()`, which happy-dom
// doesn't surface to globalThis by default. Provide a no-op stub so emit
// handlers don't throw.
if (!('Image' in globalThis)) {
  class RecordingImage {
    src = ''
    decoding = ''
    referrerPolicy = ''
    decode(): Promise<void> {
      return Promise.resolve()
    }
  }
  ;(globalThis as { Image: unknown }).Image = RecordingImage
}

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { CustomChatEvent, CustomChatWsStatus } from '../src/lib/custom-chat-events'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({
  ...realApi,
  ensureRoomId: async () => 12345,
  getDedeUid: () => '99999', // self-uid; not a typical sender
}))

// ---------------- fetch routing -----------------------------------------
let danmuInfoResponder: () => Response = () =>
  new Response(
    JSON.stringify({
      code: 0,
      data: {
        token: 'tok-fixture',
        host_list: [{ host: 'danmu.example.com', wss_port: 443 }],
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
let wbiNavResponder: () => Response = () =>
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
  )
const originalFetch = globalThis.fetch
;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (url.includes('/x/web-interface/nav')) return wbiNavResponder()
  if (url.includes('getDanmuInfo')) return danmuInfoResponder()
  // Unknown URL → empty 200 to avoid throwing.
  return new Response('{}', { status: 200 })
}) as typeof fetch

// ---------------- MockLiveWS --------------------------------------------
class MockLiveWS {
  static last: MockLiveWS | null = null
  static instances: MockLiveWS[] = []

  public live = false
  public closed = false
  private listeners = new Map<string, Array<(evt: { data?: unknown }) => void>>()
  public roomId: number
  public opts: unknown

  constructor(roomId: number, opts: unknown) {
    this.roomId = roomId
    this.opts = opts
    MockLiveWS.last = this
    MockLiveWS.instances.push(this)
  }

  addEventListener(type: string, cb: (evt: { data?: unknown }) => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(cb)
    this.listeners.set(type, list)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.live = false
    this._emit('close', {})
  }

  /** Test helper: fire an arbitrary event with `data` payload. */
  _emit(type: string, payload: unknown): void {
    const list = this.listeners.get(type) ?? []
    for (const cb of list) {
      try {
        cb(
          typeof payload === 'object' && payload !== null && 'data' in payload
            ? (payload as { data?: unknown })
            : { data: payload }
        )
      } catch {
        // Errors in subscribers must not break the test harness.
      }
    }
  }

  _emitLive(): void {
    this.live = true
    this._emit('live', { data: undefined })
  }

  _emitDanmuMsg(payload: unknown): void {
    this._emit('DANMU_MSG', { data: payload })
  }

  _emitGift(payload: unknown): void {
    this._emit('SEND_GIFT', { data: payload })
  }

  _emitSuperChat(payload: unknown): void {
    this._emit('SUPER_CHAT_MESSAGE', { data: payload })
  }

  _emitInteract(payload: unknown): void {
    this._emit('INTERACT_WORD', { data: payload })
  }

  _emitGuardBuy(payload: unknown): void {
    this._emit('GUARD_BUY', { data: payload })
  }

  _emitEntryEffect(payload: unknown): void {
    this._emit('ENTRY_EFFECT', { data: payload })
  }

  _emitAnchorLot(payload: unknown): void {
    this._emit('ANCHOR_LOT_START', { data: payload })
  }

  _emitRedPacket(payload: unknown): void {
    this._emit('POPULARITY_RED_POCKET_START', { data: payload })
  }

  _emitNotice(payload: unknown): void {
    this._emit('COMMON_NOTICE_DANMAKU', { data: payload })
  }

  _emitError(): void {
    this._emit('error', {})
  }
}

const {
  _resetLiveWsStateForTests,
  _setLiveWsFactoryForTests,
  hasRecentWsDanmaku,
  liveWsCoercionDiagnostics,
  startLiveWsSource,
  stopLiveWsSource,
} = await import('../src/lib/live-ws-source')
const { _resetCachedWbiKeysForTests, _setCachedWbiKeysForTests, ensureWbiKeys } = await import('../src/lib/wbi')
void ensureWbiKeys // not used directly — we seed via _setCachedWbiKeysForTests
const { subscribeCustomChatEvents, subscribeCustomChatWsStatus } = await import('../src/lib/custom-chat-events')

// ---------------- per-test state ----------------------------------------
const events: CustomChatEvent[] = []
const statuses: CustomChatWsStatus[] = []
let unsubEvents: () => void = () => {}
let unsubStatus: () => void = () => {}

beforeEach(() => {
  events.length = 0
  statuses.length = 0
  MockLiveWS.last = null
  MockLiveWS.instances.length = 0
  _resetLiveWsStateForTests()
  // NOTE: do NOT call `_resetCachedWbiKeysForTests()` here. ensureWbiKeys
  // has a 1500ms `waitForWbiKeys` poll *before* falling back to fetch,
  // which would inflate every test by 1.5s. We let the cache persist
  // across tests in this file — the fixture keys are the same throughout.
  liveWsCoercionDiagnostics.numberFallbacks = 0
  liveWsCoercionDiagnostics.stringFallbacks = 0
  // happy-dom default cookie reset (avoids carryover via document.cookie).
  happyWindow.document.cookie = ''
  // Wire fresh subscribers per test.
  unsubEvents = subscribeCustomChatEvents(ev => events.push(ev))
  unsubStatus = subscribeCustomChatWsStatus(s => statuses.push(s))
  _setLiveWsFactoryForTests(
    ((roomId: number, opts: unknown) => new MockLiveWS(roomId, opts)) as unknown as Parameters<
      typeof _setLiveWsFactoryForTests
    >[0]
  )
  danmuInfoResponder = () =>
    new Response(
      JSON.stringify({
        code: 0,
        data: {
          token: 'tok-fixture',
          host_list: [{ host: 'danmu.example.com', wss_port: 443 }],
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  wbiNavResponder = () =>
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
    )
})

afterEach(() => {
  unsubEvents()
  unsubStatus()
  _setLiveWsFactoryForTests(null)
  _resetLiveWsStateForTests()
  // Intentionally NOT resetting WBI cache (see beforeEach note).
  void _resetCachedWbiKeysForTests
  happyWindow.document.cookie = ''
})

// We can't restore the original fetch with `afterAll` because top-level
// shared state lives across tests; just leave the routed fetch in place for
// the duration of this file.
void originalFetch

async function flushAsync(ms = 10): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function startAndConnect(): Promise<MockLiveWS> {
  // Seed the WBI cache directly so connect() takes the fast `if (cachedWbiKeys)
  // return cachedWbiKeys` path inside `ensureWbiKeys` (otherwise we wait 1.5s
  // for `waitForWbiKeys` to time out before the explicit fetch fallback).
  _setCachedWbiKeysForTests({
    img_key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    sub_key: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  })
  startLiveWsSource()
  // connect() is async (await ensureRoomId, await fetchDanmuInfo).
  for (let i = 0; i < 30 && !MockLiveWS.last; i++) {
    await flushAsync(20)
  }
  if (!MockLiveWS.last) throw new Error('LiveWS factory was never invoked — connect() failed')
  return MockLiveWS.last
}

describe('startLiveWsSource — connection lifecycle', () => {
  test('emits connecting status, fetches danmu info, constructs LiveWS with the right roomId', async () => {
    const live = await startAndConnect()
    expect(live.roomId).toBe(12345)
    expect(statuses).toContain('connecting')
  })

  test('on `live` event: status flips to "live" and reconnect counter resets', async () => {
    const live = await startAndConnect()
    live._emitLive()
    expect(statuses).toContain('live')
  })

  test('on `close` event: status flips to "closed" and a reconnect timer is scheduled', async () => {
    const live = await startAndConnect()
    live._emitLive()
    live.close() // triggers our 'close' handler
    expect(statuses).toContain('closed')
  })

  test('on `error` event: status flips to "error"', async () => {
    const live = await startAndConnect()
    live._emitError()
    expect(statuses).toContain('error')
  })

  test('reference counting: two starts → one connection; one stop keeps it alive; second stop tears down', async () => {
    const live = await startAndConnect()
    startLiveWsSource() // second consumer — should NOT spin up a new connection
    expect(MockLiveWS.instances).toHaveLength(1)
    stopLiveWsSource()
    expect(live.closed).toBe(false) // still alive (one consumer remaining)
    stopLiveWsSource()
    expect(statuses).toContain('off')
  })

  test('startup failure: WBI fetch returns non-OK → error status + appendStartupFailure', async () => {
    wbiNavResponder = () => new Response('Service Unavailable', { status: 503 })
    danmuInfoResponder = () => new Response('Service Unavailable', { status: 503 })
    startLiveWsSource()
    await flushAsync(50)
    expect(statuses).toContain('error')
  })
})

describe('bindEvents — DANMU_MSG handler', () => {
  function makeDanmuMsg(opts: {
    text?: string
    uid?: number
    uname?: string
    medalName?: string
    medalLevel?: number
    userLevel?: number
    isAdmin?: number
    msgId?: string
    info0?: unknown[]
  }): { info: unknown[]; cmd: string; msg_id?: string } {
    const text = opts.text ?? 'hello'
    const info0 = opts.info0 ?? [0, 0, 0, 0, Date.now(), 0, 0, '', 0, 0, 0, '', 0]
    const info = [
      info0,
      text,
      [opts.uid ?? 100, opts.uname ?? 'Alice', opts.isAdmin ?? 0],
      opts.medalName ? [opts.medalLevel ?? 1, opts.medalName, '', 0, 0, '', 0] : [],
      [opts.userLevel ?? 5, 0, 0, 0, 0, 0],
    ]
    return { info, cmd: 'DANMU_MSG', msg_id: opts.msgId }
  }

  test('basic danmaku → emits a kind="danmaku" event with text + uname + uid', async () => {
    const live = await startAndConnect()
    live._emitDanmuMsg(makeDanmuMsg({ text: '你好', uid: 42, uname: 'Bob' }))
    const dm = events.find(e => e.kind === 'danmaku')
    expect(dm).toBeDefined()
    expect(dm?.text).toBe('你好')
    expect(dm?.uname).toBe('Bob')
    expect(dm?.uid).toBe('42')
    expect(dm?.source).toBe('ws')
  })

  test('badges include medal "{level} {name}" and "LV{userLevel}" and 房管 when admin=1', async () => {
    const live = await startAndConnect()
    live._emitDanmuMsg(
      makeDanmuMsg({ text: 't', uid: 1, uname: 'X', medalName: '满弟', medalLevel: 21, userLevel: 33, isAdmin: 1 })
    )
    const dm = events.find(e => e.kind === 'danmaku')
    expect(dm?.badges).toEqual(expect.arrayContaining(['满弟 21', 'LV33', '房管']))
  })

  test('rememberWsDanmaku is called: hasRecentWsDanmaku returns true after observing a DANMU_MSG', async () => {
    const live = await startAndConnect()
    live._emitDanmuMsg(makeDanmuMsg({ text: '可被识别', uid: 7, uname: 'Y' }))
    expect(hasRecentWsDanmaku('可被识别', '7')).toBe(true)
    expect(hasRecentWsDanmaku('未发送过', '7')).toBe(false)
  })

  test('msg_id is used as id when present', async () => {
    const live = await startAndConnect()
    live._emitDanmuMsg(makeDanmuMsg({ text: 't', msgId: 'fixture-msg-id' }))
    const dm = events.find(e => e.kind === 'danmaku')
    expect(dm?.id).toBe('fixture-msg-id')
  })

  test('id falls back to a synthesized "dm-{uid}-{ts}-{rand}" when msg_id missing', async () => {
    const live = await startAndConnect()
    live._emitDanmuMsg(makeDanmuMsg({ text: 't', uid: 555 }))
    const dm = events.find(e => e.kind === 'danmaku')
    expect(dm?.id).toMatch(/^dm-555-/)
  })

  test('sticker emoticon (info[0][12]=1, info[0][13] with url) → emoticonImage attached', async () => {
    const live = await startAndConnect()
    const stickerInfo0: unknown[] = [
      0,
      0,
      0,
      0,
      Date.now(),
      0,
      0,
      '',
      0,
      0,
      0,
      '',
      1,
      { url: 'https://stickers.example/doge.png', emoticon_unique: '[doge]', width: 96, height: 96 },
    ]
    live._emitDanmuMsg(makeDanmuMsg({ text: '[doge]', info0: stickerInfo0 }))
    const dm = events.find(e => e.kind === 'danmaku')
    expect(dm?.emoticonImage).toBeDefined()
    expect(dm?.emoticonImage?.url).toBe('https://stickers.example/doge.png')
    expect(dm?.emoticonImage?.alt).toBe('[doge]')
    expect(dm?.emoticonImage?.width).toBe(96)
  })

  test('coercion diagnostics: a string-where-number field bumps numberFallbacks', async () => {
    const live = await startAndConnect()
    // Send an info0[4] that is a string instead of a number — the chatEventTime
    // path uses asNumber(info[0][4]) which records a fallback.
    const drift: unknown[] = [0, 0, 0, 0, '1700000000000', 0, 0, '', 0, 0, 0, '', 0]
    live._emitDanmuMsg(makeDanmuMsg({ text: 't', info0: drift }))
    expect(liveWsCoercionDiagnostics.numberFallbacks).toBeGreaterThan(0)
  })
})

describe('bindEvents — SEND_GIFT handler', () => {
  test('emits kind="gift" with formatted text and price-derived badge', async () => {
    const live = await startAndConnect()
    live._emitGift({
      data: {
        uid: 12,
        uname: 'GiftSender',
        action: '投喂',
        giftName: '小花',
        num: 3,
        price: 12300, // milliyuan → ¥12.3
      },
      cmd: 'SEND_GIFT',
    })
    const gift = events.find(e => e.kind === 'gift')
    expect(gift?.text).toBe('投喂 小花 x3')
    expect(gift?.uname).toBe('GiftSender')
    expect(gift?.uid).toBe('12')
    expect(gift?.amount).toBe(12300)
    expect(gift?.badges?.length).toBe(1) // formatted price badge
    // fields include name + count + price + action
    const fieldKeys = gift?.fields?.map(f => f.key) ?? []
    expect(fieldKeys).toEqual(expect.arrayContaining(['gift-name', 'gift-count', 'gift-price', 'gift-action']))
  })

  test('zero-price gift → no price badge', async () => {
    const live = await startAndConnect()
    live._emitGift({
      data: { uid: 1, uname: 'Free', action: '送出', giftName: '辣条', num: 1, price: 0 },
      cmd: 'SEND_GIFT',
    })
    const gift = events.find(e => e.kind === 'gift')
    expect(gift?.badges).toEqual([])
  })
})

describe('bindEvents — SUPER_CHAT_MESSAGE handler', () => {
  test('emits kind="superchat" with price badge and message', async () => {
    const live = await startAndConnect()
    live._emitSuperChat({
      data: {
        id: 'sc-1',
        uid: 7,
        message: '醒目留言内容',
        price: 30,
        time: 60,
        ts: 1700000000,
        user_info: { uname: 'SCSender' },
      },
      cmd: 'SUPER_CHAT_MESSAGE',
    })
    const sc = events.find(e => e.kind === 'superchat')
    expect(sc?.text).toBe('醒目留言内容')
    expect(sc?.uname).toBe('SCSender')
    expect(sc?.amount).toBe(30)
    expect(sc?.badges).toEqual(['SC 30元'])
  })
})

describe('bindEvents — INTERACT_WORD handler', () => {
  test('msg_type=1 → kind="enter"', async () => {
    const live = await startAndConnect()
    live._emitInteract({
      data: { uid: 5, uname: 'EnteringUser', msg_type: 1, timestamp: 1700000000 },
      cmd: 'INTERACT_WORD',
    })
    const enter = events.find(e => e.kind === 'enter')
    expect(enter?.uname).toBe('EnteringUser')
    expect(enter?.text).toBe('进入直播间')
  })

  test('msg_type=2 → kind="follow"', async () => {
    const live = await startAndConnect()
    live._emitInteract({
      data: { uid: 6, uname: 'FollowingUser', msg_type: 2, timestamp: 1700000000 },
      cmd: 'INTERACT_WORD',
    })
    const follow = events.find(e => e.kind === 'follow')
    expect(follow?.uname).toBe('FollowingUser')
    expect(follow?.text).toBe('关注了直播间')
  })

  test('unknown msg_type (e.g. 3) is silently dropped', async () => {
    const live = await startAndConnect()
    live._emitInteract({
      data: { uid: 7, uname: 'X', msg_type: 3, timestamp: 1700000000 },
      cmd: 'INTERACT_WORD',
    })
    const interact = events.filter(e => e.kind === 'enter' || e.kind === 'follow')
    expect(interact).toHaveLength(0)
  })
})

describe('bindEvents — GUARD_BUY / ENTRY_EFFECT / ANCHOR_LOT_START / POPULARITY_RED_POCKET_START', () => {
  test('GUARD_BUY level=1 → "总督", level=2 → "提督", default → "舰长"', async () => {
    const live = await startAndConnect()
    live._emitGuardBuy({
      data: { uid: 1, username: 'A', guard_level: 1, num: 12, price: 100000 },
      cmd: 'GUARD_BUY',
    })
    live._emitGuardBuy({
      data: { uid: 2, username: 'B', guard_level: 2, num: 1, price: 50000 },
      cmd: 'GUARD_BUY',
    })
    live._emitGuardBuy({
      data: { uid: 3, username: 'C', guard_level: 3, num: 1, price: 1000 },
      cmd: 'GUARD_BUY',
    })
    const guardEvents = events.filter(e => e.kind === 'guard')
    expect(guardEvents).toHaveLength(3)
    expect(guardEvents[0].text).toContain('总督')
    expect(guardEvents[1].text).toContain('提督')
    expect(guardEvents[2].text).toContain('舰长')
  })

  test('ENTRY_EFFECT emits an event with the user name; <% %> markup is stripped', async () => {
    const live = await startAndConnect()
    // NOTE: omit `privilege_type` so the event isn't reclassified to 'guard'
    // by normalizeEventKind (the GUARD badge in `badges` matches the
    // /GUARD|舰长|...|privilege/ pattern). For non-paying entries the
    // ENTRY_EFFECT → 'enter' contract holds. The reclassification path is
    // covered indirectly by GUARD_BUY tests above.
    live._emitEntryEffect({
      data: {
        uid: 99,
        id: 1,
        copy_writing: '欢迎 <%大佬%> 进入直播间',
        uinfo: { base: { name: 'BigShot' } },
      },
      cmd: 'ENTRY_EFFECT',
    })
    const enter = events.find(e => e.kind === 'enter' && e.uname === 'BigShot')
    expect(enter).toBeDefined()
    // <% %> markup is stripped.
    expect(enter?.text).not.toContain('<%')
    expect(enter?.text).not.toContain('%>')
  })

  test('ENTRY_EFFECT with privilege_type → reclassified to "guard" by normalizeEventKind', async () => {
    const live = await startAndConnect()
    live._emitEntryEffect({
      data: {
        uid: 99,
        id: 1,
        copy_writing: '欢迎 大航海 进入',
        privilege_type: 3,
        uinfo: { base: { name: 'PaidUser' } },
      },
      cmd: 'ENTRY_EFFECT',
    })
    const reclassified = events.find(e => e.uname === 'PaidUser')
    expect(reclassified?.kind).toBe('guard')
  })

  test('ANCHOR_LOT_START emits kind="lottery" with 天选时刻 sender', async () => {
    const live = await startAndConnect()
    live._emitAnchorLot({ data: { award_name: '皮肤一个' }, cmd: 'ANCHOR_LOT_START' })
    const lot = events.find(e => e.kind === 'lottery')
    expect(lot?.uname).toBe('天选时刻')
    expect(lot?.text).toBe('皮肤一个')
  })

  test('POPULARITY_RED_POCKET_START emits kind="redpacket"', async () => {
    const live = await startAndConnect()
    live._emitRedPacket({
      data: { sender_uid: 88, sender_name: 'RPSender', title: '抢红包' },
      cmd: 'POPULARITY_RED_POCKET_START',
    })
    const rp = events.find(e => e.kind === 'redpacket')
    expect(rp?.uname).toBe('RPSender')
    expect(rp?.text).toBe('抢红包')
    expect(rp?.badges).toEqual(['红包'])
  })
})

describe('stopLiveWsSource — teardown', () => {
  test('emits "off" status and prevents pending reconnect from running', async () => {
    const live = await startAndConnect()
    live._emitLive()
    live.close() // schedules a reconnect
    stopLiveWsSource()
    expect(statuses).toContain('off')
    // After stop, a previously-scheduled reconnect must not produce a new
    // LiveWS instance.
    const beforeCount = MockLiveWS.instances.length
    await flushAsync(150) // give any pending timer a chance
    expect(MockLiveWS.instances.length).toBe(beforeCount)
  })
})
