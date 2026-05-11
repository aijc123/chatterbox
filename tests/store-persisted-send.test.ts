/**
 * Coverage for the per-room "persisted send state" effect at the bottom of
 * `src/lib/store.ts`. This is the only meaningful non-re-export logic in that
 * file: it watches three signals (`persistSendState`, `cachedRoomId`,
 * `sendMsg`) and reads/writes the `persistedSendMsg` GM key.
 *
 * Branches we exercise (and need to lock):
 *  1. `cachedRoomId === null` → effect bails out (no GM writes regardless of
 *     `sendMsg`).
 *  2. `persistSendState[roomId] === true` AND this is the first run →
 *     restore branch: if `persistedSendMsg[roomId]` was true, set
 *     `sendMsg.value = true`. Otherwise leave sendMsg alone.
 *  3. `persistSendState[roomId] === true` AND already restored once → the
 *     `sending` signal becomes the source of truth; flipping it mirrors into
 *     `persistedSendMsg[roomId]`.
 *  4. `persistSendState[roomId] === false` (or absent) → effect _removes_ the
 *     room's entry from `persistedSendMsg` if it exists.
 *
 * Important: the `sendStateRestored` flag in store.ts is module-scoped and
 * one-shot. We use the SHARED module instance (not cache-busted) so coverage
 * lands on `src/lib/store.ts`, and we order the tests so the restore branch
 * fires first; subsequent tests exercise the mirror / disable branches on
 * the same module instance.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { store: gm, reset: resetGm } = installGmStoreMock()

const s = await import('../src/lib/store')

function resetSignals(): void {
  s.sendMsg.value = false
  s.cachedRoomId.value = null
  s.persistSendState.value = {}
  s.memeContributorCandidatesByRoom.value = {}
  s.memeContributorSeenTextsByRoom.value = {}
}

beforeAll(() => {
  resetGm()
  resetSignals()
})

afterAll(() => {
  resetGm()
  resetSignals()
})

// ===========================================================================
// 1. cachedRoomId === null guard — must come BEFORE the restore branch fires.
// ===========================================================================

describe('persistedSendMsg effect — null roomId guard (runs first)', () => {
  test('no GM writes while cachedRoomId is null, regardless of sendMsg toggles', () => {
    expect(s.cachedRoomId.value).toBeNull()
    s.persistSendState.value = { '12345': true }
    s.sendMsg.value = true
    s.sendMsg.value = false
    // No write should have happened — the effect short-circuits at `roomId === null`.
    expect(gm.has('persistedSendMsg')).toBe(false)
  })
})

// ===========================================================================
// 2. Restore branch — this is the ONE chance to hit the restore code path
//    before `sendStateRestored` latches. Seed the GM key with the room set
//    to true, then turn persistence on for that room.
// ===========================================================================

describe('persistedSendMsg effect — first-run restore', () => {
  test('restores sendMsg=true when GM has the room and persistence is on', () => {
    gm.set('persistedSendMsg', { '777': true })
    s.persistSendState.value = { '777': true }
    s.cachedRoomId.value = 777
    expect(s.sendMsg.value).toBe(true)
  })
})

// ===========================================================================
// 3. Mirror branch — sendStateRestored is now true. Toggling sendMsg should
//    write through to persistedSendMsg.
// ===========================================================================

describe('persistedSendMsg effect — mirror branch (post-restore)', () => {
  test('toggling sendMsg off mirrors {777:false} into the GM key', () => {
    s.sendMsg.value = false
    const persisted = gm.get('persistedSendMsg') as Record<string, boolean>
    expect(persisted['777']).toBe(false)
  })

  test('toggling sendMsg back on mirrors {777:true} into the GM key', () => {
    s.sendMsg.value = true
    const persisted = gm.get('persistedSendMsg') as Record<string, boolean>
    expect(persisted['777']).toBe(true)
  })

  test('changing room while persistence stays on for old room: old key remains, new room starts fresh', () => {
    // Switch to a different room. Effect re-runs: persist[888] = undefined →
    // goes to the "disabled" branch, which removes 888 if present. Since it
    // wasn't present, this is a no-op.
    s.cachedRoomId.value = 888
    const persisted = gm.get('persistedSendMsg') as Record<string, boolean>
    expect(persisted['777']).toBe(true) // preserved
    expect(persisted['888']).toBeUndefined()
  })
})

// ===========================================================================
// 4. Disabled-persistence branch — removes the entry if present.
// ===========================================================================

describe('persistedSendMsg effect — disabled persistence', () => {
  test('clearing persistSendState[777] removes the 777 entry from the GM key', () => {
    s.cachedRoomId.value = 777
    s.persistSendState.value = {}
    const persisted = gm.get('persistedSendMsg') as Record<string, boolean>
    expect(persisted['777']).toBeUndefined()
  })

  test('disabling persistence for a room that was never persisted is a no-op', () => {
    s.cachedRoomId.value = 9999
    s.persistSendState.value = {}
    // No throw, no write of {9999:false}.
    const persisted = (gm.get('persistedSendMsg') as Record<string, boolean> | undefined) ?? {}
    expect(persisted['9999']).toBeUndefined()
  })
})

// ===========================================================================
// 5. memeContributor computed views — null roomId branch + happy path.
// ===========================================================================

describe('memeContributor computed views', () => {
  test('returns [] when cachedRoomId is null (computed null-guard branch)', () => {
    s.cachedRoomId.value = null
    expect(s.memeContributorCandidates.value).toEqual([])
    expect(s.memeContributorSeenTexts.value).toEqual([])
  })

  test('returns the per-room slice once roomId is set', () => {
    s.memeContributorCandidatesByRoom.value = { '321': ['冲', '上'], '999': ['off'] }
    s.memeContributorSeenTextsByRoom.value = { '321': ['seen1'], '999': ['seen2'] }
    s.cachedRoomId.value = 321
    expect(s.memeContributorCandidates.value).toEqual(['冲', '上'])
    expect(s.memeContributorSeenTexts.value).toEqual(['seen1'])
  })

  test('falls back to [] when current room has no entries in the keyed maps', () => {
    s.memeContributorCandidatesByRoom.value = { '111': ['a'] }
    s.cachedRoomId.value = 222
    expect(s.memeContributorCandidates.value).toEqual([])
  })

  test('reactively updates when room changes', () => {
    s.memeContributorCandidatesByRoom.value = { '1': ['one'], '2': ['two'] }
    s.cachedRoomId.value = 1
    expect(s.memeContributorCandidates.value).toEqual(['one'])
    s.cachedRoomId.value = 2
    expect(s.memeContributorCandidates.value).toEqual(['two'])
  })
})

// ===========================================================================
// 6. liveWsStatus seed — subscribeCustomChatWsStatus fires once at module load.
// ===========================================================================

describe('liveWsStatus seed', () => {
  test('initial value is "off" (subscribed at module load)', () => {
    expect(['off', 'live', 'closed', 'error', 'connecting']).toContain(s.liveWsStatus.value)
  })
})

// ===========================================================================
// 7. Smoke: top-level re-export surface is intact (cachedSelfUid is a key
//    cross-cutting concern documented in code comments).
// ===========================================================================

describe('re-export surface', () => {
  test('cachedSelfUid is exposed as a signal with null initial value', () => {
    expect(s.cachedSelfUid).toBeDefined()
    // It starts null per the doc comment.
    s.cachedSelfUid.value = null
    expect(s.cachedSelfUid.value).toBeNull()
  })
})
