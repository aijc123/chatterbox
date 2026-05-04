/**
 * C3: WS reconnect / close-event / visibilitychange recovery coverage.
 *
 * `recent-danmaku-key.test.ts` already covers `computeReconnectDelay`,
 * `parseAuthUid`, and `recentKey`. This file fills in the remaining helpers:
 *   - `formatCloseDetail` — used by every WS reconnect log line; needs to
 *     render code/clean/reason consistently across browser quirks (some
 *     browsers stuff a non-string into `event.reason`).
 *   - `shouldForceImmediateReconnect` — the FSM behind the
 *     `visibilitychange` recovery (audit B4). Pre-fix, mobile browsers and
 *     bfcache could indefinitely throttle the backoff timer; the fix only
 *     fires a fresh connect when (visible && started && !healthy).
 *
 * Pure helpers — no module-level side effects, no DOM, no module mocks.
 */

import { describe, expect, test } from 'bun:test'

import { formatCloseDetail, shouldForceImmediateReconnect } from '../src/lib/live-ws-helpers'

describe('formatCloseDetail', () => {
  test('renders code, wasClean, and reason when present', () => {
    const out = formatCloseDetail({ code: 1006, wasClean: false, reason: 'abnormal' })
    expect(out).toBe('code=1006, clean=false, reason=abnormal')
  })

  test('omits the reason segment when it is the empty string (no trailing comma)', () => {
    const out = formatCloseDetail({ code: 1000, wasClean: true, reason: '' })
    expect(out).toBe('code=1000, clean=true')
    expect(out).not.toContain('reason=')
  })

  test('preserves the reason verbatim — no escaping or truncation', () => {
    const out = formatCloseDetail({
      code: 4001,
      wasClean: false,
      reason: 'auth failed: bad token',
    })
    expect(out).toBe('code=4001, clean=false, reason=auth failed: bad token')
  })
})

describe('shouldForceImmediateReconnect (audit B4: visibilitychange recovery)', () => {
  test('fires only when visible AND started AND not healthy', () => {
    expect(shouldForceImmediateReconnect({ visibilityState: 'visible', started: true, connectionHealthy: false })).toBe(
      true
    )
  })

  test('skips when the page is hidden (typical bfcache / minimized tab)', () => {
    expect(shouldForceImmediateReconnect({ visibilityState: 'hidden', started: true, connectionHealthy: false })).toBe(
      false
    )
  })

  test("skips when the connection is healthy (don't thrash a working WS)", () => {
    expect(shouldForceImmediateReconnect({ visibilityState: 'visible', started: true, connectionHealthy: true })).toBe(
      false
    )
  })

  test('skips when the source is not started (user clicked stop)', () => {
    expect(
      shouldForceImmediateReconnect({ visibilityState: 'visible', started: false, connectionHealthy: false })
    ).toBe(false)
  })

  test('treats non-standard visibilityStates (e.g. "prerender") as not-visible', () => {
    expect(
      shouldForceImmediateReconnect({ visibilityState: 'prerender', started: true, connectionHealthy: false })
    ).toBe(false)
    // Future-proofing: if browsers ever ship a new state we don't know about,
    // we should NOT fire a reconnect; the cost of a missed reconnect is
    // recoverable, the cost of thrashing the WS isn't.
    expect(
      shouldForceImmediateReconnect({
        visibilityState: 'unknown-future-state',
        started: true,
        connectionHealthy: false,
      })
    ).toBe(false)
  })

  test('all-3-conditions truth table covers every gate independently', () => {
    // 8 combinations; only the (visible, started, !healthy) row should fire.
    const cases: Array<[boolean, boolean, boolean, boolean]> = [
      // visible? started? healthy?  expected
      [false, false, false, false],
      [false, false, true, false],
      [false, true, false, false],
      [false, true, true, false],
      [true, false, false, false],
      [true, false, true, false],
      [true, true, false, true],
      [true, true, true, false],
    ]
    for (const [visible, started, healthy, expected] of cases) {
      const result = shouldForceImmediateReconnect({
        visibilityState: visible ? 'visible' : 'hidden',
        started,
        connectionHealthy: healthy,
      })
      expect(result).toBe(expected)
    }
  })
})
