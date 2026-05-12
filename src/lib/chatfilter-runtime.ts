// chatfilter 纯算法模块（src/lib/chatfilter/）和 chatterbox signal 持久化的桥接层。
//
// 设计要点：
//   - chatfilter/ 内部完全不依赖 @preact/signals，便于单测和未来移植。
//   - 业务模块（auto-blend / custom-chat / log-panel）只 import 这个 runtime
//     文件，得到一个"已经把 signal 读完的"NormalizeConfig 句柄。
//   - 这里维护一个进程级单例 NormalizeConfig 视图——dedup/simhash store 跨
//     调用复用；aggressiveness 改变时只换档位字段（不重置 store），避免每
//     条弹幕都新建 DedupStore。

import {
  getDefaultDedup,
  getDefaultSimhash,
  type NormalizeConfig,
  type NormalizeOptions,
  type NormalizeResult,
  getTrendKey as pureGetTrendKey,
  normalize as pureNormalize,
} from './chatfilter'
import {
  chatfilterAffectAutoBlendTrend,
  chatfilterAffectCustomChatFold,
  chatfilterAggressiveness,
  chatfilterEnabled,
} from './store-chatfilter'

// ─── 观察事件总线 ───────────────────────────────────────────────────────
//
// 仅当 chatfilterLogPanelEnabled 开时，auto-blend 的 trend-key 路径会改用
// 完整 normalize（含 stageHits）并把结果广播到这里。log panel 订阅即可。
// 订阅者列表为空时（panel 关闭）整条路径短路，业务路径开销 = 原来的
// getTrendKey（不计 simhash / stageHits / dedup 之外的开销）。

type Subscriber = (result: NormalizeResult) => void
const subscribers = new Set<Subscriber>()

export function subscribeNormalizeEvents(handler: Subscriber): () => void {
  subscribers.add(handler)
  return () => {
    subscribers.delete(handler)
  }
}

function emitNormalizeEvent(result: NormalizeResult): void {
  if (subscribers.size === 0) return
  for (const sub of subscribers) {
    try {
      sub(result)
    } catch {
      // 观察者抛错不应影响主路径；静默吞掉
    }
  }
}

/** 测试用：把订阅列表清空。 */
export function _clearNormalizeSubscribersForTests(): void {
  subscribers.clear()
}

/**
 * 计算"当前应该用什么 NormalizeConfig"。每次调用都重读 signal，所以用户
 * 在 UI 里改 aggressiveness 立即生效，不需要重启脚本。dedup/simhash 单例
 * 不变（同一个 store 实例）。
 */
export function getChatfilterRuntimeConfig(): NormalizeConfig {
  const aggressiveness = chatfilterAggressiveness.value
  return {
    aggressiveness,
    dedup: getDefaultDedup(),
    simhash: aggressiveness === 'aggressive' ? getDefaultSimhash() : undefined,
  }
}

/**
 * auto-blend 路径专用：返回 canonical 或 null。
 *
 * - chatfilter 总开关关 → 返回原文（trim 后），让 auto-blend 当作没启用归一化。
 * - chatfilter 启用但场景 A 关 → 同上。
 * - chatfilter 启用 + 场景 A 开 → 真正走 getTrendKey 算 canonical。
 *
 * null 表示"chatfilter 把它判定为应丢弃"，调用方应立即 return。
 */
export function getAutoBlendTrendKey(rawText: string): string | null {
  if (!chatfilterEnabled.value || !chatfilterAffectAutoBlendTrend.value) {
    const trimmed = rawText.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  const config = getChatfilterRuntimeConfig()
  // 有订阅者（log panel 或 replacement-feed）时走完整 normalize 以便发观察
  // 事件 + 暴露 aliasHits；订阅者为空时走 cheap path（默认主路径开销最低）。
  // 安全/正常档位下 canonical 与 getTrendKey 结果一致（preprocess + alias +
  // cycle 是共有前缀），只多了 dedup 与 simhash 副作用。
  if (subscribers.size > 0) {
    const r = pureNormalize(rawText, config, { trackHits: true })
    emitNormalizeEvent(r)
    return r.filtered ? null : r.canonical
  }
  return pureGetTrendKey(rawText, config)
}

/**
 * 给 log panel / replacement-feed 用的完整 normalize 调用，带 stageHits。
 * 业务路径（非 panel 观察）不建议用——开销略大。
 */
export function normalizeForObservation(
  rawText: string,
  opts: NormalizeOptions = { trackHits: true }
): NormalizeResult {
  const r = pureNormalize(rawText, getChatfilterRuntimeConfig(), opts)
  emitNormalizeEvent(r)
  return r
}

/**
 * Custom Chat 折叠（场景 B）专用：返回用作 cardKey 的稳定字符串。
 *
 * - chatfilter 关 / 场景 B 关：返回 null，调用方走原 wheelFoldKey 兜底逻辑。
 * - chatfilter 开 + 场景 B 开 + 非 filtered：返回 canonical。
 * - filtered：返回 null（让调用方用兜底 fold key，避免空字符串被错误折叠成一组）。
 */
export function getCustomChatFoldCanonical(rawText: string): string | null {
  if (!chatfilterEnabled.value || !chatfilterAffectCustomChatFold.value) return null
  const canonical = pureGetTrendKey(rawText, getChatfilterRuntimeConfig())
  return canonical && canonical.length > 0 ? canonical : null
}
