/**
 * Layer 2 + Layer 3 of the shadow-ban integration:
 *
 * - `learnShadowRules` writes (sensitiveWord → AI-evaded form) into
 *   `localRoomRules` so the next send applies the rule before going out.
 *   Mirrors the same record up to a guard-room cloud endpoint when configured.
 *
 * - `recordShadowBanObservation` accumulates messages that triggered a
 *   shadow-ban warning (whether or not AI evasion already replaced them) into
 *   a persistent observation list, surfaced in the settings panel.
 *
 * Both are no-ops when their respective gm-toggles are off, but called
 * unconditionally — gating lives here, not at every callsite.
 */

import type { ShadowBypassCandidate } from './shadow-suggestion'

import { processText } from './ai-evasion'
import { mapWithConcurrency } from './concurrency'
import { syncGuardRoomShadowRule } from './guard-room-sync'
import { appendLog } from './log'
import { localRoomRules } from './store-replacement'
import { autoLearnShadowRules, type ShadowObservation, shadowBanObservations } from './store-shadow-learn'

const SHADOW_RULE_PER_ROOM_CAP = 50
const SHADOW_RULE_MIN_LEN = 1
const SHADOW_RULE_MAX_LEN = 60
const OBSERVATION_CAP = 200

export interface LearnShadowRulesInput {
  roomId: number
  sensitiveWords: string[]
  /** The AI-rewritten message (kept for logging context only). */
  evadedMessage: string
  /** The original message that triggered the shadow-ban (also for logging). */
  originalMessage: string
}

function isValidSensitiveWord(word: string): boolean {
  const trimmed = word.trim()
  return trimmed.length >= SHADOW_RULE_MIN_LEN && trimmed.length <= SHADOW_RULE_MAX_LEN && !trimmed.includes('\n')
}

/**
 * Promote each sensitive word to a local room rule (`from = word`,
 * `to = processText(word)`). Skips words that already have a manual rule
 * with the same `from` (user wins). Caps total auto-learned rules per room.
 *
 * Cloud sync to guard-room (when configured) is fire-and-forget per word.
 */
export function learnShadowRules(input: LearnShadowRulesInput): void {
  if (!autoLearnShadowRules.value) return
  const roomKey = String(input.roomId)
  const currentByRoom = localRoomRules.value
  const existingRules = currentByRoom[roomKey] ?? []
  const existingFroms = new Set(
    existingRules.map(r => r.from).filter((s): s is string => typeof s === 'string' && s.length > 0)
  )

  const newRules: Array<{ from: string; to: string; source: 'learned' }> = []
  const learnedFroms: string[] = []
  for (const raw of input.sensitiveWords) {
    if (!isValidSensitiveWord(raw)) continue
    const from = raw.trim()
    if (existingFroms.has(from)) continue
    const to = processText(from)
    if (to === from) continue
    newRules.push({ from, to, source: 'learned' })
    existingFroms.add(from)
    learnedFroms.push(from)
  }

  if (newRules.length === 0) return

  // Cap-eviction:之前的实现 `merged.slice(merged.length - CAP)` 留住末尾,
  // 等于"老的先丢"。但 existingRules 里既有用户手输规则(优先级最高,文档承诺
  // 'user wins'),也有以前 learn 进来的自动规则。无差别裁剪会把用户写的老规则
  // 跟自动规则一起丢——直接违反"user wins"。
  //
  // 现在用 source 标签区分:undefined / 'manual' = 用户加的,'learned' = 自动学到的。
  // 旧的持久数据没 source 字段,默认按 manual 处理(读为保守)——这意味着升级后
  // 既有的自动规则会被当成用户规则保护,但这是单向无害:用户不会丢规则,只是新
  // learn 进来的规则在到达 CAP 时无处可放。运行一段时间后(用户人工清理 / 重新
  // 调入新规则)就会自然恢复成新格式。
  const combined = [...existingRules, ...newRules]
  type RuleWithSource = { from?: string; to?: string; source?: 'learned' | 'manual' }
  const manuals = combined.filter((r): r is RuleWithSource => (r as RuleWithSource).source !== 'learned')
  const learned = combined.filter((r): r is RuleWithSource => (r as RuleWithSource).source === 'learned')
  let merged: RuleWithSource[]
  if (manuals.length >= SHADOW_RULE_PER_ROOM_CAP) {
    // 全是 manual 已经超 cap:只保留 manual(切到 cap),完全丢 learned。
    // 这种情况下 appendLog 一条提醒,让用户知道为啥新学到的没生效。
    merged = manuals.slice(manuals.length - SHADOW_RULE_PER_ROOM_CAP)
    appendLog(
      `⚠️ 屏蔽词规则数（房间 ${input.roomId}）已达上限 ${SHADOW_RULE_PER_ROOM_CAP}，新学到的 ${newRules.length} 条未保存。请清理一些手工规则后再试。`
    )
  } else {
    // manual 没超 cap：把 learned 中较新的若干条补满,丢掉最老的 learned。
    const learnedRoom = SHADOW_RULE_PER_ROOM_CAP - manuals.length
    const keptLearned = learned.slice(Math.max(0, learned.length - learnedRoom))
    merged = [...manuals, ...keptLearned]
  }

  localRoomRules.value = { ...currentByRoom, [roomKey]: merged }

  appendLog(`📚 已学到屏蔽词规则（房间 ${input.roomId}）：${learnedFroms.join('、')}`)

  // Bounded fire-and-forget:之前是无并发上限的 `for ... void syncGuardRoom...`,
  // 一次 learn 多条时会一口气向 guard-room 端点发 N 个 POST(慢端点下排队雪崩)。
  // 用 mapWithConcurrency(..., 3) 限到 3 路并发;每条的错误已在 syncGuardRoom
  // 内被 dedup 的 notifyUser 接住,这里 .catch 兜底防止 Promise.allSettled
  // 之外的未捕获 rejection。
  void mapWithConcurrency(newRules, 3, async rule => {
    try {
      await syncGuardRoomShadowRule({
        roomId: input.roomId,
        from: rule.from,
        to: rule.to,
        sourceText: input.originalMessage,
      })
    } catch {
      // syncGuardRoom* 内部已记 warning;此处吞掉避免 mapWithConcurrency
      // 整体 reject(reject 一次会卡住后面的 task)。
    }
  })
}

