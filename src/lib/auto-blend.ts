import {
  checkSelfRoomRestrictions,
  ensureRoomId,
  getCsrfToken,
  getDedeUid,
  type SendDanmakuResult,
  setRandomDanmakuColor,
} from './api'
import { isAutoBlendBlacklistedUid } from './auto-blend-blacklist'
import { logAutoBlend, logAutoBlendSendResult } from './auto-blend-events'
import {
  formatAutoBlendCandidate,
  formatAutoBlendSenderInfo,
  formatAutoBlendStatus,
  shortAutoBlendText,
} from './auto-blend-status'
import { detectTrend, type TrendEvent } from './auto-blend-trend'
import { subscribeCustomChatEvents } from './custom-chat-events'
import { subscribeDanmaku } from './danmaku-stream'
import { formatLockedEmoticonReject, isEmoticonUnique, isLockedEmoticon } from './emoticon'
import { classifyRiskEvent, syncGuardRoomRiskEvent } from './guard-room-sync'
import { startLiveWsSource, stopLiveWsSource } from './live-ws-source'
import { clearMemeSession, recordMemeCandidate } from './meme-contributor'
import {
  classifyByCode,
  describeRestrictionDuration,
  isAccountRestrictedError,
  isMutedError,
  isRateLimitError,
} from './moderation'
import { applyReplacements } from './replacement'
import { enqueueDanmaku, SendPriority } from './send-queue'
import { SEND_ECHO_TIMEOUT_MS, waitForSentEcho } from './send-verification'
import {
  autoBlendBurstSettleMs,
  autoBlendCandidateText,
  autoBlendCooldownSec,
  autoBlendDryRun,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendLastActionText,
  autoBlendMinDistinctUsers,
  autoBlendRateLimitStopThreshold,
  autoBlendRateLimitWindowMin,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendStatusText,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
  cachedRoomId,
  maxLength,
  msgSendInterval,
  randomChar,
  randomColor,
  randomInterval,
} from './store'
import { addRandomCharacter, formatDanmakuError, trimText } from './utils'

export { detectTrend, type TrendCandidate, type TrendEvent, type TrendResult } from './auto-blend-trend'

interface TrendRecordEvent {
  ts: number
  uid: string | null
}

interface TrendEntry {
  // Each event stores its own timestamp and uid together so pruneExpired can
  // drop both at once. Previously, timestamps and uniqueUids were stored
  // separately, leaving stale uids behind after old timestamps were pruned —
  // inflating the distinct-user count and causing false-positive triggers.
  events: TrendRecordEvent[]
}

// message → rolling-window trend data
const trendMap = new Map<string, TrendEntry>()
let nextTrendPruneAt = Number.POSITIVE_INFINITY
let lastPruneWindowMs = 0

// Global hard cooldown: while Date.now() < cooldownUntil, all incoming danmaku
// are discarded. Engaged after every send to prevent echo stacking.
let cooldownUntil = 0

let unsubscribe: (() => void) | null = null
let unsubscribeWsDanmaku: (() => void) | null = null
let cleanupTimer: ReturnType<typeof setInterval> | null = null
let burstSettleTimer: ReturnType<typeof setTimeout> | null = null
let pendingBurstText: string | null = null
// Self-rescheduling timeout instead of setInterval: reads autoBlendRoutineIntervalSec
// fresh each tick, so changing the setting takes effect immediately without
// requiring a stop-and-restart.
let routineTimeout: ReturnType<typeof setTimeout> | null = null
let routineActive = false
let myUid: string | null = null
let isSending = false
let rateLimitHitCount = 0
let firstRateLimitHitAt = 0
let moderationStopReason: string | null = null
let consecutiveSilentDrops = 0
const SILENT_DROP_CHECK_THRESHOLD = 3

// Let a freshly-started wave breathe briefly before following it. With a
// threshold of 2, firing on the exact second message makes every log look like
// "just started, 2 messages" and prevents all-trending mode from seeing the
// rest of the same wave.
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000

function getBurstSettleMs(): number {
  return Math.max(0, autoBlendBurstSettleMs.value)
}

function getRateLimitWindowMs(): number {
  return Math.max(1, autoBlendRateLimitWindowMin.value) * 60 * 1000
}

function getRateLimitStopThreshold(): number {
  return Math.max(1, autoBlendRateLimitStopThreshold.value)
}

