// Regression tests for the C4 audit fix: `buildReplacementMap` raced SPA
// room navigation. The fix installs an `effect()` that auto-rebuilds when any
// of cachedRoomId / remoteKeywords / local rules change, and skips writing
// when cachedRoomId is mid-resolution (null) so it can't clobber a valid map
// with one missing the room-specific rules.

import { beforeEach, describe, expect, mock, test } from 'bun:test'

const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
}))

const { applyReplacements } = await import('../src/lib/replacement')
const { cachedRoomId, localGlobalRules, localRoomRules, remoteKeywords, replacementMap } = await import(
  '../src/lib/store'
)

describe('replacement reactive rebuild (C4)', () => {
  beforeEach(() => {
    cachedRoomId.value = null
    localGlobalRules.value = []
    localRoomRules.value = {}
    remoteKeywords.value = null
    replacementMap.value = null
  })

  test('rebuilds when cachedRoomId resolves', () => {
    localRoomRules.value = { 101: [{ from: 'foo', to: 'room-101' }] }
    cachedRoomId.value = 101

    expect(applyReplacements('foo')).toBe('room-101')
  })

  test('rebuilds when remoteKeywords change', () => {
    cachedRoomId.value = 101
    remoteKeywords.value = { global: { keywords: { foo: 'remote-v1' } } }
    expect(applyReplacements('foo')).toBe('remote-v1')

    remoteKeywords.value = { global: { keywords: { foo: 'remote-v2' } } }
    expect(applyReplacements('foo')).toBe('remote-v2')
  })

  test('rebuilds when localGlobalRules change', () => {
    cachedRoomId.value = 101
    localGlobalRules.value = [{ from: 'foo', to: 'global-v1' }]
    expect(applyReplacements('foo')).toBe('global-v1')

    localGlobalRules.value = [{ from: 'foo', to: 'global-v2' }]
    expect(applyReplacements('foo')).toBe('global-v2')
  })

  test('does NOT clobber a valid map when cachedRoomId resets to null mid-nav', () => {
    cachedRoomId.value = 101
    localRoomRules.value = { 101: [{ from: 'foo', to: 'room-101' }] }
    expect(applyReplacements('foo')).toBe('room-101')

    // Simulate ensureRoomId() momentarily resetting cachedRoomId between rooms.
    // The map is preserved so concurrent applyReplacements calls don't see an
    // incomplete (room-rule-less) map.
    cachedRoomId.value = null

    expect(applyReplacements('foo')).toBe('room-101')
  })
})
