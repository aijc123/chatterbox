// Step ④ 循环节压缩 —— TS 移植自 Chatfilter `cycle_compressor.py`。
//
//   (.+?)\1{2,}  匹配 ≥3 次的重复子串（最小匹配避免贪婪吞掉非重复部分）
//
// 例：
//   "哈哈哈哈哈哈"     → "哈"
//   "加油加油加油加"   → "加油加"   (尾部残余保留)
//   "🎶🎤🐛🎶🎤🐛🎶🎤🐛" → "🎶🎤🐛"
//
// `u` 标志保证 `.` 按 code point 走（emoji 是 1 个 `.`，不会被腰斩成代理对）。
// 单次 replace 即可——Python 端也只跑一次；二次压缩会产生不直觉的结果。

import { Lru } from './lru'

const CYCLE_RE = /(.+?)\1{2,}/gu

const cache = new Lru<string, string>(4096)

export function compressCycle(text: string): string {
  if (text.length < 2) return text
  const cached = cache.get(text)
  if (cached !== undefined) return cached
  const out = text.replace(CYCLE_RE, '$1')
  cache.set(text, out)
  return out
}

// 测试用，单测之间清缓存避免互相影响
export function _resetCycleCacheForTests(): void {
  cache.clear()
}
