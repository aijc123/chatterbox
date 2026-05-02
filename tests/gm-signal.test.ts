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

  // Regression: M-fix. Pre-fix, only `beforeunload` was wired up. Mobile
  // browsers and bfcache transitions don't fire beforeunload reliably, so
  // pending writes were lost when the tab was backgrounded or closed. We
  // verify the underlying `flushPendingWrites` (which all three listeners
  // ultimately call) drains the debounce window synchronously.
  test('flushPendingWrites synchronously persists outstanding writes', async () => {
    const { flushPendingWrites } = await import('../src/lib/gm-signal')
    const key = 'flush-test'
    const value = gmSignal(key, 0)
    value.value = 99
    expect(getWritesForKey(key)).toHaveLength(0)
    flushPendingWrites()
    expect(getWritesForKey(key)).toEqual([{ key, value: 99 }])
  })

  test('the source wires pagehide and visibilitychange listeners (not just beforeunload)', async () => {
    // Lock in the contract so a refactor that drops one of the events would
    // fail this test instead of silently losing data on mobile bfcache.
    const src = await Bun.file(`${import.meta.dir}/../src/lib/gm-signal.ts`).text()
    expect(src).toContain('beforeunload')
    expect(src).toContain('pagehide')
    expect(src).toContain('visibilitychange')
  })
})

describe('isValidImportedValue (gm-signal validator)', () => {
  test('coarse typeof check passes for matching types and rejects mismatches', async () => {
    const { isValidImportedValue } = await import('../src/lib/gm-signal')
    gmSignal('typecheck-num', 5)
    gmSignal('typecheck-bool', false)
    gmSignal('typecheck-arr', [1, 2])

    expect(isValidImportedValue('typecheck-num', 9)).toBe(true)
    expect(isValidImportedValue('typecheck-num', '9')).toBe(false)
    expect(isValidImportedValue('typecheck-bool', true)).toBe(true)
    expect(isValidImportedValue('typecheck-bool', 1)).toBe(false)
    expect(isValidImportedValue('typecheck-arr', [3])).toBe(true)
    expect(isValidImportedValue('typecheck-arr', { 0: 1 })).toBe(false)
    expect(isValidImportedValue('not-registered', 0)).toBe(false)
  })

  test('custom validate option overrides the typeof check', async () => {
    const { isValidImportedValue } = await import('../src/lib/gm-signal')
    gmSignal('strict-positive', 5, {
      validate: (val): val is number => typeof val === 'number' && val > 0,
    })
    expect(isValidImportedValue('strict-positive', 7)).toBe(true)
    expect(isValidImportedValue('strict-positive', -1)).toBe(false)
    expect(isValidImportedValue('strict-positive', 'x')).toBe(false)
  })
})
