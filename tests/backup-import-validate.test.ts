// Regression tests for the H-sec audit fix: `importSettings` previously wrote
// any value type for whitelisted keys, so a malformed backup could corrupt
// runtime state (e.g. msgSendInterval = "5" -> NaN * 1000) and the
// __version field was never enforced.

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

const { exportSettings, importSettings } = await import('../src/lib/backup')
const { flushPendingWrites, isValidImportedValue } = await import('../src/lib/gm-signal')
const { msgSendInterval, randomColor, msgTemplates } = await import('../src/lib/store')
const { autoBlendUserBlacklist, autoBlendCooldownAuto, autoBlendAvoidRepeat, lastAppliedPresetBaseline } = await import(
  '../src/lib/store-auto-blend'
)

describe('isValidImportedValue', () => {
  test('accepts values matching the in-memory typeof', () => {
    expect(isValidImportedValue('msgSendInterval', 5)).toBe(true)
    expect(isValidImportedValue('randomColor', true)).toBe(true)
    expect(isValidImportedValue('MsgTemplates', ['hello'])).toBe(true)
  })

  test('rejects mismatched primitives', () => {
    expect(isValidImportedValue('msgSendInterval', '5')).toBe(false)
    expect(isValidImportedValue('msgSendInterval', null)).toBe(false)
    expect(isValidImportedValue('randomColor', 'true')).toBe(false)
  })

  test('distinguishes arrays from objects', () => {
    expect(isValidImportedValue('MsgTemplates', { 0: 'a' })).toBe(false)
    expect(isValidImportedValue('MsgTemplates', null)).toBe(false)
  })

  test('returns false for unknown keys', () => {
    expect(isValidImportedValue('not-a-real-key', 42)).toBe(false)
  })
})

describe('importSettings', () => {
  beforeEach(() => {
    gmStore.clear()
    msgSendInterval.value = 1
    randomColor.value = false
    msgTemplates.value = []
  })

  test('rejects backups with an unknown future __version', () => {
    const json = JSON.stringify({ __version: 999, msgSendInterval: 7 })
    const result = importSettings(json)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('999')
    expect(msgSendInterval.value).toBe(1)
  })

  test('drops keys whose imported value fails validation', () => {
    const json = JSON.stringify({
      __version: 1,
      msgSendInterval: '5', // wrong type — should be ignored
      randomColor: true, // valid — should apply
    })
    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(1)
    expect(msgSendInterval.value).toBe(1) // untouched
    expect(randomColor.value).toBe(true)
  })

  test('accepts well-formed backups', () => {
    const json = JSON.stringify({
      __version: 1,
      msgSendInterval: 7,
      MsgTemplates: ['hello', 'world'],
    })
    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(2)
    expect(msgSendInterval.value).toBe(7)
    expect(msgTemplates.value).toEqual(['hello', 'world'])
  })

  test('rejects malformed JSON', () => {
    const result = importSettings('not json')
    expect(result.ok).toBe(false)
    expect(result.count).toBe(0)
  })

  test('rejects non-object roots', () => {
    expect(importSettings('[]').ok).toBe(false)
    expect(importSettings('null').ok).toBe(false)
    expect(importSettings('"string"').ok).toBe(false)
  })

  // Audit A12: pre-fix, malformed JSON returned a flat "无效的 JSON 格式".
  // The user couldn't tell which line of a hand-edited backup was wrong.
  // Post-fix, the parser's diagnostic is included verbatim so the settings
  // panel can show "Unexpected token } at position 47".
  test('error message for malformed JSON includes the parser diagnostic (audit A12)', () => {
    const result = importSettings('{ "msgSendInterval": 5 ,,, }')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('无效的 JSON 格式')
    // The parser's own message is appended after a colon; the exact text
    // varies by engine (Bun, Node, browsers) so we only require that
    // *something* meaningful follows the prefix.
    expect(result.error?.length).toBeGreaterThan('无效的 JSON 格式：'.length)
  })

  test('reports skipped keys (failed validation) so UI can surface them (audit A12)', () => {
    const json = JSON.stringify({
      __version: 1,
      msgSendInterval: '5', // wrong type — skipped
      randomColor: 'yes', // wrong type — skipped
      MsgTemplates: ['ok'], // valid — applied
    })
    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.count).toBe(1)
    expect(result.skipped).toEqual(expect.arrayContaining(['msgSendInterval', 'randomColor']))
    expect(result.skipped?.length).toBe(2)
  })

  test('reports unknown keys (not on EXPORT_KEYS allowlist)', () => {
    const json = JSON.stringify({
      __version: 1,
      randomColor: true, // valid
      anUnknownKey: 'whatever',
      anotherStrayKey: 42,
    })
    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.unknownKeys).toEqual(expect.arrayContaining(['anUnknownKey', 'anotherStrayKey']))
    expect(result.unknownKeys?.length).toBe(2)
  })

  test('omits skipped/unknownKeys when none were rejected', () => {
    const json = JSON.stringify({
      __version: 1,
      msgSendInterval: 7,
    })
    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.skipped).toBeUndefined()
    expect(result.unknownKeys).toBeUndefined()
  })

  // Round-trip the auto-blend signals that were missing from EXPORT_KEYS until
  // recently — exporting and re-importing should restore them, not silently
  // drop them on the floor.
  test('round-trips newly-allowlisted auto-blend gmSignal keys', () => {
    autoBlendUserBlacklist.value = { '12345': 'spammer', '67890': 'bot' }
    autoBlendCooldownAuto.value = true
    // gm-signal skips writes when next value equals last-persisted value
    // (avoiding noop GM writes). The test value here happens to equal the
    // signal's runtime default, so toggle through the opposite first to
    // guarantee a schedulePersist actually fires and the key lands in gmStore.
    autoBlendAvoidRepeat.value = false
    autoBlendAvoidRepeat.value = true
    lastAppliedPresetBaseline.value = 'hot'
    // gmSignal writes are debounced 150ms; force-persist before exporting
    // so exportSettings (which reads from GM storage) sees the new values.
    flushPendingWrites()

    const json = exportSettings()

    autoBlendUserBlacklist.value = {}
    autoBlendCooldownAuto.value = false
    autoBlendAvoidRepeat.value = false
    lastAppliedPresetBaseline.value = 'normal'

    const result = importSettings(json)
    expect(result.ok).toBe(true)
    expect(result.skipped).toBeUndefined()
    expect(autoBlendUserBlacklist.value).toEqual({ '12345': 'spammer', '67890': 'bot' })
    expect(autoBlendCooldownAuto.value).toBe(true)
    expect(autoBlendAvoidRepeat.value).toBe(true)
    expect(lastAppliedPresetBaseline.value).toBe('hot')
  })
})
