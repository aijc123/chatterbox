/**
 * Pin the backward-compat aliases between `store-hzm` (legacy import path)
 * and `store-llm` (new canonical home for LLM API signals).
 *
 * Why we keep both: existing tests + outside consumers import e.g.
 * `hzmLlmApiKey` from `store-hzm`. We moved the underlying gmSignal to
 * `store-llm` (with new generic names like `llmApiKey`) so non-灰泽满 rooms can
 * configure LLM credentials too. The re-exports preserve the old import path.
 *
 * The test guards two contracts:
 *  1. Both names refer to the SAME signal instance — writing to one must be
 *     observable on the other (no silent fork that would cause "I set my key
 *     in one place but it's empty when YOLO reads it").
 *  2. The GM storage key remains `hzmLlm*` (not `llmApi*`) — preserving the
 *     persisted credentials of users who upgrade from a version that wrote
 *     to `hzmLlmApiKey`.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// In-memory GM 存储 + 默认值，与其它 hzm 测试保持一致风格
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
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const fromLegacy = await import('../src/lib/store-hzm')
const fromCanonical = await import('../src/lib/store-llm')
const { flushPendingWrites } = await import('../src/lib/gm-signal')

describe('store-hzm legacy LLM aliases ↔ store-llm canonical signals', () => {
  beforeEach(() => {
    // Avoid the persistence effect mucking with the API key across tests.
    fromCanonical.llmApiKeyPersist.value = false
    fromCanonical.llmApiKey.value = ''
  })

  afterEach(() => {
    fromCanonical.llmApiKey.value = ''
    fromCanonical.llmModel.value = 'claude-haiku-4-5-20251001'
    fromCanonical.llmBaseURL.value = ''
  })

  test('hzmLlmApiKey === llmApiKey (same signal instance)', () => {
    expect(fromLegacy.hzmLlmApiKey).toBe(fromCanonical.llmApiKey)
  })

  test('hzmLlmProvider === llmProvider', () => {
    expect(fromLegacy.hzmLlmProvider).toBe(fromCanonical.llmProvider)
  })

  test('hzmLlmModel === llmModel', () => {
    expect(fromLegacy.hzmLlmModel).toBe(fromCanonical.llmModel)
  })

  test('hzmLlmBaseURL === llmBaseURL', () => {
    expect(fromLegacy.hzmLlmBaseURL).toBe(fromCanonical.llmBaseURL)
  })

  test('hzmLlmApiKeyPersist === llmApiKeyPersist', () => {
    expect(fromLegacy.hzmLlmApiKeyPersist).toBe(fromCanonical.llmApiKeyPersist)
  })

  test('clearHzmLlmApiKey === clearLlmApiKey (same function)', () => {
    expect(fromLegacy.clearHzmLlmApiKey).toBe(fromCanonical.clearLlmApiKey)
  })

  test('writing to legacy alias propagates to canonical reader', () => {
    fromLegacy.hzmLlmApiKey.value = 'sk-via-legacy'
    expect(fromCanonical.llmApiKey.value).toBe('sk-via-legacy')
  })

  test('writing to canonical signal propagates to legacy reader', () => {
    fromCanonical.llmApiKey.value = 'sk-via-canonical'
    expect(fromLegacy.hzmLlmApiKey.value).toBe('sk-via-canonical')
  })

  test('GM storage key for the API key is the legacy name (preserves user data on upgrade)', () => {
    // Pre-populate as if an old version had written here:
    gmStore.set('hzmLlmApiKey', 'sk-from-disk')
    fromCanonical.llmApiKeyPersist.value = true
    // Touching the persist effect makes a write happen on the next change.
    // The persist effect for the API key writes synchronously (it's a custom
    // `effect()` in store-llm.ts, not gmSignal's debounced path).
    fromCanonical.llmApiKey.value = 'sk-changed'
    expect(gmStore.get('hzmLlmApiKey')).toBe('sk-changed')
    // Importantly, no `llmApiKey` GM key was created — the new module DID NOT
    // re-key the persistence layer:
    expect(gmStore.has('llmApiKey')).toBe(false)
  })

  test('GM storage key for the model is the legacy name', () => {
    fromCanonical.llmModel.value = 'gpt-4o-mini'
    // gmSignal debounces writes — flush before asserting on the GM store.
    flushPendingWrites()
    expect(gmStore.get('hzmLlmModel')).toBe('gpt-4o-mini')
    expect(gmStore.has('llmModel')).toBe(false)
  })
})