export interface RecordShadowBanObservationInput {
  text: string
  roomId?: number
  evadedAlready: boolean
  /**
   * Optional rewrite candidates to attach. When provided, they overwrite the
   * stored candidates for this entry — the freshest generation wins, so
   * users always see the most recent strategies in the panel.
   */
  candidates?: ShadowBypassCandidate[]
}

/**
 * Append a shadow-ban observation. Accumulates count for repeated occurrences
 * of the same (text, roomId), evicts oldest entries past `OBSERVATION_CAP`.
 */
export function recordShadowBanObservation(input: RecordShadowBanObservationInput): void {
  const text = input.text.trim()
  if (!text) return

  const list = shadowBanObservations.value
  const idx = list.findIndex(o => o.text === text && o.roomId === input.roomId)
  const now = Date.now()
  if (idx >= 0) {
    const updated = [...list]
    const prev = updated[idx]
    updated[idx] = {
      ...prev,
      ts: now,
      count: prev.count + 1,
      evadedAlready: prev.evadedAlready || input.evadedAlready,
      // Replace candidates if a fresh batch came in (e.g. AI candidate now
      // available because the user just turned aiEvasion on).
      candidates: input.candidates ?? prev.candidates,
    }
    shadowBanObservations.value = updated
    return
  }

  const entry: ShadowObservation = {
    text,
    roomId: input.roomId,
    ts: now,
    count: 1,
    evadedAlready: input.evadedAlready,
    candidates: input.candidates,
  }
  let next = [...list, entry]
  if (next.length > OBSERVATION_CAP) {
    next = next.slice(next.length - OBSERVATION_CAP)
  }
  shadowBanObservations.value = next
}

/** Test-only helper: drop all entries. Production UI uses targeted removal. */
export function clearShadowBanObservations(): void {
  shadowBanObservations.value = []
}

/** Remove a single observation by (text, roomId) tuple. */
export function removeShadowBanObservation(text: string, roomId?: number): void {
  shadowBanObservations.value = shadowBanObservations.value.filter(o => !(o.text === text && o.roomId === roomId))
}

/** Promote an observation entry into a local room rule on demand (UI button). */
export function promoteObservationToRule(observation: ShadowObservation, to: string): boolean {
  const trimmedText = observation.text.trim()
  const trimmedTo = to.trim()
  if (!trimmedText || trimmedText === trimmedTo) return false
  if (observation.roomId === undefined) return false
  const roomKey = String(observation.roomId)
  const currentByRoom = localRoomRules.value
  const existingRules = currentByRoom[roomKey] ?? []
  if (existingRules.some(r => r.from === trimmedText)) return false
  const merged = [...existingRules, { from: trimmedText, to: trimmedTo }]
  localRoomRules.value = { ...currentByRoom, [roomKey]: merged }
  removeShadowBanObservation(observation.text, observation.roomId)
  void syncGuardRoomShadowRule({
    roomId: observation.roomId,
    from: trimmedText,
    to: trimmedTo,
    sourceText: trimmedText,
  })
  return true
}
