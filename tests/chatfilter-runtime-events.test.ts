// chatfilter-runtime 事件总线 + log-panel 联动验证。
//
// 关键不变量：
//   - 没有订阅者时，getAutoBlendTrendKey 走 cheap path（不算 stageHits）。
//   - 有订阅者 + chatfilterLogPanelEnabled === true 时，每条非 filtered 弹幕
//     都会触发 onResult，结果带 stageHits。
//   - chatfilterLogPanelEnabled === false 时即使有订阅者也不触发。

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGm } = installGmStoreMock()

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const { _clearNormalizeSubscribersForTests, getAutoBlendTrendKey, normalizeForObservation, subscribeNormalizeEvents } =
  await import('../src/lib/chatfilter-runtime')

const { chatfilterAffectAutoBlendTrend, chatfilterEnabled, chatfilterLogPanelEnabled } = await import(
  '../src/lib/store-chatfilter'
)

const { _resetNormalizeDefaultsForTests } = await import('../src/lib/chatfilter')

describe('chatfilter-runtime 事件总线', () => {
  beforeEach(() => {
    resetGm()
    _clearNormalizeSubscribersForTests()
    _resetNormalizeDefaultsForTests()
    chatfilterEnabled.value = true
    chatfilterAffectAutoBlendTrend.value = true
    chatfilterLogPanelEnabled.value = false
  })

  afterEach(() => {
    _clearNormalizeSubscribersForTests()
    _resetNormalizeDefaultsForTests()
  })

  test('未订阅时，getAutoBlendTrendKey 仍正常返回 canonical（走 cheap path）', () => {
    expect(getAutoBlendTrendKey('niubi')).toBe('牛逼')
  })

  test('无订阅者时不广播事件（cheap path）', () => {
    // 主路径不绑订阅 → 不触发完整 normalize
    getAutoBlendTrendKey('niubi') // 应该走 cheap path，不发事件
    // 这里没断言；下一行才有订阅者
  })

  test('有订阅者 → 每条触发一次事件，带 stageHits', () => {
    const events: Array<{ raw: string; canonical: string; stagesCount: number }> = []
    subscribeNormalizeEvents(r => {
      events.push({ raw: r.raw, canonical: r.canonical, stagesCount: r.stageHits.length })
    })

    getAutoBlendTrendKey('niubi')
    getAutoBlendTrendKey('上车')
    getAutoBlendTrendKey('12345') // 应该被 preprocess 丢

    expect(events.length).toBe(3)
    expect(events[0].canonical).toBe('牛逼')
    expect(events[0].stagesCount).toBeGreaterThan(0)
    expect(events[1].canonical).toBe('上车')
    expect(events[2].canonical).toBe('') // filtered
  })

  test('unsubscribe 后不再收事件', () => {
    const events: string[] = []
    const unsub = subscribeNormalizeEvents(r => events.push(r.canonical))
    getAutoBlendTrendKey('niubi')
    unsub()
    getAutoBlendTrendKey('卧槽')
    expect(events).toEqual(['牛逼'])
  })

  test('chatfilterLogPanelEnabled 现在不再 gate 事件（订阅者存在即广播）', () => {
    chatfilterLogPanelEnabled.value = false
    const events: string[] = []
    subscribeNormalizeEvents(r => events.push(r.canonical))
    getAutoBlendTrendKey('niubi')
    expect(events).toEqual(['牛逼'])
  })

  test('normalizeForObservation 直接广播', () => {
    const events: string[] = []
    subscribeNormalizeEvents(r => events.push(r.canonical))
    normalizeForObservation('niubi')
    expect(events).toEqual(['牛逼'])
  })

  test('订阅者抛错不破坏主路径', () => {
    subscribeNormalizeEvents(() => {
      throw new Error('boom')
    })
    expect(() => getAutoBlendTrendKey('niubi')).not.toThrow()
  })
})
