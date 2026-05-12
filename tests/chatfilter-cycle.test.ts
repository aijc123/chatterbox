import { beforeEach, describe, expect, test } from 'bun:test'

import { _resetCycleCacheForTests, compressCycle } from '../src/lib/chatfilter/cycle-compress'

describe('chatfilter/cycle-compress compressCycle', () => {
  beforeEach(() => {
    _resetCycleCacheForTests()
  })

  test('基本：三次重复字符 → 一字', () => {
    expect(compressCycle('哈哈哈')).toBe('哈')
    expect(compressCycle('哈哈哈哈哈哈')).toBe('哈')
  })

  test('两次重复不压缩（必须 ≥3）', () => {
    expect(compressCycle('哈哈')).toBe('哈哈')
    expect(compressCycle('ab')).toBe('ab')
  })

  test('多字循环节', () => {
    expect(compressCycle('加油加油加油')).toBe('加油')
    expect(compressCycle('🎶🎤🐛🎶🎤🐛🎶🎤🐛')).toBe('🎶🎤🐛')
  })

  test('尾部残余保留', () => {
    // "加油加油加油加" → 整段 "加油加油加油" 压成 "加油"，尾部 "加" 保留
    expect(compressCycle('加油加油加油加')).toBe('加油加')
  })

  test('混合：非重复 + 重复', () => {
    expect(compressCycle('hi哈哈哈')).toBe('hi哈')
    expect(compressCycle('666啊啊啊啊')).toBe('6啊')
  })

  test('emoji 单 code-point 处理', () => {
    expect(compressCycle('😂😂😂')).toBe('😂')
    expect(compressCycle('😂😂😂😂😂')).toBe('😂')
  })

  test('短文本短路', () => {
    expect(compressCycle('a')).toBe('a')
    expect(compressCycle('')).toBe('')
  })

  test('LRU 缓存：同一文本第二次走 cache（功能上不可见，但不应改变结果）', () => {
    const a = compressCycle('哈哈哈哈')
    const b = compressCycle('哈哈哈哈')
    expect(a).toBe(b)
    expect(a).toBe('哈')
  })

  test('idempotency: compress(compress(x)) === compress(x)', () => {
    const samples = ['哈哈哈哈', '加油加油加油加', '🎵🎵🎵🎵', '上车']
    for (const s of samples) {
      const once = compressCycle(s)
      const twice = compressCycle(once)
      expect(twice).toBe(once)
    }
  })
})
