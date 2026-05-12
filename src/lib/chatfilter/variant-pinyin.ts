// Step ③ 变体归一化（拼音反查层）
//
// 算法：把 alias-ac 没认出来的短文本做"toneless 拼音 → canonical"反查。
//
//   1. build-variants.mjs 构建期：
//      - 用 pinyin-pro 对每个 canonical 算字符级 toneless 拼音 → 拼接 →
//        PINYIN_TO_CANONICAL 反查表（拼音冲突 canonical 已剔除，宁漏勿误）。
//      - 收集 canonical 涉及的音节集合（42 个），遍历 CJK 基本块挑出读音
//        在集合里的字，建 CHAR_PINYIN 紧凑表（~3300 字 / ~49 KB raw / ~12 KB gz）。
//      - 这样 pinyin-pro 只在 devDependency，userscript bundle 不带它的 ~150 KB gz。
//
//   2. 运行时：逐字查 CHAR_PINYIN 拼出输入拼音，PINYIN_TO_CANONICAL 反查。
//      任一字符不在表里 → 立即返回原文（不可能匹配任何 canonical）。
//
// 为什么 toneless：pinyin-pro 给"听"读 ting1、"亭"读 ting2，带声调下"南亭"
// 配不上"难听"。toneless nanting == nanting 命中，代价是"来了 (laile) vs
// 来啦 (laila)" 之类的声调微差——而它们 toneless 后仍然是 laile/laila 不同，
// 所以实际损失极小。
//
// 为什么 8 字符上限：整文本反查只对短梗适用。长句子的整句拼音永远不会匹配
// 某个 canonical 拼音，跑也是浪费——长文本归一化交给 alias-ac 的 substring 匹配。

import { CHAR_PINYIN, PINYIN_TO_CANONICAL } from './variants.gen'

/** 整文本拼音反查的上限（按 code point 计）。 */
const MAX_CHARS_FOR_PINYIN_LOOKUP = 8

const CONTAINS_CHINESE = /\p{Script=Han}/u

export interface PinyinResult {
  result: string
  /** 命中"input → canonical"反查的次数（0 或 1，因为只做整文本反查）。 */
  pinyinHits: number
  /** 命中时记下 (variant, canonical) 对，给 replacement-feed 上报学习候选用。 */
  variantHit?: { variant: string; canonical: string }
}

/**
 * 把输入文本逐字查 CHAR_PINYIN 拼起来。任一字符不在表里 → 返回 null（短路，
 * 因为这种输入不可能匹配任何 canonical 拼音）。
 */
function computeInputPinyin(text: string): string | null {
  const chars = Array.from(text)
  let out = ''
  for (const c of chars) {
    const py = CHAR_PINYIN[c]
    if (!py) return null
    out += py
  }
  return out
}

export function applyPinyin(text: string): PinyinResult {
  if (!text) return { result: text, pinyinHits: 0 }
  const codePoints = Array.from(text)
  if (codePoints.length > MAX_CHARS_FOR_PINYIN_LOOKUP) return { result: text, pinyinHits: 0 }
  // 不含中文跳过——CHAR_PINYIN 不收录拉丁字符
  if (!CONTAINS_CHINESE.test(text)) return { result: text, pinyinHits: 0 }
  const py = computeInputPinyin(text)
  if (!py) return { result: text, pinyinHits: 0 }
  const canonical = PINYIN_TO_CANONICAL[py]
  if (!canonical || canonical === text) return { result: text, pinyinHits: 0 }
  return { result: canonical, pinyinHits: 1, variantHit: { variant: text, canonical } }
}

export const PINYIN_LAYER_READY = true
