import { trimText } from './utils'

export interface AutoBlendCandidate {
  text: string
  totalCount: number
  uniqueUsers: number
}

export interface AutoBlendStatusInput {
  enabled: boolean
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

export function formatAutoBlendStatus({ enabled, isSending, cooldownUntil, now }: AutoBlendStatusInput): string {
  if (!enabled) return '已关闭'
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
