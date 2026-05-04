/**
 * Defends `applyReplacements` against pathological user-authored rules
 * (audit A5).
 *
 * Without the bound, a self-amplifying rule like `"a" → "aa"` doubles the
 * output every iteration. Two such rules in a single map can produce
 * megabytes from a one-character input within a handful of iterations,
 * freezing the send loop and the rendering thread.
 *
 * The replacement module imports `store.ts` (which transitively pulls in GM
 * storage), so we set up a minimal GM mock and drive `replacementMap`
 * directly.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

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
  unsafeWindow: globalThis,
}))

const { applyReplacements, REPLACEMENT_MAX_OUTPUT_LENGTH } = await import('../src/lib/replacement')
const { cachedRoomId, replacementMap, localGlobalRules, localRoomRules, remoteKeywords } = await import(
  '../src/lib/store'
)

describe('applyReplacements output bound', () => {
  beforeEach(() => {
    cachedRoomId.value = null
    localGlobalRules.value = []
    localRoomRules.value = {}
    remoteKeywords.value = null
    replacementMap.value = null
  })

  test('caps output at REPLACEMENT_MAX_OUTPUT_LENGTH for self-amplifying rules', () => {
    // Each application of "a" → "aa" doubles the count of "a"s. Twenty
    // iterations would produce ~1M chars — without the cap, this would block
    // the main thread for visible time. With the cap, output is bounded at
    // REPLACEMENT_MAX_OUTPUT_LENGTH.
    replacementMap.value = new Map([['a', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']])
    const result = applyReplacements('a'.repeat(40))
    expect(result.length).toBeLessThanOrEqual(REPLACEMENT_MAX_OUTPUT_LENGTH)
  })

  test('returns input unchanged when no rule matches', () => {
    replacementMap.value = new Map([['xyz', 'abc']])
    expect(applyReplacements('hello world')).toBe('hello world')
  })

  test('applies straightforward replacements end-to-end', () => {
    replacementMap.value = new Map([['cat', 'dog']])
    expect(applyReplacements('the cat sat')).toBe('the dog sat')
  })

  test('skips empty `from` entries (defense against corrupt rule rows)', () => {
    replacementMap.value = new Map([
      ['', 'x'], // would otherwise insert "x" between every character
      ['cat', 'dog'],
    ])
    const out = applyReplacements('a cat')
    expect(out).toBe('a dog')
  })

  test('multiple non-amplifying rules apply independently and stay under the cap', () => {
    replacementMap.value = new Map([
      ['foo', 'F'],
      ['bar', 'B'],
    ])
    const input = 'foo bar foo bar'.repeat(50)
    const out = applyReplacements(input)
    expect(out.length).toBeLessThanOrEqual(REPLACEMENT_MAX_OUTPUT_LENGTH)
    expect(out).not.toContain('foo')
    expect(out).not.toContain('bar')
  })

  test('REPLACEMENT_MAX_OUTPUT_LENGTH is a sane positive integer', () => {
    expect(REPLACEMENT_MAX_OUTPUT_LENGTH).toBeGreaterThan(0)
    expect(Number.isInteger(REPLACEMENT_MAX_OUTPUT_LENGTH)).toBe(true)
    // Sanity: at least 10× a typical danmaku, but not unbounded.
    expect(REPLACEMENT_MAX_OUTPUT_LENGTH).toBeGreaterThanOrEqual(1024)
    expect(REPLACEMENT_MAX_OUTPUT_LENGTH).toBeLessThan(1024 * 1024)
  })
})
