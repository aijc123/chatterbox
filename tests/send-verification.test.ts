import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { CustomChatEvent } from '../src/lib/custom-chat-events'
import type { DanmakuEvent, DanmakuSubscription } from '../src/lib/danmaku-stream'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

// Inline state shared with the mocked modules below.
let mockUid: string | null = '42'
const customChatHandlers = new Set<(ev: CustomChatEvent) => void>()
const domHandlers = new Set<DanmakuSubscription>()
type RecentEntry = { text: string; uid: string | null; source: 'dom' | 'ws' | 'local'; observedAt: number }
const customChatHistory: RecentEntry[] = []
let isEmoticonUniqueResult = false
const appendLogCalls: string[] = []
const appendLogQuietCalls: string[] = []

// Include ensureRoomId/getCsrfToken even though this test doesn't use them —
// bun's process-wide module mocks would otherwise leave them undefined for
// `tests/verify-wiring-danmaku-actions.test.ts` which loads `danmaku-actions`
// (and therefore api) after this file's mocks are in place.
// Mock api with hand-rolled stubs (no spread of real api — that would load
// send-queue.ts transitively and lock its bindings before send-queue.test.ts
// can mock them). We include `ensureRoomId` and `getCsrfToken` defensively so
// that a later test file (e.g. verify-wiring-danmaku-actions.test.ts) which
// imports `danmaku-actions` will see a complete-enough api shape, in case
// bun's module cache lets that import predate the later mock install.
mock.module('../src/lib/api', () => ({
  getDedeUid: () => mockUid ?? undefined,
  ensureRoomId: async () => 0,
  getCsrfToken: () => '',
  setRandomDanmakuColor: async () => {},
  checkSelfRoomRestrictions: async () => [],
  fetchEmoticons: async () => {},
  setDanmakuMode: async () => {},
}))

mock.module('../src/lib/emoticon', () => ({
  isEmoticonUnique: () => isEmoticonUniqueResult,
  // Real ai-evasion.ts imports these — provide stubs so the real module
  // loads cleanly when send-verification triggers tryAiEvasion.
  isLockedEmoticon: () => false,
  formatLockedEmoticonReject: () => '',
}))

mock.module('../src/lib/custom-chat-events', () => ({
  subscribeCustomChatEvents: (handler: (ev: CustomChatEvent) => void) => {
    customChatHandlers.add(handler)
    return () => customChatHandlers.delete(handler)
  },
  findRecentCustomChatDanmakuSource: (text: string, uid: string | null, sinceTs: number) => {
    const target = text.trim()
    if (!target) return null
    for (let i = customChatHistory.length - 1; i >= 0; i--) {
      const entry = customChatHistory[i]
      if (entry.observedAt < sinceTs) break
      if (entry.text !== target) continue
      if (uid && entry.uid && entry.uid !== uid) continue
      return entry.source
    }
    return null
  },
}))

mock.module('../src/lib/danmaku-stream', () => ({
  subscribeDanmaku: (sub: DanmakuSubscription) => {
    domHandlers.add(sub)
    return () => domHandlers.delete(sub)
  },
}))

mock.module('../src/lib/log', () => ({
  appendLog: (msg: string) => appendLogCalls.push(msg),
  appendLogQuiet: (msg: string) => appendLogQuietCalls.push(msg),
}))

