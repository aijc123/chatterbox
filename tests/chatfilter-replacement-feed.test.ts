// 场景 C：replacement-feed 候选规则学习。
//
// 验证：
//   - chatfilterFeedReplacementLearn 关时 → 不累计
//   - cachedRoomId 为 null → 不累计
//   - 同 (variant, canonical) 在同房间命中 ≥ 10 次 → 出现在 replacementFeedCandidates
//   - adopt → 写入 localRoomRules + 从候选移除
//   - dismiss → 从候选移除（不写规则）
//   - 不同 roomId 独立计数

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGm } = installGmStoreMock()

const {
  _resetReplacementFeedForTests,
  adoptReplacementCandidate,
  dismissReplacementCandidate,
  replacementFeedCandidates,
  startReplacementFeed,
  stopReplacementFeed,
} = await import('../src/lib/chatfilter-replacement-feed')

const { normalizeForObservation } = await import('../src/lib/chatfilter-runtime')

const { cachedRoomId, chatfilterFeedReplacementLearn, localRoomRules } = await import('../src/lib/store')

const { _resetNormalizeDefaultsForTests } = await import('../src/lib/chatfilter')

function feedTimes(text: string, n: number): void {
  for (let i = 0; i < n; i++) normalizeForObservation(text)
}

describe('chatfilter 场景 C：replacement-feed', () => {
  beforeEach(() => {
    resetGm()
    _resetReplacementFeedForTests()
    _resetNormalizeDefaultsForTests()
    chatfilterFeedReplacementLearn.value = true
    cachedRoomId.value = 12345
    localRoomRules.value = {}
    startReplacementFeed()
  })

  afterEach(() => {
    stopReplacementFeed()
    _resetReplacementFeedForTests()
    _resetNormalizeDefaultsForTests()
    chatfilterFeedReplacementLearn.value = false
    cachedRoomId.value = null
  })

  test('feature 关 → 不累计', () => {
    chatfilterFeedReplacementLearn.value = false
    feedTimes('niubi', 20)
    expect(replacementFeedCandidates.value).toEqual([])
  })

  test('roomId 为 null → 不累计', () => {
    cachedRoomId.value = null
    feedTimes('niubi', 20)
    expect(replacementFeedCandidates.value).toEqual([])
  })

  test('单 alias hit 不到 10 次 → 不进候选列表', () => {
    feedTimes('niubi', 9)
    expect(replacementFeedCandidates.value).toEqual([])
  })

  test('单 alias hit 达 10 次 → 进候选列表', () => {
    feedTimes('niubi', 10)
    expect(replacementFeedCandidates.value.length).toBe(1)
    const c = replacementFeedCandidates.value[0]
    expect(c.variant).toBe('niubi')
    expect(c.canonical).toBe('牛逼')
    expect(c.count).toBe(10)
  })

  test('多个 alias 一行命中（"卧槽 niubi"）也算两条记录', () => {
    // 这条文本里 "niubi" 是 hit，"卧槽" 是 canonical 自映射不算 hit。
    feedTimes('卧槽 niubi', 10)
    const variants = replacementFeedCandidates.value.map(c => c.variant).sort()
    expect(variants).toEqual(['niubi'])
  })

  test('adopt → 写入 localRoomRules，候选清空', () => {
    feedTimes('niubi', 10)
    const c = replacementFeedCandidates.value[0]
    adoptReplacementCandidate(c)
    expect(replacementFeedCandidates.value).toEqual([])
    const rules = localRoomRules.value['12345']
    expect(rules?.length).toBe(1)
    expect(rules?.[0]).toEqual({ from: 'niubi', to: '牛逼' })
  })

  test('adopt 二次：相同规则不重复写入', () => {
    localRoomRules.value = { '12345': [{ from: 'niubi', to: '牛逼' }] }
    feedTimes('niubi', 10)
    const c = replacementFeedCandidates.value[0]
    adoptReplacementCandidate(c)
    expect(localRoomRules.value['12345']?.length).toBe(1)
  })

  test('dismiss → 候选移除，不写入', () => {
    feedTimes('niubi', 10)
    const c = replacementFeedCandidates.value[0]
    dismissReplacementCandidate(c)
    expect(replacementFeedCandidates.value).toEqual([])
    expect(localRoomRules.value).toEqual({})
  })

  test('不同 roomId 独立计数', () => {
    feedTimes('niubi', 9)
    cachedRoomId.value = 67890
    feedTimes('niubi', 9)
    // 总和 18，但单房间都 < 10
    expect(replacementFeedCandidates.value).toEqual([])
    feedTimes('niubi', 1) // room 67890 达到 10
    expect(replacementFeedCandidates.value.length).toBe(1)
    expect(replacementFeedCandidates.value[0].roomId).toBe('67890')
  })
})