function getRateLimitWindowLabel(): string {
  return `${Math.max(1, autoBlendRateLimitWindowMin.value)} 分钟内`
}

function clearPendingAutoBlend(reason: string): void {
  if (burstSettleTimer) {
    clearTimeout(burstSettleTimer)
    burstSettleTimer = null
  }
  pendingBurstText = null
  trendMap.clear()
  nextTrendPruneAt = Number.POSITIVE_INFINITY
  lastPruneWindowMs = 0
  updateCandidateText()
  autoBlendLastActionText.value = reason
}

function stopAutoBlendAfterModeration(reason: string): void {
  moderationStopReason = reason
  clearPendingAutoBlend(reason)
  autoBlendEnabled.value = false
  logAutoBlend(reason, reason.startsWith('🔴') ? 'error' : 'warning')
}

function handleSendFailure(result: SendDanmakuResult, roomId?: number): boolean {
  const now = Date.now()
  const error = result.error
  const duration = describeRestrictionDuration(result.error, result.errorData)
  const codeKind = classifyByCode(result.errorCode)

  if (codeKind === 'muted' || (codeKind === null && isMutedError(error))) {
    const risk = classifyRiskEvent(result.error, result.errorData)
    void syncGuardRoomRiskEvent({
      ...risk,
      source: 'auto-blend',
      roomId,
      errorCode: result.errorCode,
      reason: result.error,
    })
    stopAutoBlendAfterModeration(`🔴 自动跟车：检测到你在本房间被禁言，已自动关闭。禁言时长：${duration}。`)
    return true
  }

  if (codeKind === 'account' || (codeKind === null && isAccountRestrictedError(error))) {
    const risk = classifyRiskEvent(result.error, result.errorData)
    void syncGuardRoomRiskEvent({
      ...risk,
      source: 'auto-blend',
      roomId,
      errorCode: result.errorCode,
      reason: result.error,
    })
    stopAutoBlendAfterModeration(`🔴 自动跟车：检测到账号级限制/风控，已自动关闭。限制时长：${duration}。`)
    return true
  }

  const isRateLimit = codeKind === 'rate-limit' || (codeKind === null && isRateLimitError(error))
  if (!isRateLimit) {
    const risk = classifyRiskEvent(result.error, result.errorData)
    void syncGuardRoomRiskEvent({
      ...risk,
      source: 'auto-blend',
      roomId,
      errorCode: result.errorCode,
      reason: result.error,
    })
    return false
  }

  if (now - firstRateLimitHitAt > getRateLimitWindowMs()) {
    firstRateLimitHitAt = now
    rateLimitHitCount = 0
  }
  rateLimitHitCount += 1

  if (rateLimitHitCount >= getRateLimitStopThreshold()) {
    const windowLabel = getRateLimitWindowLabel()
    void syncGuardRoomRiskEvent({
      kind: 'rate_limited',
      source: 'auto-blend',
      level: 'stop',
      roomId,
      errorCode: result.errorCode,
      reason: result.error,
      advice: `${windowLabel}多次触发频率限制，自动跟车已经停车，建议休息一阵再开。`,
    })
    stopAutoBlendAfterModeration(
      `⚠️ 自动跟车：${windowLabel}多次触发发送频率限制，已自动关闭，避免继续被系统/房管盯上。`
    )
    return true
  }

  void syncGuardRoomRiskEvent({
    kind: 'rate_limited',
    source: 'auto-blend',
    level: 'observe',
    roomId,
    errorCode: result.errorCode,
    reason: result.error,
    advice: '触发发送频率限制，自动跟车会先歇 2 分钟。',
  })
  cooldownUntil = Math.max(cooldownUntil, now + RATE_LIMIT_BACKOFF_MS)
  clearPendingAutoBlend(
    `自动跟车：触发发送频率限制，已暂停 ${Math.round(RATE_LIMIT_BACKOFF_MS / 60000)} 分钟并清空本轮候选。`
  )
  updateStatusText()
  return true
}

function countUniqueUids(events: TrendRecordEvent[]): number {
  const s = new Set<string>()
  for (const e of events) if (e.uid) s.add(e.uid)
  return s.size
}

function updateCandidateText(): void {
  autoBlendCandidateText.value = formatAutoBlendCandidate(
    Array.from(trendMap, ([text, entry]) => ({
      text,
      totalCount: entry.events.length,
      uniqueUsers: countUniqueUids(entry.events),
    }))
  )
}

