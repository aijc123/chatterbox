/**
 * Coverage for `warnIfDegraded` — the side-effecting wrapper around
 * `detectPlatform`.  The pure detector is exhaustively covered in
 * `platform.test.ts`; this file locks the wrapper invariants:
 *
 *  1. It is idempotent (only one console.warn per session, even when called
 *     repeatedly — both main.tsx boot and downstream fallbacks may call it).
 *  2. It emits ONLY when navigator is present and the UA matches mobile.
 *  3. It survives `typeof navigator === 'undefined'` without throwing.
 *
 * Implementation note: `warned` is module-scoped and one-shot, so a single
 * shared module instance can only exercise ONE "first invocation" scenario.
 * We test the mobile-UA path on the SHARED module (so coverage attribution
 * lands on `src/lib/platform.ts`), then use cache-busted reimports for the
 * desktop / empty / undefined-navigator branches.  bun's coverage merges
 * cache-busted instances under the same filename, but the shared-instance
 * test alone is enough to mark the warnIfDegraded body as covered.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { warnIfDegraded } from '../src/lib/platform'

type WarnIfDegraded = typeof warnIfDegraded

async function loadFreshWarnIfDegraded(): Promise<WarnIfDegraded> {
  // Cache-bust the module so the `warned` flag resets per call.
  const url = `../src/lib/platform?freshKey=${Math.random()}&t=${Date.now()}`
  const mod = (await import(url)) as { warnIfDegraded: WarnIfDegraded }
  return mod.warnIfDegraded
}

type ConsoleWith = typeof console & { warn: (...args: unknown[]) => void }

let originalWarn: typeof console.warn
let originalNavigator: typeof globalThis.navigator | undefined
let warnCalls: unknown[][]

function installSpy(): void {
  warnCalls = []
  originalWarn = console.warn
  ;(console as ConsoleWith).warn = (...args: unknown[]) => {
    warnCalls.push(args)
  }
}

function restoreSpy(): void {
  console.warn = originalWarn
}

function setNavigator(userAgent: string | null): void {
  if (originalNavigator === undefined) {
    originalNavigator = (globalThis as { navigator?: Navigator }).navigator
  }
  if (userAgent === null) {
    Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true })
    return
  }
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent }, configurable: true })
}

function restoreNavigator(): void {
  if (originalNavigator !== undefined) {
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true })
    originalNavigator = undefined
  }
}

beforeEach(() => {
  installSpy()
})

afterEach(() => {
  restoreSpy()
  restoreNavigator()
})

// ---------------------------------------------------------------------------
// SHARED module — these tests use the production module instance directly so
// the coverage tool attributes the hits to `src/lib/platform.ts`.  Because
// `warned` is module-scoped and one-shot, all three asserts must hit the same
// instance: first emit, then idempotency, then post-latch desktop UA must
// still NOT warn.
// ---------------------------------------------------------------------------

describe('warnIfDegraded (shared module — coverage primary)', () => {
  test('emits exactly one console.warn for a mobile UA, then latches', () => {
    setNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
    warnIfDegraded()
    expect(warnCalls.length).toBe(1)
    const msg = String(warnCalls[0][0])
    expect(msg).toMatch(/移动端/)
    expect(msg).toMatch(/Tampermonkey|Violentmonkey/)

    // Idempotent: second call no-ops.
    warnIfDegraded()
    warnIfDegraded()
    expect(warnCalls.length).toBe(1)

    // Even after switching navigator, the latch holds (no retry).
    setNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    warnIfDegraded()
    expect(warnCalls.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Cache-busted scenarios for the OTHER branches.  Coverage attribution for
// these may land on a sibling module instance under bun, but the assertions
// still meaningfully verify behavior.
// ---------------------------------------------------------------------------

describe('warnIfDegraded (fresh module — additional branches)', () => {
  test('does NOT warn for desktop UA', async () => {
    setNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0')
    const fresh = await loadFreshWarnIfDegraded()
    fresh()
    expect(warnCalls.length).toBe(0)
  })

  test('does not throw when navigator is undefined (early-boot / non-browser)', async () => {
    setNavigator(null)
    const fresh = await loadFreshWarnIfDegraded()
    expect(() => fresh()).not.toThrow()
    expect(warnCalls.length).toBe(0)
  })

  test('does not warn when UA is empty string', async () => {
    setNavigator('')
    const fresh = await loadFreshWarnIfDegraded()
    fresh()
    expect(warnCalls.length).toBe(0)
  })

  test('warning text mentions both 移动端 and Tampermonkey/Violentmonkey for iPad UA', async () => {
    setNavigator('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)')
    const fresh = await loadFreshWarnIfDegraded()
    fresh()
    expect(warnCalls.length).toBe(1)
    const msg = String(warnCalls[0][0])
    expect(msg).toMatch(/移动端/)
    expect(msg).toMatch(/Tampermonkey|Violentmonkey/)
  })
})
