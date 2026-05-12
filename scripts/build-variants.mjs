// AUTO-GENERATED 流程：从 src/lib/chatfilter/variants.yaml 生成 variants.gen.ts
//
// YAML 格式被强约束为一个子集（只含 `variants:` 顶级块 + `key: [v1, v2, ...]`），
// 所以这里用一个手写的小解析器，避免引入 js-yaml 之类的依赖。
// 想扩展 YAML 形态（多文档、引用、嵌套）就上 js-yaml，不要逐步加 if。

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const now = new Date().toISOString().slice(0, 10)
const variantsLiteral = JSON.stringify(variants, null, 2)
const reverseLiteral = JSON.stringify(variantToCanonical, null, 2)
const patternsLiteral = JSON.stringify(aliasPatterns, null, 2)
const canonicalList = JSON.stringify(Object.keys(variants), null, 2)

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
`

writeFileSync(outPath, body)
console.log(
  `[build-variants] wrote ${outPath} — ${Object.keys(variants).length} canonical, ${aliasPatterns.length} patterns, version ${now}`
)
