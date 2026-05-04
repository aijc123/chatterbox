import { beforeEach, describe, expect, mock, test } from 'bun:test'

const store = new Map<string, unknown>()

mock.module('$', () => ({
  GM_deleteValue: (key: string) => {
    store.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (store.has(key) ? (store.get(key) as T) : defaultValue),
  GM_setValue: (key: string, value: unknown) => {
    store.set(key, value)
  },
}))

const { appendLogQuiet, debugLogVisible, logLines } = await import('../src/lib/log')

beforeEach(() => {
  logLines.value = []
  debugLogVisible.value = false
})

describe('debugLogVisible toggle (P2 #13)', () => {
  test('appendLogQuiet writes the line unprefixed when debug mode is off', () => {
    appendLogQuiet('quiet thing happened')
    const last = logLines.value.at(-1) ?? ''
    expect(last).toContain('quiet thing happened')
    expect(last).not.toContain('🔍')
  })

  test('appendLogQuiet prefixes the line with 🔍 when debug mode is on', () => {
    debugLogVisible.value = true
    appendLogQuiet('verbose trace')
    const last = logLines.value.at(-1) ?? ''
    expect(last).toContain('🔍 verbose trace')
  })

  test('toggling debug mode at runtime affects subsequent calls only', () => {
    appendLogQuiet('before')
    debugLogVisible.value = true
    appendLogQuiet('after')
    debugLogVisible.value = false
    appendLogQuiet('after-off')
    const lines = logLines.value
    expect(lines.at(-3)).toContain('before')
    expect(lines.at(-3)).not.toContain('🔍')
    expect(lines.at(-2)).toContain('🔍 after')
    expect(lines.at(-1)).toContain('after-off')
    expect(lines.at(-1)).not.toContain('🔍')
  })
})
