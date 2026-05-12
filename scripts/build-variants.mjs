// AUTO-GENERATED 流程：从 src/lib/chatfilter/variants.yaml 生成 variants.gen.ts
//
// YAML 格式被强约束为一个子集（只含 `variants:` 顶级块 + `key: [v1, v2, ...]`），
// 所以这里用一个手写的小解析器，避免引入 js-yaml 之类的依赖。
// 想扩展 YAML 形态（多文档、引用、嵌套）就上 js-yaml，不要逐步加 if。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const here = dirname(fileURLToPath(import.meta.url))
const yamlPath = resolve(here, '../src/lib/chatfilter/variants.yaml')
const outPath = resolve(here, '../src/lib/chatfilter/variants.gen.ts')

const raw = readFileSync(yamlPath, 'utf-8')

/** @type {Record<string, string[]>} */
const variants = {}
let inVariantsBlock = false
const lines = raw.split(/\r?\n/)
for (const line of lines) {
  if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue
  if (/^variants:\s*$/.test(line)) {
    inVariantsBlock = true
    continue
  }
  if (!inVariantsBlock) continue
  // 顶层 key 出现（无前导空格）打断 variants 块
  if (/^\S/.test(line)) {
    inVariantsBlock = false
    continue
  }
  const m = line.match(/^\s{2,}(\S+):\s*\[(.*)\]\s*$/)
  if (!m) continue
  const key = m[1].trim()
  const items = m[2]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  variants[key] = items
}

// 校验：variant 不能同时映射到两个 canonical（最长优先策略需要 variant→canonical 唯一）
/** @type {Record<string, string>} */
const variantToCanonical = {}
const conflicts = []
for (const [canonical, vs] of Object.entries(variants)) {
  // canonical 自己也算 variant，自映射，便于 AC 一遍打通
  if (variantToCanonical[canonical] && variantToCanonical[canonical] !== canonical) {
    conflicts.push(`${canonical} ↔ ${variantToCanonical[canonical]}`)
  }
  variantToCanonical[canonical] = canonical
  for (const v of vs) {
    if (variantToCanonical[v] && variantToCanonical[v] !== canonical) {
      conflicts.push(`${v}: ${variantToCanonical[v]} vs ${canonical}`)
    }
    variantToCanonical[v] = canonical
  }
}
if (conflicts.length > 0) {
  console.warn('[build-variants] 检测到 variant 冲突（后写入者胜出）：')
  for (const c of conflicts) console.warn('  -', c)
}

// 排序：长 variant 优先（AC 自动机的最长匹配语义保护；同长按字典序稳定）
const aliasPatterns = Object.entries(variantToCanonical)
  .map(([variant, canonical]) => [variant, canonical])
  .sort((a, b) => {
    if (b[0].length !== a[0].length) return b[0].length - a[0].length
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  })

// ── 拼音反查（toneless）+ 字符级 CHAR_PINYIN 表 ──────────────────────────
//
// 设计：pinyin-pro 完整包 ~500 KB raw 实在太重，不能进 userscript bundle。
// 改成"构建期 pinyin-pro，运行期纯查表"：
//   1. 用 pinyin-pro 算每个 canonical 的字符级 toneless 拼音 → 拼接出整体拼音
//      → 建 PINYIN_TO_CANONICAL 反查表（冲突 canonical 剔除）。
//   2. 收集所有 canonical 里出现过的拼音音节集合（如 {nan, ting, jia, you,
//      niu, bi, ...}）。
//   3. 遍历 CJK Unified Ideographs 基本块（U+4E00..U+9FFF, ~20k 字），把每个
//      字读音落在那个音节集合里的，记进 CHAR_PINYIN 表。这样表里只包含
//      "可能跟 canonical 拼音对得上"的几百个字，量级 ~1-2 KB gz。
//   4. variant-pinyin 运行时按 char 查 CHAR_PINYIN 拼起来，再查 PINYIN_TO_CANONICAL。
//
// 无声调 vs 带声调：无声调匹配更宽松（pinyin-pro 给"听"读 ting1、"亭"读 ting2，
// 带声调就抓不到 南亭→难听）。toneless 下 lai2le/lai2la 仍然是 laile/laila
// 不同，所以"声调精度"损失极小。

const PINYIN_OPTS_CHAR = { toneType: 'none', type: 'string' }