// NOTE: do NOT mock `../src/lib/ai-evasion` — bun's process-wide module mock
// would leak into `tests/verify-ai-evasion-result.test.ts` (loaded later)
// and replace the real `tryAiEvasion` it tests. Instead we use the REAL
// `tryAiEvasion` and control its behavior at its own boundaries:
//   - Mock global `fetch` for the Laplace detection endpoint, so the test
//     can decide whether sensitive content was found.
//   - Mock `send-queue.enqueueDanmaku` so the resend's success/failure is
//     deterministic without actually hitting B站.
const laplaceState: { hasSensitiveContent: boolean; sensitiveWords?: string[]; throw?: boolean } = {
  hasSensitiveContent: false,
}
let resendShouldSucceed = true

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (input: RequestInfo) => {
  if (laplaceState.throw) throw new Error('laplace down')
  const url = typeof input === 'string' ? input : (input as Request).url
  if (url.includes('chat-audit')) {
    return new Response(
      JSON.stringify({
        completion: {
          hasSensitiveContent: laplaceState.hasSensitiveContent,
          sensitiveWords: laplaceState.sensitiveWords,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }
  // Default: 404 for unexpected endpoints so a leak surfaces immediately.
  return new Response('not found', { status: 404 })
}) as typeof fetch

mock.module('../src/lib/send-queue', () => ({
  enqueueDanmaku: async (msg: string) => ({
    success: resendShouldSucceed,
    message: msg,
    isEmoticon: false,
    error: resendShouldSucceed ? undefined : 'k',
  }),
  SendPriority: { MANUAL: 0, AUTO: 1 },
}))

// NOTE: do NOT mock `guard-room-sync` — that mock would leak into
// `tests/guard-room-shadow-rule.test.ts` and shadow the real impl. We keep
// `guardRoomEndpoint` empty in `beforeEach` so the real `syncGuardRoomShadowRule`
// no-ops on its own.

// Import AFTER all module mocks are registered, otherwise the real modules
// load first and the mocks have no effect.
const {
  SEND_ECHO_TIMEOUT_MS,
  clearRecentDomDanmaku,
  clearVerifyBroadcastToastDedupe,
  rememberRecentDomDanmaku,
  verifyBroadcast,
  waitForSentEcho,
} = await import('../src/lib/send-verification')
// Real signals — set their `.value` to drive the system under test.
const { aiEvasion } = await import('../src/lib/store-send')
const { autoLearnShadowRules, shadowBanObservations } = await import('../src/lib/store-shadow-learn')
const { localRoomRules } = await import('../src/lib/store-replacement')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store-guard-room')

function emitWsDanmaku(
  event: Partial<CustomChatEvent> & { text: string; uid: string | null; source: 'ws' | 'dom' | 'local' }
): void {
  const full: CustomChatEvent = {
    id: `t-${Math.random()}`,
    kind: 'danmaku',
    text: event.text,
    uname: event.uid ?? '?',
    uid: event.uid,
    time: '00:00',
    isReply: false,
    badges: [],
    source: event.source,
  }
  for (const handler of customChatHandlers) handler(full)
  customChatHistory.push({ text: full.text.trim(), uid: full.uid, source: full.source, observedAt: Date.now() })
}

function emitDomDanmaku(text: string, uid: string | null): void {
  const ev: DanmakuEvent = {
    node: {} as HTMLElement,
    text,
    uname: null,
    uid,
    badges: [],
    isReply: false,
  }
  for (const sub of domHandlers) sub.onMessage?.(ev)
}

beforeEach(() => {
  customChatHandlers.clear()
  domHandlers.clear()
  customChatHistory.length = 0
  appendLogCalls.length = 0
  appendLogQuietCalls.length = 0
  isEmoticonUniqueResult = false
  mockUid = '42'
  aiEvasion.value = false
  laplaceState.hasSensitiveContent = false
  laplaceState.sensitiveWords = undefined
  laplaceState.throw = false
  resendShouldSucceed = true
  autoLearnShadowRules.value = true
  shadowBanObservations.value = []
  localRoomRules.value = {}
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
  clearRecentDomDanmaku()
  clearVerifyBroadcastToastDedupe()
})

afterEach(() => {
  customChatHandlers.clear()
  domHandlers.clear()
})

describe('waitForSentEcho', () => {
  test('resolves "ws" when a WS broadcast arrives within timeout', async () => {
    const sinceTs = Date.now()
    const promise = waitForSentEcho('hello', '42', sinceTs, 200)
    setTimeout(() => emitWsDanmaku({ text: 'hello', uid: '42', source: 'ws' }), 10)
    expect(await promise).toBe('ws')
  })

  test('resolves "dom" when a DOM broadcast arrives with stripped uid', async () => {
    // DOM scrape can fail to recover the sender uid (event.uid === null).
    // In that case we cannot tell self-insert from broadcast-echo, so we
    // accept it. When event.uid matches selfUid we reject — see the
    // self-DOM rejection test below.
    const sinceTs = Date.now()
    const promise = waitForSentEcho('hello', '42', sinceTs, 200)
    setTimeout(() => emitDomDanmaku('hello', null), 10)
    expect(await promise).toBe('dom')
  })

  test('ignores local-source events mid-wait, falls back to "local" after timeout', async () => {
    const sinceTs = Date.now()
    const promise = waitForSentEcho('hello', '42', sinceTs, 50)
    // local echo is recorded via the synchronous history backfill the way
    // emitLocalDanmakuEcho would. The handler should NOT short-circuit on it.
    setTimeout(() => {
      customChatHistory.push({ text: 'hello', uid: '42', source: 'local', observedAt: Date.now() })
    }, 10)
    expect(await promise).toBe('local')
  })

  test('resolves null when nothing arrives at all', async () => {
    const sinceTs = Date.now()
    expect(await waitForSentEcho('nobody-says-this', '42', sinceTs, 30)).toBeNull()
  })

  test('returns null synchronously for empty text', async () => {
    expect(await waitForSentEcho('   ', '42', Date.now(), 1000)).toBeNull()
  })

  test('uid mismatch (both known and different) is filtered', async () => {
    const sinceTs = Date.now()
    const promise = waitForSentEcho('hello', '42', sinceTs, 30)
    // Wrong uid — should be ignored and the wait should time out to null.
    setTimeout(() => emitWsDanmaku({ text: 'hello', uid: '99', source: 'ws' }), 5)
    expect(await promise).toBeNull()
  })

  test('uid-null on either side matches', async () => {
    const sinceTs = Date.now()
    const promise = waitForSentEcho('hello', null, sinceTs, 200)
    setTimeout(() => emitDomDanmaku('hello', '42'), 5)
    expect(await promise).toBe('dom')
  })

  test('synchronous backfill from DOM history before subscribing (non-self uid)', async () => {
    // DOM history with stripped uid → backfill returns 'dom'. With self uid
    // it would be filtered as a B站 local self-insert (covered separately).
    const sinceTs = Date.now() - 100
    rememberRecentDomDanmaku('hello', null, Date.now() - 50)
    expect(await waitForSentEcho('hello', '42', sinceTs, 1000)).toBe('dom')
  })

  test('default timeout constant is 4000ms', () => {
    expect(SEND_ECHO_TIMEOUT_MS).toBe(4000)
  })

  test('rejects DOM-self echoes (B站 inserts self danmaku locally even when shadow-banned)', async () => {
    // Self UID is '42'. A DOM event with uid='42' is what B站 client-side
    // would insert regardless of broadcast — must NOT count as proof.
    const sinceTs = Date.now()
    const promise = waitForSentEcho('习近平', '42', sinceTs, 50)
    setTimeout(() => emitDomDanmaku('习近平', '42'), 5)
    expect(await promise).toBeNull()
  })

  test('accepts WS-self echoes (server only pushes DANMU_MSG when broadcast actually happens)', async () => {
    const sinceTs = Date.now()
    const promise = waitForSentEcho('普通话', '42', sinceTs, 200)
    setTimeout(() => emitWsDanmaku({ text: '普通话', uid: '42', source: 'ws' }), 5)
    expect(await promise).toBe('ws')
  })

  test('synchronous backfill filter: DOM-self in history is ignored', async () => {
    rememberRecentDomDanmaku('习近平', '42', Date.now() - 50) // self insert
    expect(await waitForSentEcho('习近平', '42', Date.now() - 100, 30)).toBeNull()
  })
})

describe('verifyBroadcast', () => {
  test('writes nothing when broadcast is confirmed', async () => {
    const sinceTs = Date.now()
    const promise = verifyBroadcast({ text: 'hello', label: '手动', display: 'hello', sinceTs })
    setTimeout(() => emitWsDanmaku({ text: 'hello', uid: '42', source: 'ws' }), 5)
    await promise
    expect(appendLogCalls).toEqual([])
    expect(appendLogQuietCalls).toEqual([])
  })

  test('skips verification entirely for emoticon sends', async () => {
    isEmoticonUniqueResult = true
    await verifyBroadcast({
      text: '[doge]',
      label: '手动',
      display: '[doge]',
      sinceTs: Date.now(),
    })
    expect(appendLogCalls).toEqual([])
    expect(appendLogQuietCalls).toEqual([])
  })

  test('explicit isEmoticon=true short-circuits without calling isEmoticonUnique', async () => {
    isEmoticonUniqueResult = false
    await verifyBroadcast({
      text: 'plain text',
      label: '手动',
      display: 'plain text',
      sinceTs: Date.now(),
      isEmoticon: true,
    })
    expect(appendLogCalls).toEqual([])
    expect(appendLogQuietCalls).toEqual([])
  })

  test('toastDedupeKey: first warning surfaces toast, repeats go through appendLogQuiet', async () => {
    // Use very small timeout via direct subscribe — verifyBroadcast hides it,
    // so for this test we simulate by leveraging the synchronous-empty path:
    // a `local`-source history entry triggers the timeout fallback, but
    // verifyBroadcast's awaiter blocks for ~4s. To keep the test fast we
    // instead construct the expected behavior by calling verifyBroadcast
    // back-to-back and racing with timed echoes that DON'T arrive — but with
    // the production 4s timeout that's slow.
    //
    // Strategy: stub waitForSentEcho via a temp WS event that resolves to
    // 'local' immediately by pre-seeding history, skipping the full wait.
    customChatHistory.push({ text: 'shadow', uid: '42', source: 'local', observedAt: Date.now() })
    // First call — will fall through wait (no broadcast), timeout returns 'local'.
    // To keep the test fast we run verifyBroadcast twice with short waits:
    // we accept the 4s real wait once in the assertion below but do parallel
    // calls so total runtime ≈ 4s.
    const a = verifyBroadcast({
      text: 'shadow',
      label: '自动',
      display: 'shadow',
      sinceTs: Date.now() - 10,
      toastDedupeKey: 'loop:shadow',
      timeoutMs: 30,
    })
    const b = verifyBroadcast({
      text: 'shadow',
      label: '自动',
      display: 'shadow',
      sinceTs: Date.now() - 10,
      toastDedupeKey: 'loop:shadow',
      timeoutMs: 30,
    })
    await Promise.all([a, b])
    expect(appendLogCalls.length).toBe(1)
    expect(appendLogQuietCalls.length).toBe(1)
    expect(appendLogCalls[0]).toContain('⚠️ 自动: shadow')
    expect(appendLogQuietCalls[0]).toContain('⚠️ 自动: shadow')
  })

  test('different toastDedupeKeys do not share cooldown', async () => {
    customChatHistory.push({ text: 'a', uid: '42', source: 'local', observedAt: Date.now() })
    customChatHistory.push({ text: 'b', uid: '42', source: 'local', observedAt: Date.now() })
    const a = verifyBroadcast({
      text: 'a',
      label: '自动',
      display: 'a',
      sinceTs: Date.now() - 10,
      toastDedupeKey: 'loop:a',
    })
    const b = verifyBroadcast({
      text: 'b',
      label: '自动',
      display: 'b',
      sinceTs: Date.now() - 10,
      toastDedupeKey: 'loop:b',
    })
    await Promise.all([a, b])
    expect(appendLogCalls.length).toBe(2)
    expect(appendLogQuietCalls.length).toBe(0)
  }, 15_000)

  test('surfaceToast=false routes to appendLogQuiet even without dedupe key', async () => {
    customChatHistory.push({ text: 'silent', uid: '42', source: 'local', observedAt: Date.now() })
    await verifyBroadcast({
      text: 'silent',
      label: '自动',
      display: 'silent',
      sinceTs: Date.now() - 10,
      surfaceToast: false,
    })
    expect(appendLogCalls.length).toBe(0)
    expect(appendLogQuietCalls.length).toBe(1)
  }, 10_000)
})

describe('verifyBroadcast Layer 1+2+3 integration', () => {
  test('shadow-ban + enableAiEvasion + aiEvasion.value triggers AI evasion and writes a learned rule', async () => {
    aiEvasion.value = true
    laplaceState.hasSensitiveContent = true
    laplaceState.sensitiveWords = ['上车冲鸭']
    resendShouldSucceed = true
    customChatHistory.push({ text: '上车冲鸭', uid: '42', source: 'local', observedAt: Date.now() })

    await verifyBroadcast({
      text: '上车冲鸭',
      label: '手动',
      display: '上车冲鸭',
      sinceTs: Date.now() - 10,
      timeoutMs: 30,
      enableAiEvasion: true,
      roomId: 12345,
      csrfToken: 'csrf-token',
    })

    // Real shadow-learn writes the (sensitiveWord → processText(word)) rule.
    const rules = localRoomRules.value['12345']
    expect(rules?.length).toBe(1)
    expect(rules?.[0].from).toBe('上车冲鸭')
    expect(rules?.[0].to).not.toBe('上车冲鸭')

    // The 🤖 prefix proves real ai-evasion ran (asserts no leaked stub
    // short-circuited the call).
    expect(appendLogCalls.some(m => /🤖.*影子屏蔽-AI规避/.test(m))).toBe(true)
  })

  test('aiEvasion.value=false skips AI evasion and records observation', async () => {
    aiEvasion.value = false
    customChatHistory.push({ text: 'foo', uid: '42', source: 'local', observedAt: Date.now() })
    await verifyBroadcast({
      text: 'foo',
      label: '手动',
      display: 'foo',
      sinceTs: Date.now() - 10,
      timeoutMs: 30,
      enableAiEvasion: true,
      roomId: 1,
      csrfToken: 'c',
    })
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].evadedAlready).toBe(false)
    expect(localRoomRules.value['1']).toBeUndefined()
    // No "🤖 ... AI规避" message when toggle is off.
    expect(appendLogCalls.some(m => /🤖/.test(m))).toBe(false)
  })

  test('Laplace finds nothing → records observation with evadedAlready=false', async () => {
    aiEvasion.value = true
    laplaceState.hasSensitiveContent = false
    customChatHistory.push({ text: 'bar', uid: '42', source: 'local', observedAt: Date.now() })

    await verifyBroadcast({
      text: 'bar',
      label: '手动',
      display: 'bar',
      sinceTs: Date.now() - 10,
      timeoutMs: 30,
      enableAiEvasion: true,
      roomId: 1,
      csrfToken: 'c',
    })

    expect(localRoomRules.value['1']).toBeUndefined()
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].evadedAlready).toBe(false)
  })

  test('isPostEvasion=true never triggers AI again, only records observation as evadedAlready', async () => {
    aiEvasion.value = true
    laplaceState.hasSensitiveContent = true
    laplaceState.sensitiveWords = ['x']
    customChatHistory.push({ text: 'shadow', uid: '42', source: 'local', observedAt: Date.now() })

    await verifyBroadcast({
      text: 'shadow',
      label: '手动·AI',
      display: 'shadow',
      sinceTs: Date.now() - 10,
      timeoutMs: 30,
      enableAiEvasion: true,
      roomId: 1,
      csrfToken: 'c',
      isPostEvasion: true,
      surfaceToast: false,
    })

    expect(localRoomRules.value['1']).toBeUndefined()
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].evadedAlready).toBe(true)
    // No 🤖 message — AI was NOT called on the post-evasion pass.
    expect(appendLogCalls.some(m => /🤖.*AI规避/.test(m))).toBe(false)
  })

  test('confirmed broadcast skips AI evasion and observation', async () => {
    aiEvasion.value = true
    laplaceState.hasSensitiveContent = true
    laplaceState.sensitiveWords = ['anything']
    const promise = verifyBroadcast({
      text: 'good',
      label: '手动',
      display: 'good',
      sinceTs: Date.now(),
      timeoutMs: 200,
      enableAiEvasion: true,
      roomId: 1,
      csrfToken: 'c',
    })
    setTimeout(() => emitWsDanmaku({ text: 'good', uid: '42', source: 'ws' }), 5)
    await promise
    expect(localRoomRules.value).toEqual({})
    expect(shadowBanObservations.value).toHaveLength(0)
    expect(appendLogCalls.some(m => /🤖/.test(m))).toBe(false)
  })

  test('autoLearnShadowRules=false skips writing learned rules but AI evasion still runs', async () => {
    aiEvasion.value = true
    autoLearnShadowRules.value = false
    laplaceState.hasSensitiveContent = true
    laplaceState.sensitiveWords = ['block']
    resendShouldSucceed = true
    customChatHistory.push({ text: 'block', uid: '42', source: 'local', observedAt: Date.now() })

    await verifyBroadcast({
      text: 'block',
      label: '+1',
      display: 'block',
      sinceTs: Date.now() - 10,
      timeoutMs: 30,
      enableAiEvasion: true,
      roomId: 7,
      csrfToken: 'c',
    })

    // AI evasion ran (🤖 prefix logged) but learning was suppressed.
    expect(appendLogCalls.some(m => /🤖.*影子屏蔽-AI规避/.test(m))).toBe(true)
    expect(localRoomRules.value['7']).toBeUndefined()
  })
})