function updateStatusText(): void {
  autoBlendStatusText.value = formatAutoBlendStatus({
    enabled: autoBlendEnabled.value,
    dryRun: autoBlendDryRun.value,
    isSending,
    cooldownUntil,
    now: Date.now(),
  })
}

function pruneExpired(now: number, force = false): void {
  const windowMs = autoBlendWindowSec.value * 1000
  if (!force && windowMs === lastPruneWindowMs && now < nextTrendPruneAt) return
  lastPruneWindowMs = windowMs
  let next = Number.POSITIVE_INFINITY
  for (const [k, entry] of trendMap) {
    entry.events = entry.events.filter(e => now - e.ts <= windowMs)
    if (entry.events.length === 0) trendMap.delete(k)
    else next = Math.min(next, entry.events[0].ts + windowMs + 1)
  }
  nextTrendPruneAt = next
  updateCandidateText()
}

function getAutoBlendRepeatGapMs(): number {
  return Math.max(autoBlendCooldownSec.value * 1000, msgSendInterval.value * 1000, 1010)
}

function getAutoBlendBurstGapMs(): number {
  return Math.max(msgSendInterval.value * 1000, 1010)
}

function meetsThreshold(entry: TrendEntry): boolean {
  if (entry.events.length < autoBlendThreshold.value) return false
  if (autoBlendRequireDistinctUsers.value) {
    const uniqueUids = countUniqueUids(entry.events)
    // Fallback: when uid extraction fails for every event (e.g. after a Bilibili
    // DOM change), treat total count as a proxy for unique users so the feature
    // keeps working. Worst case: a single spammer counts as one "user".
    const effectiveUnique = uniqueUids > 0 ? uniqueUids : entry.events.length
    if (effectiveUnique < autoBlendMinDistinctUsers.value) return false
  }
  return true
}

function pickBestTrendingText(preferredText: string | null): string | null {
  const windowMs = autoBlendWindowSec.value * 1000
  const events: TrendEvent[] = []
  for (const [text, entry] of trendMap) {
    if (!meetsThreshold(entry)) continue
    for (const event of entry.events) events.push({ ...event, text })
  }
  const result = detectTrend(events, windowMs, autoBlendThreshold.value)
  if (!result.shouldSend) return null
  if (preferredText && result.candidates.some(candidate => candidate.text === preferredText)) return preferredText
  return result.text
}

function scheduleBurstSend(text: string): void {
  pendingBurstText ??= text
  if (burstSettleTimer !== null) return

  burstSettleTimer = setTimeout(() => {
    burstSettleTimer = null
    const preferredText = pendingBurstText
    pendingBurstText = null

    if (!autoBlendEnabled.value || isSending || Date.now() < cooldownUntil) {
      updateStatusText()
      return
    }

    pruneExpired(Date.now())
    const chosen = pickBestTrendingText(preferredText)
    if (chosen !== null) void triggerSend(chosen, 'burst')
  }, getBurstSettleMs())
}

function maybeScheduleBurstFromCurrentTrends(): void {
  if (!autoBlendEnabled.value || isSending || Date.now() < cooldownUntil || burstSettleTimer !== null) return
  const chosen = pickBestTrendingText(pendingBurstText)
  if (chosen !== null) scheduleBurstSend(chosen)
}

function recordDanmaku(rawText: string, uid: string | null, isReply: boolean): void {
  if (!autoBlendEnabled.value) return

  const now = Date.now()
  updateStatusText()

  const text = rawText.trim()
  if (!text) return
  if (isReply && !autoBlendIncludeReply.value) return

  // Always exclude self to prevent positive feedback loops.
  if (uid && myUid && uid === myUid) return
  if (isAutoBlendBlacklistedUid(uid)) return
  if (isLockedEmoticon(text)) return

  pruneExpired(now)

  let entry = trendMap.get(text)
  if (!entry) {
    entry = { events: [] }
    trendMap.set(text, entry)
  }
  entry.events.push({ ts: now, uid })
  const expiresAt = now + autoBlendWindowSec.value * 1000 + 1
  if (expiresAt < nextTrendPruneAt) nextTrendPruneAt = expiresAt
  updateCandidateText()

  // During cooldown/sending we still keep counting, but defer the actual follow
  // until the feature is allowed to send again. This preserves the wave for
  // later routine or burst handling instead of throwing away the hottest part.
  if (now < cooldownUntil || isSending) return

  if (meetsThreshold(entry)) scheduleBurstSend(text)
}

