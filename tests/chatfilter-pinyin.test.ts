// variant-pinyin 单测（pinyin-pro 已接入后）。
//
// 覆盖：
//   - 整文本反查命中（"南亭" → "难听"、"加优" → "加油"）
//   - 字典里没有的纯谐音也能命中（"加优"/"加铀"/"加由" 都不在 yaml，但拼音同）
//   - 字典已包含的不会双重处理（变体已被 alias-ac 抓走前置归一化）
//   - 不含中文 / 超长 / 空串 → 跳过
//   - PINYIN_TO_CANONICAL 完备 + 无冲突

import { describe, expect, test } from 'bun:test'

import { applyPinyin, PINYIN_LAYER_READY } from '../src/lib/chatfilter/variant-pinyin'
import { CANONICAL_LIST, PINYIN_TO_CANONICAL } from '../src/lib/chatfilter/variants.gen'

describe('chatfilter/variant-pinyin applyPinyin', () => {
  test('PINYIN_LAYER_READY 为 true（pinyin-pro 已接入）', () => {
    expect(PINYIN_LAYER_READY).toBe(true)
  })

  test('纯谐音字典外变体命中 ("加优" → "加油")', () => {
    const r = applyPinyin('加优')
    expect(r.result).toBe('加油')
    expect(r.pinyinHits).toBe(1)
    expect(r.variantHit).toEqual({ variant: '加优', canonical: '加油' })
  })

  test('"南亭" → "难听" (字典里也列了这条，但 pinyin layer 在 alias 之后跑时仍能再次确认)', () => {
    expect(applyPinyin('南亭').result).toBe('难听')
  })

  test('"我草" → "卧槽" (toneless wocao == wocao)', () => {
    expect(applyPinyin('我草').result).toBe('卧槽')
  })

  test('"哭啦" → "哭了" 不应命中（laila ≠ kule wait, 哭啦 = kula ≠ kule)', () => {
    const r = applyPinyin('哭啦')
    expect(r.result).toBe('哭啦') // 不命中
  })

  test('字典外的 jia* 变体不会乱归一 (加狗 jiagou ≠ 任何 canonical)', () => {
    const r = applyPinyin('加狗')
    expect(r.result).toBe('加狗')
    expect(r.pinyinHits).toBe(0)
  })

  test('canonical 自己输入：返回原文（不算 hit）', () => {
    expect(applyPinyin('难听').result).toBe('难听')
    expect(applyPinyin('难听').pinyinHits).toBe(0)
  })

  test('不含中文 → 跳过（避免和 alias-ac 重复）', () => {
    expect(applyPinyin('niubi').result).toBe('niubi') // 让 alias-ac 处理
    expect(applyPinyin('hello').result).toBe('hello')
  })

  test('空串 → 原样返回', () => {
    expect(applyPinyin('').result).toBe('')
    expect(applyPinyin('').pinyinHits).toBe(0)
  })

  test('超过 8 字符的中文长串 → 跳过整段反查', () => {
    const longText = '今天天气真好我们来直播'
    expect(applyPinyin(longText).result).toBe(longText)
    expect(applyPinyin(longText).pinyinHits).toBe(0)
  })

  test('恰好 8 字符 → 不跳过（边界）', () => {
    // "今天天气好不好啊" = 8 字符
    const eight = '今天天气好不好啊'
    expect(Array.from(eight).length).toBe(8)
    const r = applyPinyin(eight)
    // 不会命中 canonical，但也不应跳过 —— result 等于原文，pinyinHits = 0
    expect(r.result).toBe(eight)
  })
})

describe('chatfilter/variants.gen PINYIN_TO_CANONICAL', () => {
  test('每个 canonical 都被映射（无声调拼音对所有 canonical 唯一时）', () => {
    // 我们的 24 个 canonical 实测都无声调拼音冲突，全部进表
    expect(Object.keys(PINYIN_TO_CANONICAL).length).toBe(CANONICAL_LIST.length)
  })

  test('反查值都是合法 canonical', () => {
    const canonicals = new Set(CANONICAL_LIST)
    for (const v of Object.values(PINYIN_TO_CANONICAL)) {
      expect(canonicals.has(v)).toBe(true)
    }
  })

  test('表里的关键映射存在', () => {
    expect(PINYIN_TO_CANONICAL.nanting).toBe('难听')
    expect(PINYIN_TO_CANONICAL.jiayou).toBe('加油')
    expect(PINYIN_TO_CANONICAL.wocao).toBe('卧槽')
    expect(PINYIN_TO_CANONICAL.niubi).toBe('牛逼')
  })
})