/** @type {Record<string, string>} */
const canonicalPinyin = {}
/** @type {Map<string, Set<string>>} */ const pinyinSeen = new Map() // toneless pinyin → canonicals
const targetSyllables = new Set()

for (const canonical of Object.keys(variants)) {
  const chars = Array.from(canonical)
  const syllables = []
  let ok = true
  for (const c of chars) {
    const py = pinyin(c, PINYIN_OPTS_CHAR).toLowerCase()
    if (!py || py === c.toLowerCase()) {
      ok = false
      break
    }
    syllables.push(py)
    targetSyllables.add(py)
  }
  if (!ok) continue
  const joined = syllables.join('')
  if (!pinyinSeen.has(joined)) pinyinSeen.set(joined, new Set())
  pinyinSeen.get(joined).add(canonical)
}

const pinyinConflicts = []
for (const [py, cans] of pinyinSeen) {
  if (cans.size === 1) {
    const [only] = cans
    canonicalPinyin[py] = only
  } else {
    pinyinConflicts.push(`${py}: ${[...cans].join(' / ')}`)
  }
}
if (pinyinConflicts.length > 0) {
  console.warn('[build-variants] 拼音冲突（保守不入表）：')
  for (const c of pinyinConflicts) console.warn('  -', c)
}

// 扫 CJK 基本块，挑读音在 targetSyllables 里的字进表
/** @type {Record<string, string>} */
const charPinyin = {}
const CJK_START = 0x4e00
const CJK_END = 0x9fff
for (let cp = CJK_START; cp <= CJK_END; cp++) {
  const ch = String.fromCodePoint(cp)
  const py = pinyin(ch, PINYIN_OPTS_CHAR).toLowerCase()
  if (!py || py === ch.toLowerCase()) continue
  if (!targetSyllables.has(py)) continue
  charPinyin[ch] = py
}
console.log(
  `[build-variants] CHAR_PINYIN: ${Object.keys(charPinyin).length} chars covering ${targetSyllables.size} syllables`
)

const now = new Date().toISOString().slice(0, 10)
const variantsLiteral = JSON.stringify(variants, null, 2)
const reverseLiteral = JSON.stringify(variantToCanonical, null, 2)
const patternsLiteral = JSON.stringify(aliasPatterns, null, 2)
const canonicalList = JSON.stringify(Object.keys(variants), null, 2)
const pinyinLiteral = JSON.stringify(canonicalPinyin, null, 2)
// CHAR_PINYIN 用紧凑单行格式，单字字典反正每行没意义
const charPinyinLiteral = JSON.stringify(charPinyin)

const banner = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: src/lib/chatfilter/variants.yaml
 * Regenerate with: bun scripts/build-variants.mjs
 */`

const body = `${banner}

export const VARIANTS_VERSION = ${JSON.stringify(now)}

export const VARIANTS: Readonly<Record<string, readonly string[]>> = ${variantsLiteral}

/** variant → canonical (含 canonical 自映射). 由 alias-ac 使用. */
export const VARIANT_TO_CANONICAL: Readonly<Record<string, string>> = ${reverseLiteral}

/** 长度优先排序的 [variant, canonical] 列表; AC 自动机构造时直接用. */
export const ALIAS_PATTERNS: ReadonlyArray<readonly [string, string]> = ${patternsLiteral}

/** 所有 canonical 词的列表 (拼音预计算用). */
export const CANONICAL_LIST: ReadonlyArray<string> = ${canonicalList}

/**
 * 无声调拼音 → canonical 反查表 (variant-pinyin 运行时用).
 * 冲突 canonical 已剔除——拼音匹配到这里的，是字典 toneless 拼音唯一的那一支.
 */
export const PINYIN_TO_CANONICAL: Readonly<Record<string, string>> = ${pinyinLiteral}

/**
 * CJK 字符 → toneless 拼音表 (variant-pinyin 运行时用).
 * 只包含读音可能与某个 canonical 拼音音节对得上的字 (build script 按
 * targetSyllables 过滤生成). 不在表里的字 → 一律算未知拼音, applyPinyin 直接返回原文.
 *
 * 这样 bundle 只多 ~1-2 KB gz, 而不是 pinyin-pro 完整包的 150 KB gz.
 */
export const CHAR_PINYIN: Readonly<Record<string, string>> = ${charPinyinLiteral}
`

writeFileSync(outPath, body)
console.log(
  `[build-variants] wrote ${outPath} — ${Object.keys(variants).length} canonical, ${aliasPatterns.length} patterns, version ${now}`
)
