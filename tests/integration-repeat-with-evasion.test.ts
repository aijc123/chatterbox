// Integration test for the SDET audit P0-2 flow:
//
//   user clicks +1 → repeatDanmaku
//     → applyReplacements
//     → enqueueDanmaku (priority MANUAL)
//     → sendDanmaku (mocked at HTTP boundary)
//     → verifyBroadcast (real)
//        success / shadow-ban branches
//     → AI-evasion fallback (real, with `shadowBanMode = 'auto-resend'`)
//        → tryAiEvasion → enqueueDanmaku (second send) → sendDanmaku
//        → learnShadowRules writes (sensitiveWord → processText(word))
//          back into localRoomRules
//
// Five real modules collaborate end-to-end (replacement, send-queue,
// send-verification, ai-evasion, shadow-learn). Mocks are kept at HTTP
// boundaries only:
//   - api.sendDanmaku captures outbound text without hitting B站
//   - globalThis.fetch returns canned Laplace chat-audit responses
//   - live-ws-source.startLiveWsSource is a no-op so ensureWsTracking()
//     does not try to fetch danmu-info from the network
//
// This is the integration counterpart to the existing UNIT-level wiring
// test (`tests/verify-wiring-danmaku-actions.test.ts`), which mocks
// `verifyBroadcast` away. Here we exercise the real verifyBroadcast body
// + tryAiEvasion + learnShadowRules side effects.

import { Window } from 'happy-dom'

// happy-dom is needed because:
//   - send-verification → subscribeDanmaku → tryAttach() calls
//     `document.querySelector('.chat-items')`
//   - stealDanmaku → focusCustomChatComposer queries the DOM
//   - copyText falls back to `document.createElement('textarea')`
const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  Node: happyWindow.Node,
  window: happyWindow,
})

// wbi.ts (transitively imported) patches XMLHttpRequest.prototype on load.
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

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// ---------- HTTP-boundary mocks ----------
// Captures the (text, roomId, csrfToken) that hit `api.sendDanmaku`. This
// is the integration's "outbound network" — beyond it nothing real happens.
interface SendCapture {
  message: string
  roomId: number
  csrfToken: string
}
const sendCaptures: SendCapture[] = []
let sendShouldSucceed = true

interface LaplaceState {
  hasSensitiveContent: boolean
  sensitiveWords?: string[]
  throwOnFetch: boolean
}
const laplace: LaplaceState = { hasSensitiveContent: false, sensitiveWords: undefined, throwOnFetch: false }

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
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
  // Any other URL: fail loudly so a leak surfaces immediately.
  return new Response('not routed', { status: 404 })
}) as typeof fetch

// ---------- internal-module mocks (spread real exports first) ----------
const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({
  ...realApi,
  ensureRoomId: async () => 12345,
  getCsrfToken: () => 'csrf-token-fixture',
  // self-uid; verifyBroadcast uses this for the "ignore DOM-self insert" filter.
  getDedeUid: () => '99999',
  sendDanmaku: async (message: string, roomId: number, csrfToken: string) => {
    sendCaptures.push({ message, roomId, csrfToken })
    return {
      success: sendShouldSucceed,
      message,
      isEmoticon: false,
      startedAt: Date.now(),
      error: sendShouldSucceed ? undefined : 'mock-fail',
    }
  },
}))

// startLiveWsSource opens a real WebSocket via danmu-info HTTP fetch in
// production. Replace with a no-op so ensureWsTracking() stays in process.
const realLiveWsSource = await import('../src/lib/live-ws-source')
mock.module('../src/lib/live-ws-source', () => ({
  ...realLiveWsSource,
  startLiveWsSource: () => {},
  stopLiveWsSource: () => {},
}))

// Confirmation dialog — we toggle this per-test for the confirm-decline case.
let showConfirmResult = true
const showConfirmCalls: Array<{ title: string; body: string }> = []
mock.module('../src/components/ui/alert-dialog', () => ({
  showConfirm: async (opts: { title: string; body: string }) => {
    showConfirmCalls.push({ title: opts.title, body: opts.body })
    return showConfirmResult
  },
}))

