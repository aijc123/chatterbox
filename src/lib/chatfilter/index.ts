// 桶文件：业务模块（auto-blend / custom-chat / 等）从这里 import，避免散落。
//
// 不要从这里 re-export 任何依赖 @preact/signals 或 store 的高层 wrapper；
// 那些应该住在 src/lib 下的独立适配模块里（M2/M3 才出现）。这里只暴露
// 纯算法层。

export type {
  Aggressiveness,
  AliasHitDetail,
  NormalizeOptions,
  NormalizeResult,
  RemoteEvent,
  RemoteStatus,
  StageHit,
  StageId,
} from './types'

export { type AliasHit, type AliasResult, applyAliases } from './alias-ac'
export { _resetCycleCacheForTests, compressCycle } from './cycle-compress'
export { type DedupRecord, type DedupResult, DedupStore } from './dedup'
export { Lru } from './lru'
export {
  _resetNormalizeDefaultsForTests,
  getDefaultDedup,
  getDefaultSimhash,
  getTrendKey,
  type NormalizeConfig,
  normalize,
} from './normalize'
export { basicCleanse, type PreprocessOptions } from './preprocess'
export {
  computeSimhash,
  hammingDistance,
  SimHashHelper,
  type SimHashHelperOptions,
  type SimHashLookup,
} from './simhash'
export { applyPinyin, PINYIN_LAYER_READY } from './variant-pinyin'
export { ALIAS_PATTERNS, CANONICAL_LIST, VARIANT_TO_CANONICAL, VARIANTS, VARIANTS_VERSION } from './variants.gen'
