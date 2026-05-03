// Targeted test for the Layer 2 contract: `tryAiEvasion` returns the list of
// sensitive words Laplace flagged so callers (`verifyBroadcast` →
// `learnShadowRules`) can write them as local replacement rules.
//
// Pre-change: `TryAiEvasionResult` did NOT expose `sensitiveWords`, so a
// shadow-ban learning loop had no way to know which substrings to promote.

import { beforeEach, describe, expect, mock, test } from 'bun:test'

let detectionResponseBody: unknown = { completion: { hasSensitiveContent: false } }
let detectionShouldFail = false
let enqueueResult: { success: boolean; message: string; isEmoticon: boolean; error?: string } = {
  success: true,
  message: '',
  isEmoticon: false,
}

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async () => {
  if (detectionShouldFail) throw new Error('network down')
  return new Response(JSON.stringify(detectionResponseBody), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}) as typeof fetch

// Mock send-queue with ONLY what ai-evasion uses. Do NOT spread the real
// module — `send-queue.test.ts` runs later and installs its own mock, which
// would not take effect if the real bindings were already cached.
mock.module('../src/lib/send-queue', () => ({
  enqueueDanmaku: async (msg: string) => ({ ...enqueueResult, message: msg }),
  SendPriority: { MANUAL: 0, AUTO: 1 },
}))

mock.module('../src/lib/log', () => ({
  appendLog: () => {},
  appendLogQuiet: () => {},
}))

const { tryAiEvasion, _resetAiEvasionCircuitForTests } = await import('../src/lib/ai-evasion')
const { aiEvasion } = await import('../src/lib/store')

beforeEach(() => {
  aiEvasion.value = true
  detectionShouldFail = false
  detectionResponseBody = { completion: { hasSensitiveContent: false } }
  enqueueResult = { success: true, message: '', isEmoticon: false }
  // 重置熔断器:bun test 在同一进程内串行运行所有 test 文件,前面 ai-evasion-errors
  // 跑完后 ai-evasion 模块的内部熔断器可能处于 open 状态,会让本文件的成功路径
  // 全部走短路返回 hasSensitiveContent=false,从而误判为失败。
  _resetAiEvasionCircuitForTests()
})

describe('tryAiEvasion result shape (Layer 2 contract)', () => {
  test('returns sensitiveWords when Laplace flags content AND the resend succeeds', async () => {
    detectionResponseBody = {
      completion: {
        hasSensitiveContent: true,
        sensitiveWords: ['上车冲鸭', '提前'],
      },
    }
    enqueueResult = { success: true, message: '', isEmoticon: false }

    const r = await tryAiEvasion('上车冲鸭提前发车', 12345, 'csrf', '')
    expect(r.success).toBe(true)
    expect(r.evadedMessage).toBeDefined()
    expect(r.sensitiveWords).toEqual(['上车冲鸭', '提前'])
  })

  test('returns sensitiveWords even when the resend FAILS so callers can still surface them', async () => {
    detectionResponseBody = {
      completion: {
        hasSensitiveContent: true,
        sensitiveWords: ['屏蔽词'],
      },
    }
    enqueueResult = { success: false, message: '', isEmoticon: false, error: 'k' }

    const r = await tryAiEvasion('屏蔽词', 1, 'csrf', '')
    expect(r.success).toBe(false)
    expect(r.evadedMessage).toBeDefined()
    expect(r.sensitiveWords).toEqual(['屏蔽词'])
  })

  test('omits sensitiveWords when Laplace finds nothing (no learning signal)', async () => {
    detectionResponseBody = { completion: { hasSensitiveContent: false } }

    const r = await tryAiEvasion('完全无害', 1, 'csrf', '')
    expect(r.success).toBe(false)
    expect(r.sensitiveWords).toBeUndefined()
  })

  test('returns success=false with no sensitiveWords when aiEvasion toggle is off', async () => {
    aiEvasion.value = false
    const r = await tryAiEvasion('whatever', 1, 'csrf', '')
    expect(r.success).toBe(false)
    expect(r.sensitiveWords).toBeUndefined()
  })
})
