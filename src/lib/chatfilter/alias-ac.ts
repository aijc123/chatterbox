// Step ② 别名归一化 —— TS 移植自 Chatfilter `alias_normalizer.py`，但用 ALIAS_PATTERNS
// 长度优先的直接扫描而非 jieba 分词。
//
// 为什么不上真 AC 自动机：当前字典 ~105 个 pattern，平均长度 3-4 字。在 30 字
// 弹幕上扫一次，最坏 ~3-4k 次字符比较，单条 < 0.1 ms。AC 的常数优势在这个
// 规模上完全淹没在 trie 构建成本里。等字典扩到 >1000 再换 AC。
//
// 关键语义（与 Python jieba 词级替换对齐）：
//   - 最长优先：避免 "东南亭子" 里的 "南亭" 被错替换（"南亭" 也在字典里）。
//     实现：patterns 已在 build-variants.mjs 里按长度降序排列；在每个 i
//     位置遍历 patterns，首个匹配即用，跳到 i + variant.length。
//   - 非破坏：同一文本多个 variant 串行替换，每次替换后从匹配末尾继续扫，
//     不会回头匹配新生成的 canonical。

import { ALIAS_PATTERNS } from './variants.gen'

export interface AliasHit {
  /** 命中 variant 在原文的起始 index（UTF-16 code unit, 与 String 索引一致）。 */
  start: number
  /** 命中 variant 的原始形态。 */
  variant: string
  /** 替换为的 canonical。 */
  canonical: string
}

export interface AliasResult {
  result: string
  hits: AliasHit[]
}

/**
 * 把文本里所有命中的 variant 替换成 canonical。
 *
 * 注意：variant 自映射（canonical→canonical）也在 ALIAS_PATTERNS 里，所以
 * `result === text` 不代表"没识别到 canonical"；调用方应看 hits.length。
 * canonical 自映射的 hits 在 normalize 主流程里需要被忽略（它没改变文本，
 * 上报为 alias hit 会污染 replacement-feed 的学习计数）。
 */
export function applyAliases(
  text: string,
  patterns: ReadonlyArray<readonly [string, string]> = ALIAS_PATTERNS
): AliasResult {
  if (!text) return { result: text, hits: [] }
  const hits: AliasHit[] = []
  let i = 0
  let out = ''
  const n = text.length
  while (i < n) {
    let matched: { variant: string; canonical: string } | null = null
    for (const [variant, canonical] of patterns) {
      const len = variant.length
      if (i + len > n) continue
      if (text.startsWith(variant, i)) {
        matched = { variant, canonical }
        break // patterns 已按长度降序排，首匹配即最长
      }
    }
    if (matched) {
      out += matched.canonical
      // 仅在 variant !== canonical 时记 hit（自映射不算"真改写"）
      if (matched.variant !== matched.canonical) {
        hits.push({ start: i, variant: matched.variant, canonical: matched.canonical })
      }
      i += matched.variant.length
    } else {
      out += text[i]
      i += 1
    }
  }
  return { result: out, hits }
}
