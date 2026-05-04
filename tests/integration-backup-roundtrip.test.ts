// SDET audit P0-3 integration: end-to-end backup → JSON → import flow.
//
// Exercises the real reactive chain (no internal mocks): backup.ts produces
// the JSON, gm-signal.ts validates + applies it, store-*.ts signals receive
// the new values, and replacement.ts's `effect()` rebuilds replacementMap
// without a page refresh.
//
// The validate-only step is already covered by `backup-import-validate.test.ts`.
// This file owns the post-validate side: the signal mutation, the effect
// rebuild, GM persistence, and round-trip identity.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { effect } from '@preact/signals'

import { installGmStoreMock } from './_gm-store'

const { store: gmStore, reset: resetGmStore } = installGmStoreMock()

const { exportSettings, importSettings } = await import('../src/lib/backup')
const { flushPendingWrites } = await import('../src/lib/gm-signal')
// Importing for the side effect: replacement.ts registers an `effect()` that
// rebuilds replacementMap whenever cachedRoomId / remoteKeywords / local rules
// change. Without this load, the audit's "effect rebuilds on import" claim
// can't be verified.
await import('../src/lib/replacement')
const {
  aiEvasion,
  cachedRoomId,
  localGlobalRules,
  localRoomRules,
  msgSendInterval,
  msgTemplates,
  randomColor,
  remoteKeywords,
  replacementMap,
} = await import('../src/lib/store')
const { maxLogLines } = await import('../src/lib/log')

function resetSignals() {
  aiEvasion.value = false
  cachedRoomId.value = null
  localGlobalRules.value = []
  localRoomRules.value = {}
  maxLogLines.value = 1000
  msgSendInterval.value = 1
  msgTemplates.value = []
  randomColor.value = false
  remoteKeywords.value = null
  replacementMap.value = null
}

