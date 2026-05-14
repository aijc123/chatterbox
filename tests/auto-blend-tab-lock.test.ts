/**
 * Regression tests for the cross-tab mutex added in v2.13.11.
 *
 * The production module talks to `navigator.locks` directly; here we
 * monkey-patch a fake `locks` implementation onto globalThis.navigator before
 * each test so we can observe the call sequence and force "lock unavailable"
 * outcomes without spinning a second tab.
 *
 * Why no `installGmStoreMock`: auto-blend-tab-lock does NOT read any GM
 * signals. It is a pure navigator.locks shim.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

type LockCallback = (lock: unknown | null) => Promise<void> | void

interface FakeLockRequest {
  name: string
  options: { ifAvailable: boolean }
  callback: LockCallback
}

interface FakeLocks {
  request: (name: string, options: { ifAvailable: boolean }, callback: LockCallback) => Promise<unknown>
}

const { tryAcquireAutoBlendLock, releaseAutoBlendLock, _resetAutoBlendLockForTests } = await import(
  '../src/lib/auto-blend-tab-lock'
)

/**
 * Each test reaches into the navigator stub installed in beforeEach. The
 * stub records every request and exposes hooks to control whether the
 * callback receives `null` (lock taken by another tab) or a fake lock token.
 */
let recordedRequests: FakeLockRequest[]
let nextLockAvailable: boolean
let originalNavigator: PropertyDescriptor | undefined

function installFakeLocks(): FakeLocks {
  recordedRequests = []
  nextLockAvailable = true

  const fakeLocks: FakeLocks = {
    request: (name, options, callback) => {
      recordedRequests.push({ name, options, callback })
      if (!nextLockAvailable) {
        // Mirror real browser: ifAvailable + unavailable → callback(null) and
        // the outer promise resolves with whatever callback returns.
        const result = callback(null)
        return Promise.resolve(result)
      }
      // Lock granted. Hand back a stub object as the "lock" token. The real
      // module wraps the callback in a never-resolving Promise to keep the
      // lock held; tests don't await that outer promise.
      const result = callback({ name, mode: 'exclusive' })
      return Promise.resolve(result)
    },
  }

  // Reset module-level releaser between tests, otherwise a previous test's
  // releaser leaks across the suite.
  _resetAutoBlendLockForTests()

  originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    value: { locks: fakeLocks },
    configurable: true,
    writable: true,
  })

  return fakeLocks
}

function uninstallNavigator(): void {
  if (originalNavigator) {
    Object.defineProperty(globalThis, 'navigator', originalNavigator)
  } else {
    // No prior navigator (bun's default): delete the temporary stub so the
    // next test gets a clean "navigator undefined" world if it wants one.
    delete (globalThis as { navigator?: unknown }).navigator
  }
  originalNavigator = undefined
}

describe('tryAcquireAutoBlendLock', () => {
  beforeEach(() => {
    installFakeLocks()
  })

  afterEach(() => {
    _resetAutoBlendLockForTests()
    uninstallNavigator()
  })

  test('returns true and records request with ifAvailable=true when lock is available', async () => {
    const ok = await tryAcquireAutoBlendLock(12345)
    expect(ok).toBe(true)
    expect(recordedRequests.length).toBe(1)
    expect(recordedRequests[0].name).toBe('chatterbox-autoblend-room-12345')
    expect(recordedRequests[0].options.ifAvailable).toBe(true)
  })

  test('returns false when the lock is taken by another tab (callback gets null)', async () => {
    nextLockAvailable = false
    const ok = await tryAcquireAutoBlendLock(12345)
    expect(ok).toBe(false)
    // releaseAutoBlendLock should be a no-op now — we never held the lock.
    expect(() => releaseAutoBlendLock()).not.toThrow()
  })

  test('is idempotent for the same room: second acquire returns true without re-requesting', async () => {
    expect(await tryAcquireAutoBlendLock(12345)).toBe(true)
    expect(recordedRequests.length).toBe(1)

    expect(await tryAcquireAutoBlendLock(12345)).toBe(true)
    // Same room → fast-path, no extra navigator.locks.request call.
    expect(recordedRequests.length).toBe(1)
  })

  test('switching rooms releases the old lock and requests the new name', async () => {
    expect(await tryAcquireAutoBlendLock(11111)).toBe(true)
    expect(await tryAcquireAutoBlendLock(22222)).toBe(true)

    expect(recordedRequests.length).toBe(2)
    expect(recordedRequests[0].name).toBe('chatterbox-autoblend-room-11111')
    expect(recordedRequests[1].name).toBe('chatterbox-autoblend-room-22222')
  })

  test('returns true (fallback) when navigator.locks is absent — pre-mutex behavior', async () => {
    // Tear down the fake locks; leave navigator without `.locks`.
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    })
    _resetAutoBlendLockForTests()

    const ok = await tryAcquireAutoBlendLock(99999)
    expect(ok).toBe(true)
  })

  test('returns true (fallback) when navigator.locks.request is missing or not a function', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { locks: { request: 'nope' } },
      configurable: true,
      writable: true,
    })
    _resetAutoBlendLockForTests()

    const ok = await tryAcquireAutoBlendLock(99999)
    expect(ok).toBe(true)
  })
})

describe('releaseAutoBlendLock', () => {
  beforeEach(() => {
    installFakeLocks()
  })

  afterEach(() => {
    _resetAutoBlendLockForTests()
    uninstallNavigator()
  })

  test('no-op when no lock is held', () => {
    // Fresh state — never acquired.
    expect(() => releaseAutoBlendLock()).not.toThrow()
  })

  test('safe to call multiple times after a single acquire', async () => {
    await tryAcquireAutoBlendLock(42)
    releaseAutoBlendLock()
    expect(() => releaseAutoBlendLock()).not.toThrow()
    expect(() => releaseAutoBlendLock()).not.toThrow()
  })

  test('after release, re-acquiring the same room records a fresh navigator.locks request', async () => {
    await tryAcquireAutoBlendLock(42)
    expect(recordedRequests.length).toBe(1)

    releaseAutoBlendLock()

    await tryAcquireAutoBlendLock(42)
    // Re-acquire path → goes through navigator.locks.request again because
    // currentLockName was cleared by the releaser.
    expect(recordedRequests.length).toBe(2)
  })
})
