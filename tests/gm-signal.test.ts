import { beforeEach, describe, expect, mock, test } from 'bun:test'

const writes: Array<{ key: string; value: unknown }> = []
const store = new Map<string, unknown>()

mock.module('$', () => ({
  GM_deleteValue: (key: string) => {
    store.delete(key)
  },
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

describe('gmSignal initial-value validation', () => {
  beforeEach(() => {
    writes.length = 0
    store.clear()
  })

  test('falls back to defaultValue when stored value fails validate', () => {
    store.set('initial-bad-num', 'abc')
    const s = gmSignal('initial-bad-num', 5, {
      validate: (val): val is number => typeof val === 'number' && Number.isFinite(val),
    })
    expect(s.value).toBe(5)
  })

  test('keeps stored value when it passes validate', () => {
    store.set('initial-good-num', 42)
    const s = gmSignal('initial-good-num', 5, {
      validate: (val): val is number => typeof val === 'number' && Number.isFinite(val),
    })
    expect(s.value).toBe(42)
  })

  test('keeps stored value when no validator is supplied (back-compat)', () => {
    store.set('initial-no-validator', 'still-loaded')
    const s = gmSignal<unknown>('initial-no-validator', 'default')
    expect(s.value).toBe('still-loaded')
  })
})

describe('numericGmSignal', () => {
  beforeEach(() => {
    writes.length = 0
    store.clear()
  })

  test('rejects non-numbers from storage and falls back to default', async () => {
    const { numericGmSignal } = await import('../src/lib/gm-signal')
    store.set('num-bad-string', 'oops')
    const s = numericGmSignal('num-bad-string', 7)
    expect(s.value).toBe(7)
  })

  test('rejects NaN and Infinity from storage', async () => {
    const { numericGmSignal } = await import('../src/lib/gm-signal')
    store.set('num-bad-nan', Number.NaN)
    expect(numericGmSignal('num-bad-nan', 7).value).toBe(7)
    store.set('num-bad-inf', Number.POSITIVE_INFINITY)
    expect(numericGmSignal('num-bad-inf', 7).value).toBe(7)
  })

  test('clamps with min/max — out-of-range stored value falls back to default', async () => {
    const { numericGmSignal } = await import('../src/lib/gm-signal')
    store.set('num-low', -999)
    expect(numericGmSignal('num-low', 1, { min: 0.1, max: 600 }).value).toBe(1)
    store.set('num-high', 1e9)
    expect(numericGmSignal('num-high', 1, { min: 0.1, max: 600 }).value).toBe(1)
  })

  test('integer:true rejects fractional stored values', async () => {
    const { numericGmSignal } = await import('../src/lib/gm-signal')
    store.set('num-frac', 1.5)
    expect(numericGmSignal('num-frac', 4, { integer: true }).value).toBe(4)
  })

  test('keeps in-range integer/float stored values intact', async () => {
    const { numericGmSignal } = await import('../src/lib/gm-signal')
    store.set('num-ok-int', 38)
    expect(numericGmSignal('num-ok-int', 1, { min: 1, max: 100, integer: true }).value).toBe(38)
    store.set('num-ok-float', 0.5)
    expect(numericGmSignal('num-ok-float', 1, { min: 0.1, max: 60 }).value).toBe(0.5)
  })

  describe('runtime-write clamping', () => {
    test('out-of-range writes are clamped to min/max instead of being accepted', async () => {
      const { numericGmSignal } = await import('../src/lib/gm-signal')
      const s = numericGmSignal('rt-clamp', 5, { min: 1, max: 10 })
      s.value = -7
      expect(s.value).toBe(1)
      s.value = 999
      expect(s.value).toBe(10)
      s.value = 4
      expect(s.value).toBe(4) // in-range value passes through
    })

    test('non-finite writes (NaN, Infinity, non-numbers) fall back to defaultValue', async () => {
      const { numericGmSignal } = await import('../src/lib/gm-signal')
      const s = numericGmSignal('rt-nonfinite', 7, { min: 1, max: 10 })
      s.value = Number.NaN
      expect(s.value).toBe(7)
      s.value = Number.POSITIVE_INFINITY
      expect(s.value).toBe(7)
      ;(s as { value: unknown }).value = 'oops'
      expect(s.value).toBe(7)
    })

    test('integer:true rounds fractional writes after clamping', async () => {
      const { numericGmSignal } = await import('../src/lib/gm-signal')
      const s = numericGmSignal('rt-int', 5, { min: 1, max: 10, integer: true })
      s.value = 3.4
      expect(s.value).toBe(3)
      s.value = 7.6
      expect(s.value).toBe(8)
      s.value = 99.9 // clamped to 10 first, already integer
      expect(s.value).toBe(10)
    })

    test('clamped writes still persist (debounced) the clamped value, not the raw input', async () => {
      const { numericGmSignal } = await import('../src/lib/gm-signal')
      const key = 'rt-clamp-persist'
      const s = numericGmSignal(key, 5, { min: 1, max: 10 })
      s.value = 999
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(getWritesForKey(key)).toEqual([{ key, value: 10 }])
    })
  })
})
