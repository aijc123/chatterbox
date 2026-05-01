import { beforeEach, describe, expect, mock, test } from 'bun:test'

const writes: Array<{ key: string; value: unknown }> = []
const store = new Map<string, unknown>()

mock.module('$', () => ({
  GM_getValue: <T>(key: string, defaultValue: T): T => (store.has(key) ? (store.get(key) as T) : defaultValue),
  GM_setValue: (key: string, value: unknown) => {
    writes.push({ key, value })
    store.set(key, value)
  },
}))

const { gmSignal } = await import('../src/lib/gm-signal')

function getWritesForKey(key: string) {
  return writes.filter(entry => entry.key === key)
}

describe('gmSignal persistence', () => {
  beforeEach(() => {
    writes.length = 0
    store.clear()
  })

  test('does not write the initial value back immediately', async () => {
    const key = 'initial-skip'
    gmSignal(key, 42)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(getWritesForKey(key)).toHaveLength(0)
  })

  test('debounces rapid writes into one GM_setValue call', async () => {
    const key = 'debounced-write'
    const value = gmSignal(key, 1)
    value.value = 2
    value.value = 3
    value.value = 4

    await new Promise(resolve => setTimeout(resolve, 40))
    expect(getWritesForKey(key)).toHaveLength(0)

    await new Promise(resolve => setTimeout(resolve, 180))
    expect(getWritesForKey(key)).toEqual([{ key, value: 4 }])
  })
})