describe('backup round-trip integration (P0-3)', () => {
  beforeEach(() => {
    resetGmStore()
    resetSignals()
  })

  afterEach(() => {
    flushPendingWrites()
  })

  test('round-trip identity: export → mutate → import restores every signal', async () => {
    aiEvasion.value = true
    maxLogLines.value = 1234
    msgSendInterval.value = 2.5
    msgTemplates.value = ['t1', 't2']
    localRoomRules.value = { '1': [{ from: 'x', to: 'y' }] }
    localGlobalRules.value = [{ from: 'g', to: 'G' }]

    flushPendingWrites()

    const json = exportSettings()

    aiEvasion.value = false
    maxLogLines.value = 50
    msgSendInterval.value = 0.5
    msgTemplates.value = []
    localRoomRules.value = {}
    localGlobalRules.value = []

    const result = importSettings(json)
    expect(result.ok).toBe(true)

    expect(aiEvasion.value).toBe(true)
    expect(maxLogLines.value).toBe(1234)
    expect(msgSendInterval.value).toBe(2.5)
    expect(msgTemplates.value).toEqual(['t1', 't2'])
    expect(localRoomRules.value).toEqual({ '1': [{ from: 'x', to: 'y' }] })
    expect(localGlobalRules.value).toEqual([{ from: 'g', to: 'G' }])
  })

  test('effect rebuilds replacementMap on import without a refresh (audit headline)', () => {
    cachedRoomId.value = 101
    localRoomRules.value = { '101': [{ from: 'foo', to: 'bar-v1' }] }

    const observed: Array<Map<string, string> | null> = []
    const dispose = effect(() => {
      observed.push(replacementMap.value)
    })

    expect(observed.length).toBeGreaterThanOrEqual(1)
    const firstMap = observed[observed.length - 1]
    expect(firstMap?.get('foo')).toBe('bar-v1')

    flushPendingWrites()
    const exported = exportSettings()
    const parsed = JSON.parse(exported) as Record<string, unknown>
    parsed.localRoomRules = { '101': [{ from: 'foo', to: 'bar-v2' }, { from: 'baz', to: 'qux' }] }
    const mutatedJson = JSON.stringify(parsed)

    const before = observed.length
    const result = importSettings(mutatedJson)
    expect(result.ok).toBe(true)

    expect(observed.length).toBeGreaterThan(before)
    const finalMap = observed[observed.length - 1]
    expect(finalMap?.get('foo')).toBe('bar-v2')
    expect(finalMap?.get('baz')).toBe('qux')

    dispose()
  })

  test('partial import — unknown keys silently ignored, count reflects applied keys only', () => {
    const json = JSON.stringify({
      __version: 1,
      aiEvasion: true,
      foo: 'unknown',
      maxLogLines: 500,
      anotherStray: 42,
    })

    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(2)
    expect(aiEvasion.value).toBe(true)
    expect(maxLogLines.value).toBe(500)
    expect(result.unknownKeys).toEqual(expect.arrayContaining(['foo', 'anotherStray']))
  })

  test('partial import — invalid values rejected per-key, live signals untouched', () => {
    aiEvasion.value = false
    maxLogLines.value = 1000

    const json = JSON.stringify({
      __version: 1,
      maxLogLines: -5, // below min
      aiEvasion: 'not-a-bool', // wrong type
    })

    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(0)
    expect(aiEvasion.value).toBe(false)
    expect(maxLogLines.value).toBe(1000)
    expect(result.skipped).toEqual(expect.arrayContaining(['maxLogLines', 'aiEvasion']))
  })

  test('mixed valid/invalid in one import — valid keys land, invalid keys skipped', () => {
    aiEvasion.value = false
    maxLogLines.value = 1000
    localRoomRules.value = {}

    const json = JSON.stringify({
      __version: 1,
      maxLogLines: 1500,
      aiEvasion: 'wrong-type',
      localRoomRules: { '7': [{ from: 'a', to: 'b' }] },
    })

    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(2)
    expect(maxLogLines.value).toBe(1500)
    expect(localRoomRules.value).toEqual({ '7': [{ from: 'a', to: 'b' }] })
    expect(aiEvasion.value).toBe(false)
    expect(result.skipped).toEqual(['aiEvasion'])
  })

  test('import persists to GM storage (not just in-memory mutation)', async () => {
    expect(gmStore.get('maxLogLines')).toBeUndefined()

    const json = JSON.stringify({ __version: 1, maxLogLines: 7777, aiEvasion: true })
    const result = importSettings(json)
    expect(result.ok).toBe(true)

    // importSettings calls GM_setValue synchronously before applyImportedSettings,
    // so the underlying Map should already hold the imported values.
    expect(gmStore.get('maxLogLines')).toBe(7777)
    expect(gmStore.get('aiEvasion')).toBe(true)

    // The signal-side debounced write (from applyImportedSettings's signal.value =
    // assignment) should also land after the debounce window without overwriting
    // with anything stale.
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(gmStore.get('maxLogLines')).toBe(7777)
    expect(gmStore.get('aiEvasion')).toBe(true)
  })

  test('export shape — re-exporting after a no-op import yields a structurally-equivalent JSON', () => {
    aiEvasion.value = true
    maxLogLines.value = 2222
    msgTemplates.value = ['x']
    localRoomRules.value = { '5': [{ from: 'a', to: 'b' }] }
    flushPendingWrites()

    const first = exportSettings()
    const firstParsed = JSON.parse(first) as Record<string, unknown>

    expect(firstParsed.__version).toBe(1)
    expect(firstParsed.aiEvasion).toBe(true)
    expect(firstParsed.maxLogLines).toBe(2222)
    expect(firstParsed.MsgTemplates).toEqual(['x'])
    expect(firstParsed.localRoomRules).toEqual({ '5': [{ from: 'a', to: 'b' }] })

    const result = importSettings(first)
    expect(result.ok).toBe(true)
    flushPendingWrites()

    const second = exportSettings()
    const secondParsed = JSON.parse(second) as Record<string, unknown>

    // Drop __exportedAt — it's a wall-clock timestamp and naturally differs.
    const { __exportedAt: _a, ...firstStable } = firstParsed
    const { __exportedAt: _b, ...secondStable } = secondParsed
    expect(secondStable).toEqual(firstStable)
  })

  test('numeric out-of-range value on import is REJECTED, not clamped (contract probe)', () => {
    // Audit's stated expectation was clamping on import. Actual implementation:
    // `isValidImportedValue` runs the numericGmSignal validator (val >= min &&
    // val <= max) BEFORE applyImportedSettings, so an out-of-range value is
    // skipped outright and the runtime clamp setter is never reached.
    //
    // This test pins the *actual* behavior so a future refactor (e.g.
    // "clamp instead of reject" rolling forward, which would be a friendlier
    // recovery for hand-edited backups) trips this assertion intentionally.
    maxLogLines.value = 1000

    const json = JSON.stringify({ __version: 1, maxLogLines: 999_999_999 })
    const result = importSettings(json)

    expect(result.ok).toBe(true)
    expect(result.count).toBe(0)
    expect(result.skipped).toEqual(['maxLogLines'])
    expect(maxLogLines.value).toBe(1000)
  })
})
