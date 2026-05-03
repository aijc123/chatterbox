import { beforeEach, describe, expect, mock, test } from 'bun:test'

// Replace the default `$` mock from setup.ts with a real in-memory backing store
// so gmSignal persistence behaviour is observable.
const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_info: { script: { version: 'test' } },
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
  unsafeWindow: globalThis,
}))

// Stub Date.now so we can drive the 10-minute recurrence threshold deterministically.
const realDateNow = Date.now
let clock = 0
Date.now = () => clock

// Dynamic imports so the modules read from the mocked `$` above.
const {
  cachedRoomId,
  enableMemeContribution,
  memeContributorCandidates,
  memeContributorCandidatesByRoom,
  memeContributorSeenTexts,
  memeContributorSeenTextsByRoom,
} = await import('../src/lib/store')

const { currentMemesList } = await import('../src/lib/store-meme')

const { clearMemeSession, ignoreMemeCandidate, recordMemeCandidate } = await import('../src/lib/meme-contributor')

function setClock(ms: number): void {
  clock = ms
}
function advance(ms: number): void {
  clock += ms
}

const ROOM_A = 1001
const ROOM_B = 1002
const TEN_MIN_MS = 10 * 60 * 1000

describe('meme-contributor per-room isolation', () => {
  beforeEach(() => {
    setClock(1_000_000_000_000)
    enableMemeContribution.value = true
    memeContributorCandidatesByRoom.value = {}
    memeContributorSeenTextsByRoom.value = {}
    // Reset module-internal session maps + per-hour quotas for the rooms used.
    clearMemeSession(ROOM_A)
    clearMemeSession(ROOM_B)
    cachedRoomId.value = null
    // Phase D: 默认空 library,大多数测试不需要"已在库"过滤介入。
    currentMemesList.value = []
  })

  test('candidate added in room A is not visible in room B', () => {
    recordMemeCandidate('上车冲鸭A', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭A', ROOM_A)

    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toContain('上车冲鸭A')
    expect(memeContributorCandidatesByRoom.value[String(ROOM_B)]).toBeUndefined()
  })

  test('session counter does not leak: a single trigger in A does not pre-qualify B', () => {
    recordMemeCandidate('上车冲鸭B', ROOM_A)
    advance(TEN_MIN_MS + 1000)

    // Single trigger in B should NOT qualify yet — B's own counter has only one entry.
    recordMemeCandidate('上车冲鸭B', ROOM_B)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_B)]).toBeUndefined()

    // B independently meets the 2-trigger + 10-min recurrence requirement.
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭B', ROOM_B)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_B)]).toContain('上车冲鸭B')

    // Meanwhile A never reached 2 triggers itself.
    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()
  })

  test('ignoreMemeCandidate only mutates the targeted room', () => {
    // Promote '上车冲鸭C' to candidate in room A.
    recordMemeCandidate('上车冲鸭C', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭C', ROOM_A)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toContain('上车冲鸭C')

    ignoreMemeCandidate('上车冲鸭C', ROOM_A)

    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)] ?? []).not.toContain('上车冲鸭C')
    expect(memeContributorSeenTextsByRoom.value[String(ROOM_A)]).toContain('上车冲鸭C')

    // Room B has no record of seeing '上车冲鸭C'.
    expect(memeContributorSeenTextsByRoom.value[String(ROOM_B)]).toBeUndefined()
  })

  test('seen-list does not block other rooms from nominating the same text', () => {
    // Promote then ignore in A → '上车冲鸭D' is on A's seen list.
    recordMemeCandidate('上车冲鸭D', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭D', ROOM_A)
    ignoreMemeCandidate('上车冲鸭D', ROOM_A)
    expect(memeContributorSeenTextsByRoom.value[String(ROOM_A)]).toContain('上车冲鸭D')

    // B should still be able to nominate '上车冲鸭D' on its own merits.
    recordMemeCandidate('上车冲鸭D', ROOM_B)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭D', ROOM_B)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_B)]).toContain('上车冲鸭D')
  })

  test('clearMemeSession only clears the targeted room', () => {
    // Both rooms accumulate one trigger each for '上车冲鸭E'.
    recordMemeCandidate('上车冲鸭E', ROOM_A)
    recordMemeCandidate('上车冲鸭E', ROOM_B)

    clearMemeSession(ROOM_A)
    advance(TEN_MIN_MS + 1000)

    // Room A's session was reset → fresh single trigger, not yet a candidate.
    recordMemeCandidate('上车冲鸭E', ROOM_A)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()

    // Room B retained its first trigger → second one (now ~10min later) qualifies.
    recordMemeCandidate('上车冲鸭E', ROOM_B)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_B)]).toContain('上车冲鸭E')
  })

  test('memeContributorCandidates computed reflects only the current room', () => {
    recordMemeCandidate('上车冲鸭F', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭F', ROOM_A)

    cachedRoomId.value = ROOM_A
    expect(memeContributorCandidates.value).toContain('上车冲鸭F')

    cachedRoomId.value = ROOM_B
    expect(memeContributorCandidates.value).toEqual([])

    cachedRoomId.value = null
    expect(memeContributorCandidates.value).toEqual([])
  })

  test('memeContributorSeenTexts computed reflects only the current room', () => {
    recordMemeCandidate('上车冲鸭G', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭G', ROOM_A)
    ignoreMemeCandidate('上车冲鸭G', ROOM_A)

    cachedRoomId.value = ROOM_A
    expect(memeContributorSeenTexts.value).toContain('上车冲鸭G')

    cachedRoomId.value = ROOM_B
    expect(memeContributorSeenTexts.value).toEqual([])
  })

  // Phase D: "已在库自动跳过" —— 当前烂梗库已包含某条文本(经规整后等同),
  // 候选挖掘不应该再把它加入 candidates,而是直接放进 seen,避免重复打扰。
  describe('skip-if-already-in-library (Phase D)', () => {
    function fakeMeme(content: string): { content: string; id: number } {
      // currentMemesList 元素只需要 .content 字段被读取,其它字段不影响测试逻辑。
      return { content, id: 1 } as never
    }

    test('candidate that exactly matches an existing library entry is skipped', () => {
      currentMemesList.value = [fakeMeme('已在库的梗')] as never
      recordMemeCandidate('已在库的梗', ROOM_A)
      advance(TEN_MIN_MS + 1000)
      recordMemeCandidate('已在库的梗', ROOM_A)

      expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()
      expect(memeContributorSeenTextsByRoom.value[String(ROOM_A)]).toContain('已在库的梗')
    })

    test('matches across whitespace / case / zero-width differences', () => {
      currentMemesList.value = [fakeMeme('Hello World')] as never
      recordMemeCandidate('  hello   world  ', ROOM_A)
      advance(TEN_MIN_MS + 1000)
      recordMemeCandidate('  hello   world  ', ROOM_A)

      expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()
      expect(memeContributorSeenTextsByRoom.value[String(ROOM_A)]).toContain('  hello   world  ')
    })

    test('candidate not in library still goes through normal flow', () => {
      currentMemesList.value = [fakeMeme('完全无关的另一条')] as never
      recordMemeCandidate('真正的新梗AAA', ROOM_A)
      advance(TEN_MIN_MS + 1000)
      recordMemeCandidate('真正的新梗AAA', ROOM_A)

      expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toContain('真正的新梗AAA')
    })

    test('empty library list is treated as "no filter active"', () => {
      currentMemesList.value = []
      recordMemeCandidate('库还没载完时的梗', ROOM_A)
      advance(TEN_MIN_MS + 1000)
      recordMemeCandidate('库还没载完时的梗', ROOM_A)

      expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toContain('库还没载完时的梗')
    })
  })

  test('record is a no-op when enableMemeContribution is off', () => {
    enableMemeContribution.value = false
    recordMemeCandidate('上车冲鸭H', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('上车冲鸭H', ROOM_A)
    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()
  })

  test('quality filter rejects too-short, too-long, and pure-numeric text', () => {
    // Short
    recordMemeCandidate('短', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('短', ROOM_A)
    // Pure digits
    recordMemeCandidate('123456', ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate('123456', ROOM_A)
    // Way too long (>30 chars)
    const long = '一'.repeat(40)
    recordMemeCandidate(long, ROOM_A)
    advance(TEN_MIN_MS + 1000)
    recordMemeCandidate(long, ROOM_A)

    expect(memeContributorCandidatesByRoom.value[String(ROOM_A)]).toBeUndefined()
  })

  test('persisted GM key is the new memeSessionMapByRoom shape, not the legacy global key', () => {
    recordMemeCandidate('上车冲鸭I', ROOM_A)

    const persisted = gmStore.get('memeSessionMapByRoom') as Record<string, Record<string, number[]>> | undefined
    expect(persisted).toBeDefined()
    expect(persisted?.[String(ROOM_A)]?.上车冲鸭I).toBeDefined()
    expect(persisted?.[String(ROOM_A)]?.上车冲鸭I?.length).toBe(1)

    // The legacy unscoped key must not be touched by the new path.
    expect(gmStore.has('memeSessionMap')).toBe(false)
  })
})

// Restore Date.now once tests are done so unrelated tests aren't affected.
process.on('beforeExit', () => {
  Date.now = realDateNow
})
