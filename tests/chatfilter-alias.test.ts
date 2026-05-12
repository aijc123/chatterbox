import { describe, expect, test } from 'bun:test'

import { applyAliases } from '../src/lib/chatfilter/alias-ac'
import { VARIANT_TO_CANONICAL } from '../src/lib/chatfilter/variants.gen'

describe('chatfilter/alias-ac applyAliases (YAML 字典端到端)', () => {
  test('niubi / NB / nb → 牛逼', () => {
    expect(applyAliases('niubi').result).toBe('牛逼')
    expect(applyAliases('NB').result).toBe('牛逼')
    expect(applyAliases('nb').result).toBe('牛逼')
  })

  test('yyds → 永远的神', () => {
    expect(applyAliases('yyds').result).toBe('永远的神')
    expect(applyAliases('YYDS').result).toBe('永远的神')
  })

  test('多变体在同条文本中并存', () => {
    const r = applyAliases('卧槽 niubi')
    expect(r.result).toBe('卧槽 牛逼')
    expect(r.hits.length).toBe(1) // 卧槽 自映射不计；niubi → 牛逼 计 1
    expect(r.hits[0].variant).toBe('niubi')
    expect(r.hits[0].canonical).toBe('牛逼')
  })

  test('canonical 自映射不上报 hit（避免污染 replacement-feed）', () => {
    const r = applyAliases('哈哈哈')
    expect(r.result).toBe('哈哈哈')
    expect(r.hits.length).toBe(0)
  })

  test('未在字典里的文本原样保留', () => {
    const r = applyAliases('今天天气真好')
    expect(r.result).toBe('今天天气真好')
    expect(r.hits.length).toBe(0)
  })

  test('字典里出现的"南亭" → "难听"（不是 jieba 词级，但靠 substring 准确替换）', () => {
    expect(applyAliases('南亭').result).toBe('难听')
  })

  test('hit 位置 start 准确', () => {
    const r = applyAliases('我觉得 niubi')
    const hit = r.hits[0]
    expect(hit.start).toBe(4) // "我觉得 " 是 4 个 code unit
    expect(r.result).toBe('我觉得 牛逼')
  })

  test('VARIANT_TO_CANONICAL 自映射完备', () => {
    // 所有 canonical 都映射到自己（让 AC 一遍打通时保持 canonical 输出）
    for (const c of Object.keys({
      牛逼: 1,
      傻逼: 1,
      卧槽: 1,
      哈哈哈: 1,
    })) {
      expect(VARIANT_TO_CANONICAL[c]).toBe(c)
    }
  })

  test('长 variant 优先于短 variant', () => {
    // "灰泽满酱" 应整体替换为 "主播"，而不是先匹配 "灰泽"
    expect(applyAliases('灰泽满酱').result).toBe('主播')
    expect(applyAliases('灰泽').result).toBe('主播')
  })

  test('空串', () => {
    expect(applyAliases('').result).toBe('')
    expect(applyAliases('').hits).toEqual([])
  })
})
