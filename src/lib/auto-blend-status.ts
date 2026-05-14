import { trimText } from './utils'

export interface AutoBlendCandidate {
  text: string
  totalCount: number
  uniqueUsers: number
}

export interface AutoBlendStatusInput {
  enabled: boolean
  dryRun?: boolean
  isSending: boolean
  cooldownUntil: number
  now: number
  /**
   * 当前是否启用自适应冷却。仅用于"冷却 ≥ 30s 看着像挂了" 这种用户困惑场景下
   * 在状态文案里加一句解释（冷场房间 CPM 低被算到天花板）。可选参数,旧调用方
   * 不传也能跑。
   */
  cooldownAuto?: boolean
}

export function formatAutoBlendSenderInfo(uniqueUsers: number, totalCount: number): string {
  return uniqueUsers > 0 ? `${uniqueUsers} 人 / ${totalCount} 条` : `${totalCount} 条`
}

export function shortAutoBlendText(text: string): string {
  return trimText(text, 18)[0] ?? text
}

export function formatAutoBlendStatus({
  enabled,
  dryRun,
  isSending,
  cooldownUntil,
  now,
  cooldownAuto,
}: AutoBlendStatusInput): string {
  if (!enabled) return '已关闭'
  if (dryRun) return '试运行（不发送）'
  if (isSending) return '正在跟车'

  const left = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  if (left <= 0) return '观察中'
  // 自适应模式下 ≥ 30s 通常意味着房间冷场，CPM 低被映射到接近 60s 天花板。
  // 用户看到"冷却中 58s"很容易以为脚本卡了——加一句解释把"为什么这么久"
  // 显式说出来。
  if (cooldownAuto && left >= 30) {
    return `冷却中 ${left}s（冷场房间冷却拉长，按弹幕速率自适应）`
  }
  return `冷却中 ${left}s`
}

export function formatAutoBlendCandidate(candidates: AutoBlendCandidate[]): string {
  let best: AutoBlendCandidate | null = null
  for (const candidate of candidates) {
    if (candidate.totalCount < 2) continue
    if (!best || candidate.totalCount > best.totalCount) best = candidate
  }

  if (!best) return '暂无'
  return `${shortAutoBlendText(best.text)}（${formatAutoBlendSenderInfo(best.uniqueUsers, best.totalCount)}）`
}

export interface AutoBlendCandidateProgress {
  text: string | null
  shortText: string | null
  totalCount: number
  threshold: number
  uniqueUsers: number
  minUsers: number
  requireDistinctUsers: boolean
  /** 0–1 inclusive; how close the leading candidate is to triggering. */
  fillRatio: number
}

/**
 * Pick the leading candidate and report how close it is to triggering.
 * Used by the panel's "正在刷" progress display so users see "3/4 条" instead
 * of just "暂无". Pure: same inputs → same output, easy to test.
 *
 * `fillRatio` is min(countRatio, userRatio) when distinct-users gating is on,
 * otherwise just countRatio. This matches the AND semantics of meetsThreshold —
 * both conditions must pass, so the bar reflects the *bottleneck* condition.
 */
export function formatAutoBlendCandidateProgress(
  candidates: AutoBlendCandidate[],
  threshold: number,
  requireDistinctUsers: boolean,
  minUsers: number
): AutoBlendCandidateProgress {
  let best: AutoBlendCandidate | null = null
  for (const candidate of candidates) {
    if (candidate.totalCount < 2) continue
    if (!best || candidate.totalCount > best.totalCount) best = candidate
  }

  if (!best) {
    return {
      text: null,
      shortText: null,
      totalCount: 0,
      threshold,
      uniqueUsers: 0,
      minUsers,
      requireDistinctUsers,
      fillRatio: 0,
    }
  }

  const countRatio = threshold > 0 ? Math.min(1, best.totalCount / threshold) : 0
  const userRatio = requireDistinctUsers && minUsers > 0 ? Math.min(1, best.uniqueUsers / minUsers) : 1
  const fillRatio = Math.min(countRatio, userRatio)

  return {
    text: best.text,
    shortText: shortAutoBlendText(best.text),
    totalCount: best.totalCount,
    threshold,
    uniqueUsers: best.uniqueUsers,
    minUsers,
    requireDistinctUsers,
    fillRatio,
  }
}