// log: capture so we can assert on warning lines without `appendLog` actually
// triggering Toasts. notifyUser is consumed transitively (guard-room-sync).
const appendLogCalls: string[] = []
const appendLogQuietCalls: string[] = []
mock.module('../src/lib/log', () => ({
  appendLog: (a: unknown, b?: unknown, c?: unknown) => {
    if (typeof a === 'string') appendLogCalls.push(a)
    else appendLogCalls.push(`${typeof b === 'string' ? b : ''}:${typeof c === 'string' ? c : ''}`)
  },
  appendLogQuiet: (msg: string) => appendLogQuietCalls.push(msg),
  notifyUser: (level: string, message: string, detail?: string) =>
    appendLogCalls.push(`${level}:${message}${detail ? `:${detail}` : ''}`),
}))

// IMPORTANT: do NOT mock guard-room-sync, replacement, send-queue,
// send-verification, ai-evasion, shadow-learn, or danmaku-actions — those are
// the modules under integration test. Side-effect avoidance for guard-room-sync
// is by leaving guardRoomEndpoint empty in `beforeEach` (so the real impl no-ops).

// ---------- Imports of system under test (after mocks) ----------
const { repeatDanmaku, stealDanmaku } = await import('../src/lib/danmaku-actions')
const { _setEchoTimeoutForTests } = await import('../src/lib/send-verification')
const { _resetAiEvasionCircuitForTests } = await import('../src/lib/ai-evasion')
const { _resetSendQueueForTests } = await import('../src/lib/send-queue')
const { emitCustomChatEvent, emitCustomChatWsStatus } = await import('../src/lib/custom-chat-events')
const { aiEvasion, fasongText } = await import('../src/lib/store-send')
const { autoLearnShadowRules, shadowBanMode, shadowBanObservations } = await import('../src/lib/store-shadow-learn')
const { localRoomRules, replacementMap } = await import('../src/lib/store-replacement')
const { cachedRoomId } = await import('../src/lib/store')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store-guard-room')

// Fire a synthetic ws-source danmaku echo. verifyBroadcast subscribes to
// subscribeCustomChatEvents, so emitting here resolves waitForSentEcho.
function emitWsEcho(text: string, uid = '99999'): void {
  emitCustomChatEvent({
    id: `t-${Math.random()}`,
    kind: 'danmaku',
    text,
    uname: uid,
    uid,
    time: '00:00',
    isReply: false,
    badges: [],
    source: 'ws',
  })
}

