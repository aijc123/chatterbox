// SDET audit §3 P0-1 — integration test for the auto-follow ("自动跟车") main
// data flow:
//
//   WS DANMU_MSG → live-ws-source → custom-chat-events
//     → auto-blend (accumulator/threshold/cooldown)
//     → send-queue.enqueueDanmaku(SendPriority.AUTO)
//     → api.sendDanmaku (mocked at HTTP layer — only mock in this file)
//     → send-verification.verifyBroadcast → waitForSentEcho
//        success: ws/dom echo → 已WS回显
//        shadow-ban: requestAiSuggestion + recordShadowBanObservation
//                    + (auto-resend mode) tryAiEvasion → enqueueDanmaku again
//                    + learnShadowRules → localRoomRules
//     → log.appendLog / notifyUser
//
// Real modules under test (NOT mocked): live-ws-source, custom-chat-events,
// auto-blend, auto-blend-events, auto-blend-trend, send-queue,
// send-verification, ai-evasion, shadow-learn, log. Only `api.ts` is
// partial-mocked (spread real exports, override sendDanmaku/ensureRoomId/
// getCsrfToken/getDedeUid + setRandomDanmakuColor/checkSelfRoomRestrictions),
// and `globalThis.fetch` is routed for wbi-nav, getDanmuInfo, and Laplace
// chat-audit.

import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  Node: happyWindow.Node,
  window: happyWindow,
})

if (!('XMLHttpRequest' in globalThis)) {
  class TestXMLHttpRequest {
    responseText = ''
    addEventListener(): void {}
    open(): void {}
    send(): void {}
  }
  ;(globalThis as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest
}
if (!('WebSocket' in globalThis)) {
  class TestWebSocket extends EventTarget {
    constructor(_url: string) {
      super()
    }
    close(): void {}
  }
  ;(globalThis as { WebSocket: typeof TestWebSocket }).WebSocket = TestWebSocket
}
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

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { SendDanmakuResult } from '../src/lib/api'

// ---- Date.now stub (controls auto-blend cooldown / waitForSentEcho window) --
const originalDateNow = Date.now
let mockNow = 1_700_000_000_000
function setNow(v: number): void {
  mockNow = v
}
function advanceNow(ms: number): void {
  mockNow += ms
}
Date.now = () => mockNow

// ---- '$' GM stub ---------------------------------------------------------
mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

// ---- api.ts partial mock — ONLY internal-module mock in this file --------
let sendDanmakuResponder: (message: string) => Promise<SendDanmakuResult> = async message => ({
  success: true,
  message,
  isEmoticon: false,
  startedAt: Date.now(),
})
const sendDanmakuLog: string[] = []

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({
  ...realApi,
  ensureRoomId: async () => 12345,
  getCsrfToken: () => 'test-csrf-fixture',
  getDedeUid: () => '99999',
  setRandomDanmakuColor: async () => {},
  // checkSelfRoomRestrictions not exercised — auto-blend only calls it after
  // 3 consecutive silent drops, which our short tests never reach.
  sendDanmaku: (message: string) => {
    sendDanmakuLog.push(message)
    return sendDanmakuResponder(message)
  },
}))

