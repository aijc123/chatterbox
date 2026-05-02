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

const { importSettings } = await import('../src/lib/backup')
const { isValidImportedValue } = await import('../src/lib/gm-signal')
const { msgSendInterval, randomColor, msgTemplates } = await import('../src/lib/store')

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
})