async function flush(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

beforeEach(() => {
  sendCaptures.length = 0
  appendLogCalls.length = 0
  appendLogQuietCalls.length = 0
  showConfirmCalls.length = 0
  showConfirmResult = true
  sendShouldSucceed = true
  laplace.hasSensitiveContent = false
  laplace.sensitiveWords = undefined
  laplace.throwOnFetch = false

  // Signal state — every test starts from the same baseline.
  cachedRoomId.value = 12345
  localRoomRules.value = {}
  replacementMap.value = null // forces rebuild via the reactive effect
  aiEvasion.value = false
  autoLearnShadowRules.value = true
  shadowBanMode.value = 'suggest' // tests opt-in to 'auto-resend' explicitly
  shadowBanObservations.value = []
  fasongText.value = ''
  guardRoomEndpoint.value = '' // keep guard-room cloud sync no-op
  guardRoomSyncKey.value = ''

  // Speed up verifyBroadcast: production wait is 4s. Tests don't care.
  _setEchoTimeoutForTests(30)

  // Reset cross-test state so a previous test's send doesn't drag the
  // 1010ms inter-send gap into this test's first send.
  _resetAiEvasionCircuitForTests()
  _resetSendQueueForTests()

  // verifyBroadcast's currentWsStatus must be 'live' for the shadow-ban
  // path to fire — otherwise it logs ⚪ and returns. The first verifyBroadcast
  // call inside the SUT runs ensureWsTracking(), which subscribes via
  // subscribeCustomChatWsStatus and is immediately invoked with the current
  // status — so emitting 'live' here primes that handler.
  emitCustomChatWsStatus('live')
})

afterEach(() => {
  _setEchoTimeoutForTests(null)
})

// ---------------------------------------------------------------------------
// Scenario 1 — replacement applies BEFORE enqueueDanmaku
// ---------------------------------------------------------------------------
describe('repeatDanmaku → applyReplacements → enqueueDanmaku → sendDanmaku', () => {
  test('local room rule rewrites the text before it reaches sendDanmaku', async () => {
    localRoomRules.value = { 12345: [{ from: '冲', to: '🚀' }] }
    // Reactive effect rebuilds replacementMap; flush a microtask for safety.
    await Promise.resolve()

    void repeatDanmaku('上车冲鸭')
    // Provide a ws echo so verifyBroadcast resolves quickly without firing
    // the shadow-ban path; the assertion target is the captured send.
    setTimeout(() => emitWsEcho('上车🚀鸭'), 5)
    await flush(80)

    expect(sendCaptures).toHaveLength(1)
    expect(sendCaptures[0].message).toBe('上车🚀鸭')
    expect(sendCaptures[0].roomId).toBe(12345)
    expect(sendCaptures[0].csrfToken).toBe('csrf-token-fixture')
  })
})

// ---------------------------------------------------------------------------
// Scenario 2 — confirmation dialog gating
// ---------------------------------------------------------------------------
describe('repeatDanmaku confirm option', () => {
  test('confirm:true + accept → enqueue happens; showConfirm called with the message', async () => {
    showConfirmResult = true
    void repeatDanmaku('hello', { confirm: true })
    setTimeout(() => emitWsEcho('hello'), 5)
    await flush(80)

    expect(showConfirmCalls).toHaveLength(1)
    expect(showConfirmCalls[0].body).toBe('hello')
    expect(sendCaptures).toHaveLength(1)
    expect(sendCaptures[0].message).toBe('hello')
  })

  test('confirm:true + decline → no enqueue, no send', async () => {
    showConfirmResult = false
    await repeatDanmaku('blocked', { confirm: true })
    await flush(40)

    expect(showConfirmCalls).toHaveLength(1)
    expect(sendCaptures).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Scenario 3 — happy broadcast: ws echo arrives, no AI evasion ever fires
// ---------------------------------------------------------------------------
describe('happy broadcast path', () => {
  test('ws echo within timeout → no Laplace fetch, no shadow-ban observation', async () => {
    aiEvasion.value = true // even with AI on, a confirmed echo skips it
    laplace.hasSensitiveContent = true
    laplace.sensitiveWords = ['hello']

    void repeatDanmaku('hello')
    setTimeout(() => emitWsEcho('hello'), 5)
    await flush(80)

    expect(sendCaptures).toHaveLength(1)
    expect(shadowBanObservations.value).toHaveLength(0)
    // No 🤖 line means tryAiEvasion never ran.
    expect(appendLogCalls.some(m => /🤖/.test(m))).toBe(false)
    expect(appendLogQuietCalls.some(m => /🛠/.test(m))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Scenario 4 — shadow-ban detected → AI evasion fires, second send, learning
// ---------------------------------------------------------------------------
describe('shadow-ban → AI evasion auto-resend', () => {
  test('no echo + auto-resend mode + AI hit → second send + observation + learned rule', async () => {
    shadowBanMode.value = 'auto-resend'
    aiEvasion.value = true
    laplace.hasSensitiveContent = true
    laplace.sensitiveWords = ['blocked']

    void repeatDanmaku('blocked')
    // No echo emitted — verifyBroadcast falls through to shadow-ban handling.
    // Wait long enough for: 30ms echo timeout + 2 Laplace fetches + 1010ms
    // inter-send gap + second sendDanmaku resolve + post-evasion verify.
    await flush(1300)

    // (a) Two captured sends: original 'blocked' then AI-rewritten variant.
    expect(sendCaptures.length).toBeGreaterThanOrEqual(2)
    expect(sendCaptures[0].message).toBe('blocked')
    const evaded = sendCaptures[1].message
    expect(evaded).not.toBe('blocked')
    // processText splices U+00AD (soft-hyphen) between graphemes.
    expect(evaded.includes('­')).toBe(true)

    // (b) Observation recorded on the original text.
    expect(shadowBanObservations.value.some(o => o.text === 'blocked')).toBe(true)

    // (c) Local room rule learned: from='blocked', to=processText('blocked').
    const rules = localRoomRules.value['12345']
    expect(rules?.length).toBe(1)
    expect(rules?.[0].from).toBe('blocked')
    expect(rules?.[0].to).not.toBe('blocked')
    expect(rules?.[0].to.includes('­')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Scenario 5 — Laplace network failure → graceful degradation
// ---------------------------------------------------------------------------
describe('AI-evasion network failure', () => {
  test('Laplace fetch throws → no second send, observation still recorded', async () => {
    shadowBanMode.value = 'auto-resend'
    aiEvasion.value = true
    laplace.throwOnFetch = true

    void repeatDanmaku('boom')
    await flush(150)

    expect(sendCaptures).toHaveLength(1)
    expect(sendCaptures[0].message).toBe('boom')
    // Observation still recorded so the user can see the suspect text in
    // the panel and promote it to a rule manually.
    expect(shadowBanObservations.value.some(o => o.text === 'boom')).toBe(true)
    // No learned rule (we never got a sensitive word list).
    expect(localRoomRules.value['12345']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Scenario 6 — Laplace says "nothing sensitive" → no resend
// ---------------------------------------------------------------------------
describe('AI-evasion empty completion', () => {
  test('hasSensitiveContent=false → no second send, no learned rule', async () => {
    shadowBanMode.value = 'auto-resend'
    aiEvasion.value = true
    laplace.hasSensitiveContent = false

    void repeatDanmaku('plain')
    await flush(150)

    expect(sendCaptures).toHaveLength(1)
    expect(localRoomRules.value['12345']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Scenario 7 — AI rewrite identical to original → no infinite loop
// ---------------------------------------------------------------------------
describe('AI-evasion rewrite-equals-input guard', () => {
  test('sensitiveWords absent from text → replaceSensitiveWords returns input → exactly one send', async () => {
    shadowBanMode.value = 'auto-resend'
    aiEvasion.value = true
    // Laplace flags a "sensitive word" that does NOT appear in the message.
    // replaceSensitiveWords leaves the input unchanged; requestAiSuggestion
    // returns null because evadedMessage === trimmed; canAutoResend is false.
    laplace.hasSensitiveContent = true
    laplace.sensitiveWords = ['notpresent']

    void repeatDanmaku('innocent')
    await flush(200)

    expect(sendCaptures).toHaveLength(1)
    expect(sendCaptures[0].message).toBe('innocent')
    expect(localRoomRules.value['12345']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Scenario 8 — stealDanmaku contract
// ---------------------------------------------------------------------------
describe('stealDanmaku', () => {
  // Documented contract finding for the audit: stealDanmaku does NOT share
  // the +1 pipeline. It copies the raw text into `fasongText` and the
  // clipboard, then opens the Send tab so the user can review/edit before
  // sending. There is no implicit applyReplacements / enqueueDanmaku /
  // verifyBroadcast call. Asserting that explicitly here so any future
  // refactor that wires steal into the auto-send path will trip this test.
  test('does not call sendDanmaku; sets fasongText to the RAW (un-replaced) input', async () => {
    localRoomRules.value = { 12345: [{ from: '冲', to: '🚀' }] }
    await Promise.resolve()

    await stealDanmaku('上车冲鸭')

    expect(sendCaptures).toHaveLength(0)
    expect(fasongText.value).toBe('上车冲鸭')
  })
})
