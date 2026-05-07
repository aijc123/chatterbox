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
}: AutoBlendStatusInput): string {
  if (!enabled) return '已关闭'
  if (dryRun) return '试运行（不发送）'
  if (isSending) return '正在跟车'

  const left = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  return left > 0 ? `冷却中 ${left}s` : '观察中'
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
