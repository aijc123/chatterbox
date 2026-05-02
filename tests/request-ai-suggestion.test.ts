/**
 * Targeted tests for `requestAiSuggestion` — the new "detect & rewrite WITHOUT
 * resending" entry point added so `verifyBroadcast` can show the AI variant
 * in the chip / log without taking an autonomous send action.
 *
 * Mirrors the contract of `tryAiEvasion` (covered separately in
 * `verify-ai-evasion-result.test.ts`) but asserts the NO-ENQUEUE invariant:
 * the function must NOT call `enqueueDanmaku` regardless of the input.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

let detectionResponseBody: unknown = { completion: { hasSensitiveContent: false } }
let detectionShouldFail = false
let enqueueWasCalled = false

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

// Tripwire: requestAiSuggestion MUST NOT enqueue. Any call here is a contract
// violation and the test will fail at the assertion.
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
}))

const { requestAiSuggestion } = await import('../src/lib/ai-evasion')
const { aiEvasion } = await import('../src/lib/store')

beforeEach(() => {
  aiEvasion.value = true
  detectionShouldFail = false
  detectionResponseBody = { completion: { hasSensitiveContent: false } }
  enqueueWasCalled = false
})

describe('requestAiSuggestion', () => {
  test('returns the rewritten text + sensitive words when Laplace flags content', async () => {
    detectionResponseBody = {
      completion: {
        hasSensitiveContent: true,
        sensitiveWords: ['习近平'],
      },
    }
    const r = await requestAiSuggestion('习近平')
    expect(r).not.toBeNull()
    expect(r?.evadedMessage).not.toBe('习近平')
    expect(r?.evadedMessage.includes('习')).toBe(true)
    expect(r?.sensitiveWords).toEqual(['习近平'])
    expect(enqueueWasCalled).toBe(false)
  })

  test('NEVER enqueues — even when Laplace returns hits', async () => {
    detectionResponseBody = {
      completion: {
        hasSensitiveContent: true,
        sensitiveWords: ['x'],
      },
    }
    await requestAiSuggestion('xyz')
    expect(enqueueWasCalled).toBe(false)
  })

  test('returns null when aiEvasion toggle is off (no Laplace call)', async () => {
    aiEvasion.value = false
    const r = await requestAiSuggestion('whatever')
    expect(r).toBeNull()
    expect(enqueueWasCalled).toBe(false)
  })

  test('returns null when Laplace finds nothing', async () => {
    detectionResponseBody = { completion: { hasSensitiveContent: false } }
    const r = await requestAiSuggestion('plain text')
    expect(r).toBeNull()
  })

  test('returns null when Laplace flags content but returns empty sensitiveWords', async () => {
    detectionResponseBody = { completion: { hasSensitiveContent: true, sensitiveWords: [] } }
    const r = await requestAiSuggestion('plain')
    expect(r).toBeNull()
  })

  test('returns null when the rewrite would equal the original text', async () => {
    // sensitiveWords has a word NOT in the message → replaceSensitiveWords
    // produces unchanged text, which the function must reject as "no useful
    // suggestion to surface".
    detectionResponseBody = {
      completion: { hasSensitiveContent: true, sensitiveWords: ['absent-word'] },
    }
    const r = await requestAiSuggestion('plain')
    expect(r).toBeNull()
  })

  test('returns null on whitespace-only input without hitting the network', async () => {
    detectionShouldFail = true // would throw if fetch happened
    const r = await requestAiSuggestion('   ')
    expect(r).toBeNull()
  })

  test('returns null on network failure rather than throwing', async () => {
    detectionShouldFail = true
    const r = await requestAiSuggestion('foo')
    expect(r).toBeNull()
  })
})
