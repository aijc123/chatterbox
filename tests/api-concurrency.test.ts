// Regression test for the C3 audit fix: anchor lookups previously ran
// sequentially with no per-request timeout, so a slow Bilibili response could
// stall the settings UI indefinitely. The fix runs them through
// `mapWithConcurrency` (capped at 6 in the call site) and wraps each fetch
// with an AbortController timeout.
//
// Imports from `concurrency.ts` directly rather than `api.ts` so that test
// isolation across files (e.g. other suites that stub `globalThis.XMLHttpRequest`
// for WBI hijack) doesn't poison the shared module cache before this file
// loads. CI's bun test ordering surfaced that pollution; the local order
// happened not to.

import { describe, expect, test } from 'bun:test'

import { mapWithConcurrency } from '../src/lib/concurrency'

describe('mapWithConcurrency', () => {
  test('processes every item exactly once and preserves order', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const seen: number[] = []
    const results = await mapWithConcurrency(items, 3, async n => {
      seen.push(n)
      await new Promise(r => setTimeout(r, n))
      return n * 10
    })
    expect(results).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(seen.sort((a, b) => a - b)).toEqual(items)
  })

  test('honors the concurrency cap', async () => {
    let inFlight = 0
    let peak = 0
    const items = Array.from({ length: 20 }, (_, i) => i)
    await mapWithConcurrency(items, 4, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise(r => setTimeout(r, 5))
      inFlight--
      return null
    })
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThan(0)
  })

  test('handles empty input', async () => {
    expect(await mapWithConcurrency([], 5, async () => null)).toEqual([])
  })

  test('limit greater than item count uses item count as worker pool', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 100, async n => n + 1)
    expect(result).toEqual([2, 3, 4])
  })
})
