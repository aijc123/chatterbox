/**
 * Error-path coverage for the Laplace AI-evasion HTTP integration.
 *
 * The happy paths are covered in:
 *   - request-ai-suggestion.test.ts
 *   - verify-ai-evasion-result.test.ts
 *   - ai-evasion-empty.test.ts
 *
 * This file targets the failure modes that were previously untested:
 *   - 5xx response from edge-workers.laplace.cn
 *   - 4xx response (e.g. 429, 401) — request must not throw
 *   - malformed JSON body
 *   - response with `completion` missing or wrong shape
 *   - `hasSensitiveContent` returned as a non-boolean (e.g. "yes")
 *
 * In every error case `requestAiSuggestion` and `tryAiEvasion` must degrade
 * gracefully (no throw, no enqueue) rather than crashing the send pipeline.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

type FetchResponder = () => Response | Promise<Response>

let fetchResponder: FetchResponder = () =>
  new Response(JSON.stringify({ completion: { hasSensitiveContent: false } }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
let enqueueWasCalled = false

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async () => fetchResponder()) as typeof fetch

mock.module('../src/lib/send-queue', () => ({
  enqueueDanmaku: async (msg: string) => {
    enqueueWasCalled = true
    return { success: true, message: msg, isEmoticon: false }
  },
  SendPriority: { MANUAL: 0, AUTO: 1 },
}))

mock.module('../src/lib/log', () => ({
  appendLog: () => {},
  appendLogQuiet: () => {},
  notifyUser: () => {},
}))

const { requestAiSuggestion, tryAiEvasion, _resetAiEvasionCircuitForTests } = await import('../src/lib/ai-evasion')
const { aiEvasion } = await import('../src/lib/store')

beforeEach(() => {
  aiEvasion.value = true
  enqueueWasCalled = false
  // 每个错误路径测试都自带单独的失败假设,熔断器不能携带前面 case 的失败计数。
  _resetAiEvasionCircuitForTests()
})

describe('ai-evasion error paths — Laplace HTTP failures', () => {
  test('5xx response → requestAiSuggestion returns null and does not throw', async () => {
    fetchResponder = () => new Response('Internal Server Error', { status: 500 })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
    expect(enqueueWasCalled).toBe(false)
  })

  test('429 rate-limit response → requestAiSuggestion returns null', async () => {
    fetchResponder = () => new Response('Too Many Requests', { status: 429 })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('401 unauthorized response → requestAiSuggestion returns null', async () => {
    fetchResponder = () => new Response('Unauthorized', { status: 401 })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('malformed JSON body → requestAiSuggestion returns null', async () => {
    fetchResponder = () =>
      new Response('{not valid json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('valid JSON but `completion` missing → returns null (treated as no-hit)', async () => {
    fetchResponder = () =>
      new Response(JSON.stringify({ unrelated: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('hasSensitiveContent as string "yes" → coerced as truthy, but sensitiveWords missing → null', async () => {
    // Documents current behavior: detectSensitiveWords does no schema
    // validation, so a non-boolean truthy `hasSensitiveContent` slips through;
    // the downstream guard `!detection.sensitiveWords?.length` then short-
    // circuits because the field is absent. Net effect is safe: null.
    fetchResponder = () =>
      new Response(JSON.stringify({ completion: { hasSensitiveContent: 'yes' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('sensitiveWords as wrong type (string instead of array) → null, no crash', async () => {
    fetchResponder = () =>
      new Response(JSON.stringify({ completion: { hasSensitiveContent: true, sensitiveWords: 'not-an-array' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })

  test('5xx response → tryAiEvasion returns success: false without enqueueing', async () => {
    fetchResponder = () => new Response('boom', { status: 503 })
    const r = await tryAiEvasion('blocked text', 12345, 'csrf', 'test-')
    expect(r.success).toBe(false)
    expect(enqueueWasCalled).toBe(false)
  })

  test('malformed JSON → tryAiEvasion returns success: false without enqueueing', async () => {
    fetchResponder = () => new Response('<html>oops</html>', { status: 200 })
    const r = await tryAiEvasion('blocked text', 12345, 'csrf', 'test-')
    expect(r.success).toBe(false)
    expect(enqueueWasCalled).toBe(false)
  })

  test('fetch rejects (network down) → tryAiEvasion returns success: false', async () => {
    fetchResponder = () => {
      throw new Error('ECONNREFUSED')
    }
    const r = await tryAiEvasion('blocked text', 12345, 'csrf', 'test-')
    expect(r.success).toBe(false)
    expect(enqueueWasCalled).toBe(false)
  })
})