function scheduleNextRoutine(): void {
  routineTimeout = setTimeout(() => {
    routineTimerTick()
    if (routineActive) scheduleNextRoutine()
  }, autoBlendRoutineIntervalSec.value * 1000)
}

function routineTimerTick(): void {
  if (!autoBlendEnabled.value) return
  const now = Date.now()
  if (now < cooldownUntil) {
    updateStatusText()
    return
  }
  updateStatusText()

  pruneExpired(now)

  // Collect candidates that meet the threshold.
  const candidates: Array<[string, number]> = []
  for (const [text, entry] of trendMap) {
    if (meetsThreshold(entry)) {
      candidates.push([text, entry.events.length])
    }
  }
  if (candidates.length === 0) return

  // Weighted random choice: W_i = count_i / sum_counts.
  // Over many ticks this naturally sends more-popular messages more often —
  // proportional distribution without needing a separate multi-send mechanism.
  const totalWeight = candidates.reduce((s, [, c]) => s + c, 0)
  let r = Math.random() * totalWeight
  let chosen = candidates[candidates.length - 1][0]
  for (const [text, count] of candidates) {
    r -= count
    if (r <= 0) {
      chosen = text
      break
    }
  }

  void triggerSend(chosen, 'routine')
}

/**
 * Collects the list of messages to send for this trigger.
 * - Routine: always just the one chosen message.
 * - Burst + sendAllTrending: every message currently meeting threshold, sorted
 *   by count descending (triggered text first on ties). Each is sent once,
 *   regardless of autoBlendSendCount (which still applies per-message for
 *   single-message triggers to avoid combinatorial spam).
 */
function collectBurst(
  triggeredText: string,
  reason: string
): Array<{ text: string; uniqueUsers: number; totalCount: number }> {
  if (reason !== 'burst' || !autoBlendSendAllTrending.value) {
    const entry = trendMap.get(triggeredText)
    const uniqueUsers = entry ? countUniqueUids(entry.events) : 0
    const totalCount = entry ? entry.events.length : 0
    return [{ text: triggeredText, uniqueUsers, totalCount }]
  }

  const all: Array<{ text: string; uniqueUsers: number; totalCount: number }> = []
  for (const [text, entry] of trendMap) {
    if (meetsThreshold(entry)) {
      all.push({ text, uniqueUsers: countUniqueUids(entry.events), totalCount: entry.events.length })
    }
  }

  // Sort by count descending; triggered text wins ties.
  all.sort((a, b) => {
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount
    return a.text === triggeredText ? -1 : 1
  })

  return all.length > 0 ? all : [{ text: triggeredText, uniqueUsers: 0, totalCount: 0 }]
}

