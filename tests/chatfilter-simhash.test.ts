import { describe, expect, test } from 'bun:test'

import { computeSimhash, hammingDistance, SimHashHelper } from '../src/lib/chatfilter/simhash'

describe('chatfilter/simhash', () => {
  test('同文本 → 同指纹', () => {
    const a = computeSimhash('今天天气真好')
    const b = computeSimhash('今天天气真好')
    expect(a).toBe(b)
  })

  test('不同文本 → 不同指纹 (大概率)', () => {
    const a = computeSimhash('今天天气真好')
    const b = computeSimhash('股票又跌了')
    expect(a).not.toBe(b)
  })

  test('短文本（<3 字）自动降级 bigram / 自身', () => {
    expect(() => computeSimhash('a')).not.toThrow()
    expect(() => computeSimhash('ab')).not.toThrow()
    expect(computeSimhash('')).toBe(0n)
  })

  test('小改动文本：汉明距离应该较小', () => {
    const a = computeSimhash('今天直播间气氛真好')
    const b = computeSimhash('今天直播间气氛真好啊') // +1 字
    const dist = hammingDistance(a, b)
    expect(dist).toBeLessThan(20) // 经验阈值；FNV+SimHash 在 +1 字时距离应该 << 64
  })

  test('hammingDistance: 自反', () => {
    const a = computeSimhash('123abc')
    expect(hammingDistance(a, a)).toBe(0)
    expect(hammingDistance(0n, 0n)).toBe(0)
    expect(hammingDistance(0n, 0xffffffffffffffffn)).toBe(64)
  })

  test('SimHashHelper: 加入 + 查同条命中', () => {
    const h = new SimHashHelper({ minTextLength: 4 })
    h.add('今天直播间气氛很好')
    const r = h.find('今天直播间气氛很好')
    expect(r.canonical).toBe('今天直播间气氛很好')
    expect(r.autoMerged).toBe(true)
  })

  test('SimHashHelper: 短文本不自动合并（minTextLength 守卫）', () => {
    const h = new SimHashHelper({ minTextLength: 8, highConfDistance: 2 })
    h.add('哈哈哈')
    const r = h.find('哈哈哈哈')
    // 即使汉明距离够小，长度不够 minTextLength → 不 autoMerged
    expect(r.autoMerged).toBe(false)
  })

  test('SimHashHelper: 空 store → 无命中', () => {
    const h = new SimHashHelper()
    const r = h.find('任何文本')
    expect(r.canonical).toBeNull()
    expect(r.autoMerged).toBe(false)
  })

  test('SimHashHelper: maxStoreSize 淘汰', () => {
    const h = new SimHashHelper({ maxStoreSize: 3 })
    h.add('a1')
    h.add('a2')
    h.add('a3')
    expect(h.size()).toBe(3)
    h.add('a4')
    expect(h.size()).toBe(3) // 仍 3，最早的被淘汰
  })
})
