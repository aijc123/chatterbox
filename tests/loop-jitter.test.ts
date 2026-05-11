/**
 * Defends `computeJitteredSleepMs` against the boundary failures called out in
 * the QA audit (A2):
 *   - jitter > base interval ⇒ negative ms ⇒ setTimeout fires synchronously,
 *     turning the auto-loop into a tight spin.
 *   - corrupted GM storage / hand-edited backup leaves `msgSendInterval` as
 *     NaN/Infinity/non-positive ⇒ `interval * 1000` propagates the bad value
 *     into `abortableSleep`.
 *
 * The helper is pure and side-effect-free, so we can test it directly without
 * spinning up the full loop module.
 */

import { describe, expect, test } from 'bun:test'

// Imported from `loop-utils` (not `loop.ts`) so this test stays free of the
// heavy transitive graph (api.ts, send-queue.ts, wbi.ts IIFE, etc.) and
// doesn't depend on which `mock.module('$', ...)` happens to be active.
import { computeJitteredSleepMs } from '../src/lib/loop-utils'

describe('computeJitteredSleepMs', () => {
  test('returns intervalSec*1000 when jitter is disabled', () => {
    expect(computeJitteredSleepMs(1, false)).toBe(1000)
    expect(computeJitteredSleepMs(0.5, false)).toBe(500)
  })

  test('subtracts up to 500ms of jitter when enabled, never going below 0', () => {
    // 100 trials: every result must be in [interval*1000 - 500, interval*1000].
    const interval = 2
    const baseMs = interval * 1000
    for (let i = 0; i < 100; i++) {
      const ms = computeJitteredSleepMs(interval, true)
      expect(ms).toBeGreaterThanOrEqual(0)
      expect(ms).toBeLessThanOrEqual(baseMs)
      expect(ms).toBeGreaterThanOrEqual(baseMs - 500)
    }
  })

  test('clamps at 0 when jitter would exceed base interval (regression A2)', () => {
    // intervalSec=0.1 ⇒ baseMs=100, but jitter goes up to 500. Without the
    // `Math.max(0, …)` guard, this would produce negative ms and turn the
    // auto-loop into a tight spin.
    for (let i = 0; i < 100; i++) {
      const ms = computeJitteredSleepMs(0.1, true)
      expect(ms).toBeGreaterThanOrEqual(0)
      expect(ms).toBeLessThanOrEqual(100)
    }
  })

  test('falls back to a 1s floor when intervalSec is non-finite or non-positive', () => {
    // These are the three ways a corrupted gmSignal could land here.
    expect(computeJitteredSleepMs(Number.NaN, false)).toBe(1000)
    expect(computeJitteredSleepMs(Number.POSITIVE_INFINITY, false)).toBe(1000)
    expect(computeJitteredSleepMs(-5, false)).toBe(1000)
    expect(computeJitteredSleepMs(0, false)).toBe(1000)
  })

  test('with deterministic random=0.5, jitter is exactly 250ms (locks `* 500` constant)', () => {
    // Mutation-test trap: `Math.random() * 500` mutated to `Math.random() / 500`
    // collapses jitter to 0 (random()/500 ∈ [0, 0.002), floored to 0). Both
    // shapes still produce a non-negative ms in [0, baseMs], so the existing
    // statistical assertions can't tell them apart. Stub random and lock
    // the exact subtraction.
    const realRandom = Math.random
    Math.random = () => 0.5
    try {
      // baseMs=1000, jitter=floor(0.5*500)=250 → 750
      expect(computeJitteredSleepMs(1, true)).toBe(750)
      // baseMs=2000, jitter=floor(0.5*500)=250 → 1750
      expect(computeJitteredSleepMs(2, true)).toBe(1750)
    } finally {
      Math.random = realRandom
    }
  })

  test('with random=0.999, jitter is 499ms (locks `Math.floor`)', () => {
    const realRandom = Math.random
    Math.random = () => 0.999
    try {
      // baseMs=1000, jitter=floor(0.999*500)=floor(499.5)=499 → 501
      expect(computeJitteredSleepMs(1, true)).toBe(501)
    } finally {
      Math.random = realRandom
    }
  })

  test('never returns NaN or non-finite values regardless of jitter flag', () => {
    const inputs: Array<[number, boolean]> = [
      [Number.NaN, true],
      [Number.NaN, false],
      [Number.POSITIVE_INFINITY, true],
      [Number.NEGATIVE_INFINITY, true],
      [-1, true],
      [0, true],
      [0.05, true],
    ]
    for (const [interval, jitter] of inputs) {
      const ms = computeJitteredSleepMs(interval, jitter)
      expect(Number.isFinite(ms)).toBe(true)
      expect(ms).toBeGreaterThanOrEqual(0)
    }
  })
})
