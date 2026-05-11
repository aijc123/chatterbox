/**
 * Regression for the legacy-key migration IIFE at the top of
 * `src/lib/store-replacement.ts`:
 *
 *   replacementRules (legacy flat array) → localGlobalRules (current key)
 *
 * The migration is one-shot and runs at module load. We exercise its three
 * branches by seeding the shared GM-store BEFORE importing the module:
 *
 *   A. Legacy key present, current key empty   → migrate + delete legacy.
 *   B. Legacy key present, current key already populated → only delete legacy
 *      (don't clobber the user's newer config).
 *   C. Legacy key absent → no-op (nothing to do).
 *
 * Per `tests/_gm-store.ts`, we use `installGmStoreMock` so the GM-store is
 * actually backed by a Map; otherwise the migration's read returns the
 * default `[]` and nothing measurable happens.
 *
 * To get three independent module loads (one per branch) we use random query
 * suffixes — Bun caches by URL. `localGlobalRules` is the persisted signal we
 * inspect after each load.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { store, reset } = installGmStoreMock()

// Seed the legacy key BEFORE the shared module instance loads, so the IIFE's
// migration branch runs once on coverage-attributed code. The state after
// the IIFE: `replacementRules` is deleted, `localGlobalRules` is populated.
const SEED_LEGACY = [
  { from: 'INITIAL_BAD', to: 'INITIAL_GOOD' },
  { from: 'foo', to: 'bar' },
]
store.set('replacementRules', SEED_LEGACY)

// Shared module — loads the IIFE exactly once with the seed in place.
const sharedMod = await import('../src/lib/store-replacement')

beforeEach(() => {
  reset()
})

afterEach(() => {
  reset()
})

async function loadFreshStoreReplacement(): Promise<typeof import('../src/lib/store-replacement')> {
  // Random suffix → fresh module instance so the migration IIFE runs again
  // with whatever the test seeded into the GM store this turn.
  const url = `../src/lib/store-replacement?freshKey=${Math.random()}&t=${Date.now()}`
  return (await import(url)) as typeof import('../src/lib/store-replacement')
}

// ===========================================================================
// Shared-module assertions (run FIRST, attribute to src/lib/store-replacement)
// ===========================================================================

describe('store-replacement migration IIFE (shared module, A: legacy → current)', () => {
  // Capture the post-migration signal value BEFORE beforeEach resets the GM store.
  // The signal is set at module load by `gmSignal('localGlobalRules', [])`
  // reading the GM key after the IIFE wrote it; we lock that snapshot here.
  const sharedSignalSnapshot = sharedMod.localGlobalRules.value

  test('legacy replacementRules migration ran at module load: signal snapshot reflects migrated data', () => {
    // beforeEach has reset() the GM store by now, but the signal value is
    // already captured. The migration happened.
    expect(sharedSignalSnapshot).toEqual(SEED_LEGACY)
    expect(sharedSignalSnapshot.length).toBeGreaterThan(0)
  })
})

describe('store-replacement migration IIFE (cache-busted — additional branches)', () => {
  test('B: does NOT clobber existing localGlobalRules but still deletes legacy key', async () => {
    const legacy = [{ from: 'OLD', to: 'NEW' }]
    const current = [{ from: 'KEEP', to: 'ME' }]
    store.set('replacementRules', legacy)
    store.set('localGlobalRules', current)

    await loadFreshStoreReplacement()

    // Legacy is gone (the user has confirmed they're on the new schema).
    expect(store.has('replacementRules')).toBe(false)
    // But the existing user-curated current value is intact.
    expect(store.get('localGlobalRules')).toEqual(current)
  })

  test('C: no-op when legacy key is absent (fresh install or already migrated)', async () => {
    // Nothing seeded — typical for a fresh Tampermonkey install.
    const mod = await loadFreshStoreReplacement()

    expect(store.has('replacementRules')).toBe(false)
    // localGlobalRules default is [] per `gmSignal('localGlobalRules', [])`.
    expect(mod.localGlobalRules.value).toEqual([])
    // GM key not written either — first-write happens only on user mutation.
    expect(store.has('localGlobalRules')).toBe(false)
  })

  test('D: empty legacy array (length 0) is treated as no-op (not a migration trigger)', async () => {
    store.set('replacementRules', [])
    await loadFreshStoreReplacement()
    // The IIFE's guard is `old.length > 0`, so an empty legacy array should
    // not invoke deleteValue.  We assert the empty legacy was left in place —
    // a future tightening might also clear it, but locking the current
    // contract here prevents a silent regression.
    expect(store.has('replacementRules')).toBe(true)
    expect(store.get('localGlobalRules')).toBeUndefined()
  })
})

describe('store-replacement signal surface', () => {
  test('exports localRoomRules, remoteKeywords, remoteKeywordsLastSync, replacementMap', async () => {
    const mod = await loadFreshStoreReplacement()
    // Defaults — locked here so a future refactor can't silently change the
    // initial value (which would mean stale GM data fails to load).
    expect(mod.localGlobalRules.value).toEqual([])
    expect(mod.localRoomRules.value).toEqual({})
    expect(mod.remoteKeywords.value).toBeNull()
    expect(mod.remoteKeywordsLastSync.value).toBeNull()
    expect(mod.replacementMap.value).toBeNull()
  })

  test('localRoomRules accepts per-room arrays keyed by room id', async () => {
    const mod = await loadFreshStoreReplacement()
    mod.localRoomRules.value = {
      '1713546334': [{ from: 'a', to: 'b' }],
      '999': [{ from: 'x', to: 'y' }],
    }
    expect(mod.localRoomRules.value['1713546334']?.[0]?.from).toBe('a')
  })

  test('replacementMap is a runtime-only signal (not persisted)', async () => {
    const mod = await loadFreshStoreReplacement()
    const m = new Map<string, string>([['a', 'b']])
    mod.replacementMap.value = m
    // No GM-store write should happen — pure `signal()` not `gmSignal()`.
    expect(store.has('replacementMap')).toBe(false)
  })
})