// ---- fetch routing for ensureWbiKeys + getDanmuInfo + Laplace chat-audit ---
let danmuInfoResponder: () => Response = () =>
  new Response(
    JSON.stringify({
      code: 0,
      data: { token: 'tok-fixture', host_list: [{ host: 'danmu.example.com', wss_port: 443 }] },
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
// Laplace chat-audit responder. Tests mutate `laplace.*` to control which
// sensitive words come back (or to throw on fetch).
const laplace: { hasSensitiveContent: boolean; sensitiveWords?: string[]; throwOnFetch: boolean } = {
  hasSensitiveContent: false,
  sensitiveWords: undefined,
  throwOnFetch: false,
}
;(globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (url.includes('/x/web-interface/nav')) return wbiNavResponder()
  if (url.includes('getDanmuInfo')) return danmuInfoResponder()
  if (url.includes('chat-audit')) {
    if (laplace.throwOnFetch) throw new Error('laplace down')
    return new Response(
      JSON.stringify({
        completion: {
          hasSensitiveContent: laplace.hasSensitiveContent,
          sensitiveWords: laplace.sensitiveWords,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }
  return new Response('{}', { status: 200 })
}) as typeof fetch

// ---- MockLiveWS (lifted from live-ws-source.test.ts) ---------------------
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
}

// ---- module imports (after all mock.module + DI setup) -------------------
const { _resetLiveWsStateForTests, _setLiveWsFactoryForTests, startLiveWsSource, stopLiveWsSource } = await import(
  '../src/lib/live-ws-source'
)
const { _setCachedWbiKeysForTests } = await import('../src/lib/wbi')
const { _resetAutoBlendStateForTests, startAutoBlend, stopAutoBlend } = await import('../src/lib/auto-blend')
const {
  autoBlendBurstSettleMs,
  autoBlendCooldownSec,
  autoBlendDryRun,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendLastActionText,
  autoBlendMinDistinctUsers,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
} = await import('../src/lib/store')
const { logLines } = await import('../src/lib/log')
const { enqueueDanmaku, SendPriority, _resetSendQueueForTests } = await import('../src/lib/send-queue')
const { _setEchoTimeoutForTests } = await import('../src/lib/send-verification')
const { _resetAiEvasionCircuitForTests } = await import('../src/lib/ai-evasion')
const { emitCustomChatWsStatus } = await import('../src/lib/custom-chat-events')
const { aiEvasion } = await import('../src/lib/store-send')
const { autoLearnShadowRules, shadowBanMode, shadowBanObservations } = await import('../src/lib/store-shadow-learn')
const { localRoomRules, replacementMap } = await import('../src/lib/store-replacement')

function makeDanmuMsg(text: string, uid: number, uname = 'U' + uid): { info: unknown[]; cmd: string } {
  const info0 = [0, 0, 0, 0, Date.now(), 0, 0, '', 0, 0, 0, '', 0]
  return {
    info: [info0, text, [uid, uname, 0], [], [5, 0, 0, 0, 0, 0]],
    cmd: 'DANMU_MSG',
  }
}

async function flushAsync(ms = 5): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function startAndConnect(): Promise<MockLiveWS> {
  _setCachedWbiKeysForTests({
    img_key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    sub_key: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  })
  startLiveWsSource()
  for (let i = 0; i < 30 && !MockLiveWS.last; i++) await flushAsync(20)
  if (!MockLiveWS.last) throw new Error('LiveWS factory was never invoked')
  return MockLiveWS.last
}

// ---- per-test state ------------------------------------------------------
let liveWs: MockLiveWS | null = null
const initialLogLen = { value: 0 }

beforeAll(() => {
  setNow(1_700_000_000_000)
})

afterAll(() => {
  Date.now = originalDateNow
})

beforeEach(async () => {
  MockLiveWS.last = null
  MockLiveWS.instances.length = 0
  _resetLiveWsStateForTests()
  _resetAiEvasionCircuitForTests()
  _resetSendQueueForTests()
  sendDanmakuLog.length = 0
  // Bump mockNow forward so send-queue's `lastSendCompletedAt` (module state
  // from a previous test) is far in the past — otherwise processQueue's
  // HARD_MIN_GAP_MS check forces a real ~1s setTimeout wait.
  advanceNow(60_000)
  // default: instant-success responder (each test may override)
  sendDanmakuResponder = async message => ({
    success: true,
    message,
    isEmoticon: false,
    startedAt: Date.now(),
  })

  // Reset Laplace responder + signal state used by the shadow-ban scenarios.
  laplace.hasSensitiveContent = false
  laplace.sensitiveWords = undefined
  laplace.throwOnFetch = false
  aiEvasion.value = false
  autoLearnShadowRules.value = true
  shadowBanMode.value = 'suggest'
  shadowBanObservations.value = []
  localRoomRules.value = {}
  replacementMap.value = null

  // Shrink verifyBroadcast's echo wait to 30ms so shadow-ban scenarios
  // resolve inside the test budget instead of the production 4s.
  _setEchoTimeoutForTests(30)

  _setLiveWsFactoryForTests(
    ((roomId: number, opts: unknown) => new MockLiveWS(roomId, opts)) as unknown as Parameters<
      typeof _setLiveWsFactoryForTests
    >[0]
  )

  // Conservative auto-blend config. NOTE: autoBlendBurstSettleMs has min=100
  // (gm-signal numeric clamp) so 100 is the floor — our flushAsync waits
  // upstream of that.
  autoBlendBurstSettleMs.value = 100
  autoBlendThreshold.value = 2
  autoBlendWindowSec.value = 10
  autoBlendCooldownSec.value = 1
  autoBlendIncludeReply.value = false
  autoBlendDryRun.value = false
  autoBlendUseReplacements.value = false
  autoBlendRequireDistinctUsers.value = true
  autoBlendMinDistinctUsers.value = 2
  // Avoid the 60s routine timer firing and reshuffling state mid-test.
  autoBlendRoutineIntervalSec.value = 3600

  liveWs = await startAndConnect()
  initialLogLen.value = logLines.value.length
  // The user-facing ON/OFF toggle. recordDanmaku/triggerSend short-circuit
  // when this is false; the production UI flips it from the panel checkbox.
  autoBlendEnabled.value = true
  startAutoBlend()
  // Prime verifyBroadcast's currentWsStatus to 'live' so the shadow-ban
  // chain runs (otherwise it logs ⚪ and returns early).
  emitCustomChatWsStatus('live')
  // Yield so subscribeCustomChatEvents handler is fully registered.
  await flushAsync(5)
})

afterEach(async () => {
  stopAutoBlend()
  stopLiveWsSource()
  autoBlendEnabled.value = false
  // triggerSend may still be inside `verifyBroadcast` → `waitForSentEcho`
  // (echo wait). That closure keeps `isSending = true` and other module
  // state alive past stopAutoBlend, which leaks into the next test. Reset
  // explicitly.
  _resetAutoBlendStateForTests()
  // Allow any in-flight microtasks (waitForSentEcho subscriptions etc.) to
  // settle before next test resets the WS factory.
  await flushAsync(10)
  _setLiveWsFactoryForTests(null)
  _resetLiveWsStateForTests()
  _setEchoTimeoutForTests(null)
  liveWs = null
})

function logsSince(): string[] {
  return logLines.value.slice(initialLogLen.value)
}

// ============================================================================
// Scenarios
// ============================================================================

describe('integration: WS DANMU_MSG → auto-blend → enqueueDanmaku → echo verify', () => {
  test('happy path — single danmaku does NOT trigger auto-follow (threshold not met)', async () => {
    if (!liveWs) throw new Error('liveWs not initialized')

    liveWs._emitDanmuMsg(makeDanmuMsg('hello-world', 1001, 'A'))

    // Wait past burst-settle and the 1Hz cleanup tick.
    await flushAsync(autoBlendBurstSettleMs.value + 50)

    expect(sendDanmakuLog).toHaveLength(0)
    // No auto-blend send/error log lines.
    expect(logsSince().some(l => l.includes('已跟车') || l.includes('自动跟车没发出去'))).toBe(false)
  })

  test('threshold trigger — 2 identical danmaku from 2 uids fires ONE auto send', async () => {
    if (!liveWs) throw new Error('liveWs not initialized')

    liveWs._emitDanmuMsg(makeDanmuMsg('上车', 1001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('上车', 1002, 'B'))

    await flushAsync(autoBlendBurstSettleMs.value + 80)

    expect(sendDanmakuLog).toEqual(['上车'])
    // Single-target success path emits the "已跟车" line.
    expect(logsSince().some(l => l.includes('已跟车') && l.includes('上车'))).toBe(true)
  })

  test('cooldown gate — second triggering burst within cooldown is suppressed; advancing past cooldown re-arms', async () => {
    if (!liveWs) throw new Error('liveWs not initialized')

    // First burst → fires.
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2002, 'B'))
    await flushAsync(autoBlendBurstSettleMs.value + 80)
    expect(sendDanmakuLog).toEqual(['666'])

    // Release waitForSentEcho on the first send so triggerSend's finally
    // runs and `isSending` flips back to false. Without this, recordDanmaku
    // would bail on `isSending` for the rest of the test (4s default echo
    // timeout never elapses inside our short test budget).
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 99999, 'self'))
    await flushAsync(20)

    // mockNow is still pre-cooldown. Re-emit burst — recordDanmaku adds to
    // trendMap but the `now < cooldownUntil` gate skips scheduleBurstSend.
    advanceNow(200)
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2003, 'C'))
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2004, 'D'))
    await flushAsync(autoBlendBurstSettleMs.value + 80)
    expect(sendDanmakuLog).toEqual(['666']) // still just the first one

    // Advance past cooldownSec=1 (1000ms) + a margin. Re-emit burst.
    advanceNow(1500)
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2005, 'E'))
    liveWs._emitDanmuMsg(makeDanmuMsg('666', 2006, 'F'))
    await flushAsync(autoBlendBurstSettleMs.value + 100)

    expect(sendDanmakuLog).toEqual(['666', '666'])
  })

  test('verify wiring — auto-blend awaits broadcast echo via verifyBroadcast; matching WS echo flips status to "已WS回显"', async () => {
    // Auto-blend now routes the echo wait through verifyBroadcast (the same
    // wrapper that the manual / +1 / loop / native paths use). This sub-case
    // pins the SUCCESS branch of the chain: a self-uid WS echo arriving
    // inside the wait window resolves verifyBroadcast → waitForSentEcho with
    // 'ws' and auto-blend's `已WS回显` status text fires.
    if (!liveWs) throw new Error('liveWs not initialized')

    liveWs._emitDanmuMsg(makeDanmuMsg('echo-text', 3001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('echo-text', 3002, 'B'))
    await flushAsync(autoBlendBurstSettleMs.value + 10)

    expect(sendDanmakuLog).toEqual(['echo-text'])
    // After the API success but before echo: lastActionText becomes the
    // "等待回显" interim state.
    expect(autoBlendLastActionText.value).toContain('等待回显')

    // Emit the WS echo BEFORE the 30ms verifyBroadcast timeout fires — same
    // text, uid === myUid (99999). matchesCustomChatEchoEvent allows
    // uid==target uid (this IS the self broadcast we trust over WS).
    liveWs._emitDanmuMsg(makeDanmuMsg('echo-text', 99999, 'self'))
    await flushAsync(20)

    expect(autoBlendLastActionText.value).toContain('已WS回显')
    // The shadow-ban chain MUST NOT have engaged on the success path.
    expect(shadowBanObservations.value).toHaveLength(0)
  })

  test('shadow-ban chain — auto-blend send with no echo + aiEvasion=on routes through verifyBroadcast → requestAiSuggestion → recordShadowBanObservation', async () => {
    // P0 contract: when an auto-follow send is shadow-banned, the auto path
    // must engage the same chain the manual / +1 / loop paths use:
    //   verifyBroadcast → requestAiSuggestion (Laplace) → recordShadowBanObservation
    //                  + heuristic / AI candidates surfaced for the user
    // Mirrors P0-2 scenario 4, but exercises the auto-blend trigger instead
    // of repeatDanmaku. shadowBanMode stays at the default 'suggest', so no
    // second send fires here — that's covered by the next test.
    if (!liveWs) throw new Error('liveWs not initialized')
    aiEvasion.value = true
    laplace.hasSensitiveContent = true
    laplace.sensitiveWords = ['shadow-text']

    liveWs._emitDanmuMsg(makeDanmuMsg('shadow-text', 6001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('shadow-text', 6002, 'B'))
    // Wait for: burst-settle (100ms) + send + 30ms echo timeout + Laplace
    // fetch + observation write. No self-uid echo emitted → shadow-ban path.
    await flushAsync(autoBlendBurstSettleMs.value + 200)

    // Exactly one outbound send — suggest mode does NOT auto-resend.
    expect(sendDanmakuLog).toEqual(['shadow-text'])

    // recordShadowBanObservation wrote the entry (mirrors P0-2 scenario 4(b)).
    expect(shadowBanObservations.value.some(o => o.text === 'shadow-text')).toBe(true)

    // verifyBroadcast wrote the ⚠️ shadow-ban warning under the "自动" label.
    const warnLine = logsSince().find(l => l.includes('⚠️') && l.includes('自动') && l.includes('shadow-text'))
    expect(warnLine).toBeDefined()

    // No learned rule yet — auto-resend is off.
    expect(localRoomRules.value['12345']).toBeUndefined()
  })

  test('shadow-ban + auto-resend — second enqueueDanmaku fires with AI-rewritten text and learnShadowRules writes the sensitive word into localRoomRules', async () => {
    // Full chain: shadowBanMode='auto-resend' + aiEvasion=true + Laplace hit
    // → tryAiEvasion enqueues the AI variant as a SECOND send, and
    // learnShadowRules writes (sensitiveWord → processText(sensitiveWord))
    // back into localRoomRules. Pre-fix this was IMPOSSIBLE on the auto path
    // because auto-blend bypassed verifyBroadcast entirely.
    if (!liveWs) throw new Error('liveWs not initialized')
    aiEvasion.value = true
    shadowBanMode.value = 'auto-resend'
    laplace.hasSensitiveContent = true
    laplace.sensitiveWords = ['banned']

    liveWs._emitDanmuMsg(makeDanmuMsg('banned', 7001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('banned', 7002, 'B'))
    // Wait for: burst-settle + first send + 30ms echo timeout + Laplace
    // fetch + 1010ms HARD_MIN_GAP_MS between the original send and the
    // tryAiEvasion resend + post-evasion verifyBroadcast.
    await flushAsync(autoBlendBurstSettleMs.value + 1500)

    // Two captured sends: original 'banned' followed by the AI-rewritten
    // variant. processText splices U+00AD (soft-hyphen) between graphemes.
    expect(sendDanmakuLog.length).toBeGreaterThanOrEqual(2)
    expect(sendDanmakuLog[0]).toBe('banned')
    const evaded = sendDanmakuLog[1]
    expect(evaded).not.toBe('banned')
    expect(evaded.includes('­')).toBe(true)

    // Observation recorded.
    expect(shadowBanObservations.value.some(o => o.text === 'banned')).toBe(true)

    // learnShadowRules wrote the rule into localRoomRules for room 12345.
    const rules = localRoomRules.value['12345']
    expect(rules?.length).toBe(1)
    expect(rules?.[0].from).toBe('banned')
    expect(rules?.[0].to).not.toBe('banned')
    expect(rules?.[0].to?.includes('­')).toBe(true)
  })

  test('failure path — sendDanmaku returns success:false, error:"k" → ❌ log line with formatted reason', async () => {
    if (!liveWs) throw new Error('liveWs not initialized')

    sendDanmakuResponder = async message => ({
      success: false,
      message,
      isEmoticon: false,
      startedAt: Date.now(),
      error: 'k',
    })

    liveWs._emitDanmuMsg(makeDanmuMsg('blocked-text', 4001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('blocked-text', 4002, 'B'))
    await flushAsync(autoBlendBurstSettleMs.value + 80)

    expect(sendDanmakuLog).toEqual(['blocked-text'])
    // notifyUser('error', ...) writes a `❌ ...` line via appendLog.
    const failLine = logsSince().find(l => l.includes('❌') && l.includes('自动跟车没发出去'))
    expect(failLine).toBeDefined()
    expect(failLine).toContain('blocked-text')
    expect(failLine).toContain('k - 包含房间屏蔽词')
  })

  test('cancel path — preempting MANUAL while auto-blend send is queued resolves auto cancelled and skips echo wait', async () => {
    if (!liveWs) throw new Error('liveWs not initialized')

    // Make a primer MANUAL hang inside sendDanmaku. While it's blocked, the
    // auto-blend's AUTO sits in `queue` (not yet inflight), where a
    // higher-priority MANUAL can cancel it via cancelPendingAuto-style logic.
    let releaseBlocking: (() => void) | null = null
    sendDanmakuResponder = async message => {
      if (message === 'primer-manual') {
        await new Promise<void>(resolve => {
          releaseBlocking = resolve
        })
      }
      return { success: true, message, isEmoticon: false, startedAt: Date.now() }
    }

    // Primer: occupy sendDanmaku so the auto-blend item ends up queued behind it.
    // Don't await the promise — it's intentionally hung until we release.
    const primerPromise = enqueueDanmaku('primer-manual', 12345, 'test-csrf-fixture', SendPriority.MANUAL)
    primerPromise.catch(() => {})
    await flushAsync(40)
    expect(releaseBlocking).not.toBeNull()

    // Trigger auto-blend's burst — its enqueueDanmaku(AUTO,...) will land in
    // the queue behind primer-manual.
    liveWs._emitDanmuMsg(makeDanmuMsg('cancel-target', 5001, 'A'))
    liveWs._emitDanmuMsg(makeDanmuMsg('cancel-target', 5002, 'B'))
    await flushAsync(autoBlendBurstSettleMs.value + 50)

    // Preempt: a MANUAL send cancels every queued AUTO item synchronously
    // (cancelAutoItem inside enqueueDanmaku's MANUAL branch).
    const preemptPromise = enqueueDanmaku('manual-preempt', 12345, 'test-csrf-fixture', SendPriority.MANUAL)
    preemptPromise.catch(() => {})
    // Yield to microtasks so auto-blend's enqueueDanmaku promise resolves
    // (cancelled:true) and triggerSend's cancelled-branch logs.
    await flushAsync(40)

    // The auto-blend's AUTO never reached sendDanmaku — only primer is in flight.
    expect(sendDanmakuLog).toEqual(['primer-manual'])

    // Auto-blend logged the "被手动发送打断" cancellation line, NOT a success.
    const cancelLine = logsSince().find(l => l.includes('被手动发送打断') && l.includes('cancel-target'))
    expect(cancelLine).toBeDefined()
    expect(logsSince().some(l => l.includes('已跟车') && l.includes('cancel-target'))).toBe(false)
    // Echo wait must NOT have started — auto-blend's
    // `result.success && !result.cancelled` gate keeps `等待回显` from being set.
    expect(autoBlendLastActionText.value).not.toContain('等待回显')

    // Cleanup: release the primer so processQueue can drain. We don't await
    // the preempt's send (HARD_MIN_GAP wait would add ~1s); afterEach flushes
    // pending microtasks. Both promises were already attached to a noop catch.
    releaseBlocking?.()
  })
})
