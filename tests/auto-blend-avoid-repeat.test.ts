// Unit tests for the autoBlendAvoidRepeat port: when on, recordDanmaku must
// drop new danmaku that exactly match the last text we auto-sent so a
// stuck-in-loop room can't immediately re-fire on the same trend after
// cooldown ends.
//
// The drop happens BEFORE counter updates / candidate-text emission, but
// AFTER the CPM tracking push — CPM is "room activity", not "trigger-eligible
// activity". Both invariants are exercised here.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const {
  _recordDanmakuForTests,
  _setLastAutoSentTextForTests,
  _getTrendMapSizeForTests,
  _getCpmWindowSizeForTests,
  _resetAutoBlendStateForTests,
} = await import('../src/lib/auto-blend')

const { autoBlendAvoidRepeat, autoBlendEnabled } = await import('../src/lib/store')

describe('autoBlendAvoidRepeat', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
    autoBlendEnabled.value = true
    autoBlendAvoidRepeat.value = false
    // 注：`autoBlendIncludeReply` 已废除，@ 回复永久不入候选。这些测试都用
    // `isReply=false` 的非回复弹幕，所以行为没变化。
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    autoBlendAvoidRepeat.value = false
    _resetAutoBlendStateForTests()
  })

  test('blocks exact match when avoidRepeat is on and lastAutoSentText is set', () => {
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('上车', 'user-1', false)

    // 没进 trendMap (被 avoidRepeat 拦下)。
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('still tracks CPM even when avoidRepeat blocks the message', () => {
    // CPM 是房间整体活跃度,不应该被 avoidRepeat 抹掉——否则被屏蔽的消息
    // 越多,我们对房间速率的估计就越偏低,自适应冷却会被推得过长。
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('上车', 'user-1', false)
    _recordDanmakuForTests('上车', 'user-2', false)
    _recordDanmakuForTests('上车', 'user-3', false)

    expect(_getTrendMapSizeForTests()).toBe(0)
    expect(_getCpmWindowSizeForTests()).toBe(3)
  })

  test('passes non-matching text through normally', () => {
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('666', 'user-1', false)
    _recordDanmakuForTests('冲', 'user-2', false)

    // 两条不同的句子都该计入 trendMap。
    expect(_getTrendMapSizeForTests()).toBe(2)
  })

  test('lets exact match through when avoidRepeat is off (opt-in feature)', () => {
    autoBlendAvoidRepeat.value = false
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('上车', 'user-1', false)

    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('lets exact match through when lastAutoSentText is null (no prior auto-send)', () => {
    // 刚启动还没发过任何东西时,lastAutoSentText=null,这时不该屏蔽任何
    // 弹幕——否则第一波就被吞了。
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests(null)

    _recordDanmakuForTests('上车', 'user-1', false)

    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('matches against trimmed text, not raw input', () => {
    // recordDanmaku 内部对原文 trim,trendMap 用 trimmed 后的版本作为 key。
    // lastAutoSentText 也存 trimmed 的版本(triggerSend 里写入的 originalText
    // 来自 trendMap 的 key)。所以"  上车  "应该被识别成"上车"并被屏蔽。
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('  上车  ', 'user-1', false)

    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('treats whitespace-different text as different (CJK ASCII no-op)', () => {
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('上 车', 'user-1', false)

    // 中间多了空格 → 不匹配 → 进 trendMap。
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('ignores avoidRepeat entirely when autoBlendEnabled is off', () => {
    // recordDanmaku 第一行就早退,后面任何分支都不会执行。
    autoBlendEnabled.value = false
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')

    _recordDanmakuForTests('上车', 'user-1', false)

    expect(_getTrendMapSizeForTests()).toBe(0)
    // 关掉总开关时连 CPM 也不该跟踪。
    expect(_getCpmWindowSizeForTests()).toBe(0)
  })

  test('reset clears lastAutoSentText so next session starts fresh', () => {
    autoBlendAvoidRepeat.value = true
    _setLastAutoSentTextForTests('上车')
    _resetAutoBlendStateForTests()

    autoBlendEnabled.value = true
    // 重置后 lastAutoSentText=null,所以"上车"应该正常计数。
    _recordDanmakuForTests('上车', 'user-1', false)

    expect(_getTrendMapSizeForTests()).toBe(1)
  })
})
