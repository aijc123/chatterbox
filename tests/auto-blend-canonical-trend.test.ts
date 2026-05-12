// 场景 A 集成测试：auto-blend trendMap 使用 chatfilter canonical 作 key。
//
// 验证：
//   - chatfilter 默认 (chatfilterEnabled=true, chatfilterAffectAutoBlendTrend=true)
//     时，同义弹幕（"niubi"/"NB"/"nb"）合并为同一个 trendMap 条目。
//   - 关闭 chatfilterAffectAutoBlendTrend 后，行为退回原状（raw 作 key，不合并）。
//   - "12345" 被 chatfilter preprocess 丢弃 → 不进 trendMap。
//   - "上车" 这种非字典词原样保留，不影响。
//
// 注：trendMap 内部不直接暴露 key 列表，只暴露 size。所以测试用 size 判定"合并"。

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGm } = installGmStoreMock()

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const { _recordDanmakuForTests, _getTrendMapSizeForTests, _resetAutoBlendStateForTests } = await import(
  '../src/lib/auto-blend'
)

const {
  autoBlendEnabled,
  autoBlendMessageBlacklist,
  autoBlendUserBlacklist,
  cachedEmoticonPackages,
  chatfilterAffectAutoBlendTrend,
  chatfilterEnabled,
} = await import('../src/lib/store')

const { _resetNormalizeDefaultsForTests } = await import('../src/lib/chatfilter')

describe('chatfilter 场景 A：auto-blend trendMap 使用 canonical', () => {
  beforeEach(() => {
    resetGm()
    _resetAutoBlendStateForTests()
    _resetNormalizeDefaultsForTests()
    autoBlendEnabled.value = true
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    cachedEmoticonPackages.value = []
    chatfilterEnabled.value = true
    chatfilterAffectAutoBlendTrend.value = true
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    _resetAutoBlendStateForTests()
    _resetNormalizeDefaultsForTests()
  })

  test('同义变体合并为同一 trend (niubi / NB / nb / 牛批 → 牛逼)', () => {
    _recordDanmakuForTests('niubi', 'u-1', false)
    _recordDanmakuForTests('NB', 'u-2', false)
    _recordDanmakuForTests('nb', 'u-3', false)
    _recordDanmakuForTests('牛批', 'u-4', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('"哈哈哈"/"hhhh"/"蛤蛤蛤"/"红红火火..." 全部合并为一条 (canonical "哈")', () => {
    _recordDanmakuForTests('哈哈哈', 'u-1', false)
    _recordDanmakuForTests('hhhh', 'u-2', false)
    _recordDanmakuForTests('蛤蛤蛤', 'u-3', false)
    _recordDanmakuForTests('红红火火恍恍惚惚', 'u-4', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('循环节压缩：连续重复合并 ("加油加油加油" 与 "加油" 等同)', () => {
    _recordDanmakuForTests('加油', 'u-1', false)
    _recordDanmakuForTests('加油加油加油', 'u-2', false)
    _recordDanmakuForTests('加油加油加油加油', 'u-3', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('chatfilter preprocess 丢弃的（>4 位纯数字）不入 trendMap', () => {
    _recordDanmakuForTests('12345', 'u-1', false)
    _recordDanmakuForTests('99999', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('非字典词、不可压缩 → 原文进 trendMap', () => {
    _recordDanmakuForTests('上车了', 'u-1', false)
    _recordDanmakuForTests('上车了', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('两个不同 canonical 仍是两条 trend', () => {
    _recordDanmakuForTests('niubi', 'u-1', false)
    _recordDanmakuForTests('卧槽', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(2)
  })

  test('chatfilterAffectAutoBlendTrend=false 时退回 raw 行为 (变体各算一条)', () => {
    chatfilterAffectAutoBlendTrend.value = false
    _recordDanmakuForTests('niubi', 'u-1', false)
    _recordDanmakuForTests('NB', 'u-2', false)
    _recordDanmakuForTests('nb', 'u-3', false)
    expect(_getTrendMapSizeForTests()).toBe(3) // 三条独立 trend
  })

  test('chatfilterEnabled=false 时退回 raw 行为', () => {
    chatfilterEnabled.value = false
    _recordDanmakuForTests('niubi', 'u-1', false)
    _recordDanmakuForTests('NB', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(2)
  })

  test('黑名单仍然按 raw 文本拦截（不被 chatfilter 影响）', () => {
    // 用户把 raw "niubi" 拉黑 → 不进 trendMap，即使 chatfilter 想归一到 "牛逼"
    autoBlendMessageBlacklist.value = { niubi: true }
    _recordDanmakuForTests('niubi', 'u-1', false)
    _recordDanmakuForTests('niubi', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(0)

    // 但 raw 不在黑名单的同义变体 ("NB") 仍能进 trendMap
    _recordDanmakuForTests('NB', 'u-3', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })
})
