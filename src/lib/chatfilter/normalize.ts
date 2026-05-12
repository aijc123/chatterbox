// 顶层归一化管线：串接 preprocess → alias → variant-pinyin → cycle → dedup → simhash。
//
// 设计原则：
//   - 核心 normalize() 是**纯函数风格**：所有可调项（aggressiveness, dedup
//     store 等）从 config 入参取，不读 @preact/signals。这样单测可以脱离
//     GM 存储 mock，直接构造 config 跑大量 fixture。
//   - 上层包装 `getTrendKey()`、`normalizeFromStore()` 等读 signals，给业务
//     用。它们薄到只是"读 signal → 调 normalize"。

import type { Aggressiveness, NormalizeOptions, NormalizeResult, StageHit } from './types'

import { type AliasHit, applyAliases } from './alias-ac'
import { compressCycle } from './cycle-compress'
import { DedupStore } from './dedup'
import { basicCleanse, type PreprocessOptions } from './preprocess'
import { SimHashHelper } from './simhash'
import { applyPinyin, PINYIN_LAYER_READY } from './variant-pinyin'

export interface NormalizeConfig {
  aggressiveness: Aggressiveness
  dedup: DedupStore
  /** 仅 'aggressive' 档位下传入；其它档位可不传。 */
  simhash?: SimHashHelper
  preprocess?: PreprocessOptions
}

/** 单例 simhash store（懒构造）。一般业务路径不直接用——通过 NormalizeConfig 注入。 */
let defaultDedup: DedupStore | null = null
let defaultSimhash: SimHashHelper | null = null

export function getDefaultDedup(): DedupStore {
  if (!defaultDedup) defaultDedup = new DedupStore()
  return defaultDedup
}

export function getDefaultSimhash(): SimHashHelper {
  if (!defaultSimhash) defaultSimhash = new SimHashHelper()
  return defaultSimhash
}

/** 测试 / hot-reload 用：丢掉模块级默认 store。 */
export function _resetNormalizeDefaultsForTests(): void {
  defaultDedup = null
  defaultSimhash = null
}

const emptyHits: StageHit[] = []
const emptyAliasHits: NormalizeResult['aliasHits'] = []

function emptyResult(raw: string, durationMs: number): NormalizeResult {
  return {
    raw,
    canonical: '',
    filtered: true,
    isNew: false,
    count: 0,
    stageHits: emptyHits,
    aliasHits: emptyAliasHits,
    simhash: 0n,
    durationMs,
  }
}

