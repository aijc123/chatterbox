// 场景 B：Custom Chat 折叠用 chatfilter canonical 作 cardKey。
//
// 不便启动完整 custom-chat-dom（依赖 DOM、虚拟列表、WS 等），所以这里测
// chatfilter-runtime 暴露给 cardKey 的 helper `getCustomChatFoldCanonical`。
//
// 验证：
//   - 总开关关 → 返回 null（cardKey 回落到 wheelFoldKey）
//   - 场景 B 关 → 返回 null
//   - 都开 → 返回 canonical（"niubi"/"NB" 都 → "牛逼"）
//   - filtered（>4 位纯数字）→ 返回 null

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGm } = installGmStoreMock()

const { getCustomChatFoldCanonical } = await import('../src/lib/chatfilter-runtime')

const { chatfilterAffectCustomChatFold, chatfilterEnabled } = await import('../src/lib/store-chatfilter')

const { _resetNormalizeDefaultsForTests } = await import('../src/lib/chatfilter')

describe('chatfilter 场景 B：custom chat fold canonical', () => {
  beforeEach(() => {
    resetGm()
    _resetNormalizeDefaultsForTests()
    chatfilterEnabled.value = true
    chatfilterAffectCustomChatFold.value = false
  })

  afterEach(() => {
    _resetNormalizeDefaultsForTests()
  })

  test('总开关关 → null', () => {
    chatfilterEnabled.value = false
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('niubi')).toBeNull()
  })

  test('场景 B 关（默认）→ null（让 cardKey 回落 wheelFoldKey）', () => {
    expect(getCustomChatFoldCanonical('niubi')).toBeNull()
  })

  test('都开 → 同义变体合并为 canonical', () => {
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('niubi')).toBe('牛逼')
    expect(getCustomChatFoldCanonical('NB')).toBe('牛逼')
    expect(getCustomChatFoldCanonical('牛批')).toBe('牛逼')
  })

  test('哈哈哈 / hhhh / 蛤蛤蛤 → canonical "哈"', () => {
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('哈哈哈')).toBe('哈')
    expect(getCustomChatFoldCanonical('hhhh')).toBe('哈')
    expect(getCustomChatFoldCanonical('蛤蛤蛤')).toBe('哈')
  })

  test('preprocess 丢弃的（>4 位纯数字）→ null', () => {
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('12345')).toBeNull()
  })

  test('未在字典里的文本 → 原文（不变）', () => {
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('上车了')).toBe('上车了')
  })

  test('空串 → null', () => {
    chatfilterAffectCustomChatFold.value = true
    expect(getCustomChatFoldCanonical('')).toBeNull()
    expect(getCustomChatFoldCanonical('   ')).toBeNull()
  })
})