async function triggerSend(triggeredText: string, reason: string): Promise<void> {
  // Claim the slot atomically. Bail without engaging cooldown so the trend
  // keeps accumulating and can re-evaluate once this send completes.
  if (isSending) {
    // Only log for routine skips — burst can fire dozens of times per second
    // during a wave, which would flood the log panel.
    if (reason === 'routine') {
      const text = shortAutoBlendText(triggeredText)
      autoBlendLastActionText.value = `还在发，先跳过：${text}`
      logAutoBlend(`自动跟车：还在发，先跳过补跟：${text}`)
    }
    return
  }
  isSending = true
  updateStatusText()

  pruneExpired(Date.now())
  const targets = collectBurst(triggeredText, reason)

  // Engage cooldown and remove all targeted entries so they don't immediately
  // re-trigger when cooldown ends. Non-targeted entries keep their counts.
  cooldownUntil = Date.now() + autoBlendCooldownSec.value * 1000
  for (const { text } of targets) trendMap.delete(text)
  updateCandidateText()
  updateStatusText()

  try {
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      autoBlendLastActionText.value = '未登录，跳过'
      logAutoBlend('自动跟车：没检测到登录态，先跳过', 'warning')
      return
    }
    const roomId = await ensureRoomId()

    const reasonLabel = reason === 'burst' ? '刚刷起来' : '补跟'

    // For multi-trend burst: log the summary header upfront.
    // For single target: skip the trigger line — result will carry all info in one line.
    // For multi-trend burst each message is sent once; for single-message
    // triggers autoBlendSendCount controls how many times to repeat.
    const isMulti = targets.length > 1
    if (isMulti) {
      logAutoBlend(`自动跟车：同一波有 ${targets.length} 句话达标，开始依次跟`)
    }

    let memeRecorded = false

    for (let ti = 0; ti < targets.length; ti++) {
      const { text: originalText, uniqueUsers, totalCount } = targets[ti]
      if (isLockedEmoticon(originalText)) {
        logAutoBlend(formatLockedEmoticonReject(originalText, '自动跟车(表情)'), 'warning')
        continue
      }
      const isEmote = isEmoticonUnique(originalText)
      const useReplacements = autoBlendUseReplacements.value && !isEmote
      const replaced = useReplacements ? applyReplacements(originalText) : originalText
      const wasReplaced = useReplacements && originalText !== replaced

      if (isMulti) {
        logAutoBlend(`  - ${shortAutoBlendText(originalText)}（${formatAutoBlendSenderInfo(uniqueUsers, totalCount)}）`)
      }

      const repeatCount =
        reason === 'burst' && autoBlendSendAllTrending.value ? 1 : Math.max(1, autoBlendSendCount.value)

      for (let i = 0; i < repeatCount; i++) {
        let toSend = replaced
        if (!isEmote && randomChar.value) toSend = addRandomCharacter(toSend)
        if (!isEmote) toSend = trimText(toSend, maxLength.value)[0] ?? toSend

        if (!isEmote && randomColor.value) {
          await setRandomDanmakuColor(roomId, csrfToken)
        }

        const display = wasReplaced || toSend !== originalText ? `${originalText} → ${toSend}` : toSend

        if (autoBlendDryRun.value) {
          autoBlendLastActionText.value = `试运行命中：${shortAutoBlendText(display)}`
          logAutoBlend(`自动跟车试运行（未发送）：${display}`)
          continue
        }

        const result = await enqueueDanmaku(toSend, roomId, csrfToken, SendPriority.AUTO)

        if (isMulti) {
          const label = repeatCount > 1 ? `自动跟车 [${i + 1}/${repeatCount}]` : '自动跟车'
          logAutoBlendSendResult(result, label, display)
          if (result.success && !result.cancelled) {
            autoBlendLastActionText.value = `已跟车：${shortAutoBlendText(display)}`
          } else if (result.cancelled) {
            autoBlendLastActionText.value = `被手动发送打断：${shortAutoBlendText(display)}`
          } else {
            autoBlendLastActionText.value = `没发出去：${shortAutoBlendText(display)}`
          }
        } else {
          // Single target: one compact line combining trigger info + result.
          const info = `${reasonLabel}，${formatAutoBlendSenderInfo(uniqueUsers, totalCount)}`
          const repeatSuffix = repeatCount > 1 ? ` [${i + 1}/${repeatCount}]` : ''
          if (result.cancelled) {
            autoBlendLastActionText.value = `被手动发送打断：${shortAutoBlendText(display)}`
            logAutoBlend(`自动跟车${repeatSuffix}：被手动发送打断：${display}`)
          } else if (result.success) {
            autoBlendLastActionText.value = `已跟车：${shortAutoBlendText(display)}`
            logAutoBlend(`已跟车${repeatSuffix}（${info}）：${display}`)
          } else {
            const error = formatDanmakuError(result.error)
            autoBlendLastActionText.value = `没发出去：${shortAutoBlendText(display)}`
            logAutoBlend(`自动跟车没发出去${repeatSuffix}（${info}）：${display}，原因：${error}`, 'error')
          }
        }

        if (result.success && !result.cancelled) {
          autoBlendLastActionText.value = `已提交，等待回显：${shortAutoBlendText(display)}`
          const echoSource = await waitForSentEcho(toSend, myUid, result.startedAt ?? Date.now())
          if (echoSource === 'ws' || echoSource === 'dom') {
            consecutiveSilentDrops = 0
            const sourceLabel = echoSource === 'ws' ? 'WS' : 'DOM'
            autoBlendLastActionText.value = `已${sourceLabel}回显：${shortAutoBlendText(display)}`
          } else {
            // API accepted (code 0) but no WS/DOM broadcast echo — Bilibili silently
            // discarded the message. Common causes: muted in room, fan medal required,
            // account risk control, or send frequency too high.
            consecutiveSilentDrops++
            autoBlendLastActionText.value = `接口成功未见广播：${shortAutoBlendText(display)}`
            logAutoBlend(
              `自动跟车接口成功，但 ${Math.round(SEND_ECHO_TIMEOUT_MS / 1000)}s 内未看到广播回显：${display}`,
              'warning'
            )

            if (consecutiveSilentDrops >= SILENT_DROP_CHECK_THRESHOLD) {
              consecutiveSilentDrops = 0
              logAutoBlend('自动跟车：连续多次未见广播，正在巡检当前房间限制状态…')
              try {
                const signals = await checkSelfRoomRestrictions(roomId)
                if (signals.length > 0) {
                  const desc = signals.map(s => `${s.message}（${s.duration}）`).join('；')
                  stopAutoBlendAfterModeration(`🔴 自动跟车：巡检发现限制，已自动关闭：${desc}`)
                  return
                }
                logAutoBlend(
                  '自动跟车：巡检未发现明确禁言/限制，弹幕仍未广播。可能原因：该房间需要粉丝牌、发送频率过快、或账号存在风控。'
                )
              } catch {
                logAutoBlend('自动跟车：巡检请求失败，无法确认限制原因。', 'warning')
              }
            }
          }
        }

        if (!result.success && !result.cancelled && handleSendFailure(result, roomId)) return

        if (result.success && !result.cancelled && !isEmote && !memeRecorded) {
          memeRecorded = true
          recordMemeCandidate(originalText, roomId)
        }

        cooldownUntil = Math.max(cooldownUntil, Date.now() + autoBlendCooldownSec.value * 1000)
        updateStatusText()

        if (i < repeatCount - 1) {
          const interval = getAutoBlendRepeatGapMs()
          const offset = randomInterval.value ? Math.floor(Math.random() * 500) : 0
          await new Promise(r => setTimeout(r, interval + offset))
        }
      }

      // Gap between different trending messages in a multi-send burst.
      if (isMulti && ti < targets.length - 1) {
        await new Promise(r => setTimeout(r, getAutoBlendBurstGapMs()))
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    autoBlendLastActionText.value = `出错：${msg}`
    logAutoBlend('自动跟车出错', 'error', msg)
  } finally {
    isSending = false
    updateStatusText()
  }
}

export function startAutoBlend(): void {
  if (unsubscribe) return
  myUid = getDedeUid() ?? null
  rateLimitHitCount = 0
  firstRateLimitHitAt = 0
  moderationStopReason = null
  consecutiveSilentDrops = 0
  nextTrendPruneAt = Number.POSITIVE_INFINITY
  lastPruneWindowMs = 0
  autoBlendStatusText.value = '观察中'
  autoBlendCandidateText.value = '暂无'
  autoBlendLastActionText.value = '暂无'

  unsubscribe = subscribeDanmaku({
    onMessage: ev => recordDanmaku(ev.text, ev.uid, ev.isReply),
  })
  startLiveWsSource()
  unsubscribeWsDanmaku = subscribeCustomChatEvents(event => {
    if (event.kind !== 'danmaku' || event.source !== 'ws') return
    recordDanmaku(event.text, event.uid, event.isReply)
  })

  if (cleanupTimer === null) {
    cleanupTimer = setInterval(() => {
      // Skip the full pipeline (prune + status format + burst scheduling)
      // when there's nothing to evaluate. This timer fires once a second for
      // the entire feature lifetime, including idle rooms.
      if (trendMap.size === 0) return
      pruneExpired(Date.now())
      updateStatusText()
      maybeScheduleBurstFromCurrentTrends()
    }, 1000)
  }

  routineActive = true
  scheduleNextRoutine()
}

export function stopAutoBlend(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  routineActive = false
  if (routineTimeout) {
    clearTimeout(routineTimeout)
    routineTimeout = null
  }
  if (burstSettleTimer) {
    clearTimeout(burstSettleTimer)
    burstSettleTimer = null
  }
  pendingBurstText = null
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (unsubscribeWsDanmaku) {
    unsubscribeWsDanmaku()
    unsubscribeWsDanmaku = null
  }
  stopLiveWsSource()
  trendMap.clear()
  nextTrendPruneAt = Number.POSITIVE_INFINITY
  lastPruneWindowMs = 0
  const currentRoomId = cachedRoomId.peek()
  if (currentRoomId !== null) clearMemeSession(currentRoomId)
  cooldownUntil = 0
  autoBlendStatusText.value = '已关闭'
  autoBlendCandidateText.value = '暂无'
  autoBlendLastActionText.value = moderationStopReason ?? '暂无'
  moderationStopReason = null
}