export function normalize(raw: string, config: NormalizeConfig, opts: NormalizeOptions = {}): NormalizeResult {
  const t0 = performance.now()
  const trackHits = opts.trackHits === true
  const hits: StageHit[] = trackHits ? [] : emptyHits

  // ── ① preprocess ────────────────────────────────────────────
  const cleansed = basicCleanse(raw, config.preprocess)
  if (cleansed === null) {
    if (trackHits) hits.push({ stage: 'preprocess', before: raw, after: '', cacheHit: false })
    return emptyResult(raw, performance.now() - t0)
  }
  if (trackHits && cleansed !== raw) {
    hits.push({ stage: 'preprocess', before: raw, after: cleansed, cacheHit: false })
  }

  let text = cleansed
  let aliasHits: AliasHit[] = []
  const lvl = config.aggressiveness

  // ── ② alias-ac（normal / aggressive） ───────────────────────
  if (lvl !== 'safe') {
    const aliasOut = applyAliases(text)
    if (aliasOut.hits.length > 0) {
      aliasHits = aliasOut.hits
      if (trackHits) hits.push({ stage: 'alias', before: text, after: aliasOut.result, cacheHit: false })
      text = aliasOut.result
    }
  }

  // ── ③ variant-pinyin（normal / aggressive） ─────────────────
  // 用 pinyin-pro 算输入的 toneless 拼音，反查 canonical 拼音表。抓 alias-ac
  // 没列举的纯谐音变体（"南亭"→"难听"、"加优"→"加油"）。pinyin hit 也作为
  // aliasHit 上报，让场景 C 的 replacement-feed 能学到这条映射。
  if (lvl !== 'safe' && PINYIN_LAYER_READY) {
    const py = applyPinyin(text)
    if (py.pinyinHits > 0 && py.result !== text) {
      if (trackHits) hits.push({ stage: 'pinyin', before: text, after: py.result, cacheHit: false })
      if (py.variantHit) {
        aliasHits = [...aliasHits, { variant: py.variantHit.variant, canonical: py.variantHit.canonical, start: 0 }]
      }
      text = py.result
    }
  }

  // ── ④ cycle-compress（所有档位） ────────────────────────────
  const compressed = compressCycle(text)
  if (compressed !== text) {
    if (trackHits) hits.push({ stage: 'cycle', before: text, after: compressed, cacheHit: false })
    text = compressed
  }

  // ── ⑥ dedup ─────────────────────────────────────────────────
  // ⑤ SimHash 与 ⑥ dedup 的顺序：先 dedup，命中则跳过 simhash（短路）。
  // SimHash 只在 dedup miss 且 aggressive 档位才跑，找现有 canonical 合并。
  const dedupResult = config.dedup.ingest(text, raw)
  if (trackHits) {
    hits.push({
      stage: 'dedup',
      before: text,
      after: text,
      cacheHit: !dedupResult.isNew,
    })
  }

  let canonical = text
  let mergedFrom: string | undefined
  let fp = 0n

  // ── ⑤ simhash（仅 aggressive 且 dedup miss 且首次摄入触发） ─
  if (lvl === 'aggressive' && config.simhash && dedupResult.isNew) {
    const lookup = config.simhash.find(text)
    if (lookup.autoMerged && lookup.canonical && lookup.canonical !== text) {
      // 把 dedup 里这个错误新建的 canonical 撤回，转向已存在的 canonical
      // 简化策略：在 dedup 里追加一笔到目标 canonical，删掉错的 entry。
      const targetIngest = config.dedup.ingest(lookup.canonical, raw)
      if (trackHits) {
        hits.push({ stage: 'simhash', before: text, after: lookup.canonical, cacheHit: true })
      }
      mergedFrom = text
      canonical = lookup.canonical
      // 给观察日志一个稳定 fp；重算 input 的 fp 而不是查 store 取目标 fp
      // （查 store 较慢且语义上等价——同一 canonical 进 store 后 fp 不变）。
      fp = config.simhash.add(canonical)
      // 撤回错误的新 entry：dedup 没有 delete API，记为 mergedFrom 即可。
      // 累计指标走 targetIngest.count。
      return {
        raw,
        canonical,
        filtered: false,
        isNew: false,
        count: targetIngest.count,
        stageHits: hits,
        aliasHits: aliasHits.map(h => ({ variant: h.variant, canonical: h.canonical })),
        simhash: fp,
        durationMs: performance.now() - t0,
        mergedFrom,
      }
    }
    // 没匹配上 → 把当前 canonical 入库供后续比较
    fp = config.simhash.add(text)
    if (trackHits) hits.push({ stage: 'simhash', before: text, after: text, cacheHit: false })
  }

  return {
    raw,
    canonical,
    filtered: false,
    isNew: dedupResult.isNew,
    count: dedupResult.count,
    stageHits: hits,
    aliasHits: aliasHits.map(h => ({ variant: h.variant, canonical: h.canonical })),
    simhash: fp,
    durationMs: performance.now() - t0,
  }
}

/**
 * 给 auto-blend trendMap 用的窄接口：返回 canonical 或 null（filtered）。
 * 不算 simhash、不记 stageHits，开销最低。
 *
 * 注：不在这一层做 emoticon-unique 旁路—— auto-blend.ts 调用前应该自己先
 * 用 `isEmoticonUnique(raw)` 判定（接入侧的语义）。
 */
export function getTrendKey(raw: string, config: NormalizeConfig): string | null {
  const cleansed = basicCleanse(raw, config.preprocess)
  if (cleansed === null) return null
  let text = cleansed
  if (config.aggressiveness !== 'safe') {
    const aliasOut = applyAliases(text)
    text = aliasOut.result
  }
  const compressed = compressCycle(text)
  return compressed || null
}
