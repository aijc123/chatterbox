// Chatfilter 模块的公共类型集中处。其它模块只 import { ... } from './types'，
// 不要在各模块里重复定义同名类型。

export type StageId = 'preprocess' | 'alias' | 'variant' | 'pinyin' | 'cycle' | 'simhash' | 'dedup'

export interface StageHit {
  stage: StageId
  before: string
  after: string
  /** 该 stage 命中缓存（短路后续），仅供观察日志展示。 */
  cacheHit: boolean
}

export interface AliasHitDetail {
  variant: string
  canonical: string
}

export interface NormalizeResult {
  /** 入参原文（未 trim）。 */
  raw: string
  /** 规范化后的最终文本。filtered = true 时为空串。 */
  canonical: string
  /** preprocess 把文本判定为应丢弃（控制字符 / 纯数字 / 长度违规）。 */
  filtered: boolean
  /** 该 canonical 在 dedup store 中是新的（首次见到）。 */
  isNew: boolean
  /** 该 canonical 累计计数（含本次）。 */
  count: number
  /** 每个 stage 是否产生改变及缓存命中信息。仅当 trackHits=true 时填充。 */
  stageHits: StageHit[]
  /**
   * alias 阶段命中的具体 variant→canonical 配对（不计 canonical 自映射）。
   * 给 replacement-feed（场景 C）学习路径用。filtered / 无 hits 时为空数组。
   */
  aliasHits: AliasHitDetail[]
  /** 64-bit SimHash 指纹，bigint 形式。filtered 时为 0n。 */
  simhash: bigint
  /** normalize 全程耗时（毫秒，performance.now 差值）。 */
  durationMs: number
  /** SimHash 自动合并发生时，记录被合并到的目标 canonical（merged INTO this）。 */
  mergedFrom?: string
}

export interface NormalizeOptions {
  /** 是否记录 stageHits（默认 false；log panel / 调试用时才开）。 */
  trackHits?: boolean
}

/** 远程聚类层（M4）的事件类型 —— 提前占位，M1 不使用。 */
export type RemoteEvent =
  | { kind: 'state'; data: unknown }
  | { kind: 'ingest_ack'; canonical: string; clusterId: string; isNew: boolean }
  | { kind: 'error'; reason: string }

/** Aggressiveness 档位影响参与哪些 stage：
 *  - 'safe':       preprocess + cycle + dedup
 *  - 'normal':     +alias + variant
 *  - 'aggressive': +pinyin + simhash auto-merge
 */
export type Aggressiveness = 'safe' | 'normal' | 'aggressive'

export type RemoteStatus = 'idle' | 'connecting' | 'connected' | 'polling' | 'error'
