import { ensureRoomId, getCsrfToken, getDedeUid, setRandomDanmakuColor } from './api'
import {
  formatAutoBlendCandidate,
  formatAutoBlendSenderInfo,
  formatAutoBlendStatus,
  shortAutoBlendText,
} from './auto-blend-status'
import { subscribeDanmaku } from './danmaku-stream'
import { appendLog } from './log'
import { clearMemeSession, recordMemeCandidate } from './meme-contributor'
import { applyReplacements } from './replacement'
import { enqueueDanmaku, SendPriority } from './send-queue'
import {
  autoBlendCandidateText,
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendLastActionText,
  autoBlendMinDistinctUsers,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendStatusText,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
  isEmoticonUnique,
  maxLength,
  msgSendInterval,
  randomChar,
  randomColor,
  randomInterval,
} from './store'
import { addRandomCharacter, formatDanmakuError, trimText } from './utils'

interface TrendEvent {
  ts: number
  uid: string | null
}

interface TrendEntry {
  // Each event stores its own timestamp and uid together so pruneExpired can
  // drop both at once. Previously, timestamps and uniqueUids were stored
  // separately, leaving stale uids behind after old timestamps were pruned —
  // inflating the distinct-user count and causing false-positive triggers.
  events: TrendEvent[]
}

// message → rolling-window trend data
const trendMap = new Map<string, TrendEntry>()

// Global hard cooldown: while Date.now() < cooldownUntil, all incoming danmaku
// are discarded. Engaged after every send to prevent echo stacking.
let cooldownUntil = 0

let unsubscribe: (() => void) | null = null
let cleanupTimer: ReturnType<typeof setInterval> | null = null
// Self-rescheduling timeout instead of setInterval: reads autoBlendRoutineIntervalSec
// fresh each tick, so changing the setting takes effect immediately without
// requiring a stop-and-restart.
let routineTimeout: ReturnType<typeof setTimeout> | null = null
let routineActive = false
let myUid: string | null = null
let isSending = false

function countUniqueUids(events: TrendEvent[]): number {
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
    isSending,
    cooldownUntil,
    now: Date.now(),
  })
}

function pruneExpired(now: number): void {
  const windowMs = autoBlendWindowSec.value * 1000
  for (const [k, entry] of trendMap) {
    entry.events = entry.events.filter(e => now - e.ts <= windowMs)
    if (entry.events.length === 0) trendMap.delete(k)
  }
  updateCandidateText()
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

function recordDanmaku(rawText: string, uid: string | null, isReply: boolean): void {
  if (!autoBlendEnabled.value) return

  const now = Date.now()
  if (now < cooldownUntil) {
    updateStatusText()
    return
  }
  updateStatusText()

  const text = rawText.trim()
  if (!text) return
  if (isReply && !autoBlendIncludeReply.value) return

  // Always exclude self to prevent positive feedback loops.
  if (uid && myUid && uid === myUid) return

  pruneExpired(now)

  let entry = trendMap.get(text)
  if (!entry) {
    entry = { events: [] }
    trendMap.set(text, entry)
  }
  entry.events.push({ ts: now, uid })
  updateCandidateText()

  // Immediate trigger: catch the wave the moment threshold is crossed.
  if (meetsThreshold(entry)) {
    void triggerSend(text, 'burst')
  }
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
      appendLog(`自动跟车：还在发，先跳过补跟：${text}`)
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
      appendLog('自动跟车：没检测到登录态，先跳过')
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
      appendLog(`自动跟车：同一波有 ${targets.length} 句话达标，开始依次跟`)
    }

    let memeRecorded = false

    for (let ti = 0; ti < targets.length; ti++) {
      const { text: originalText, uniqueUsers, totalCount } = targets[ti]
      const isEmote = isEmoticonUnique(originalText)
      const useReplacements = autoBlendUseReplacements.value && !isEmote
      const replaced = useReplacements ? applyReplacements(originalText) : originalText
      const wasReplaced = useReplacements && originalText !== replaced

      if (isMulti) {
        appendLog(`  - ${shortAutoBlendText(originalText)}（${formatAutoBlendSenderInfo(uniqueUsers, totalCount)}）`)
      }

      const repeatCount = isMulti ? 1 : Math.max(1, autoBlendSendCount.value)

      for (let i = 0; i < repeatCount; i++) {
        let toSend = replaced
        if (!isEmote && randomChar.value) toSend = addRandomCharacter(toSend)
        if (!isEmote) toSend = trimText(toSend, maxLength.value)[0] ?? toSend

        if (!isEmote && randomColor.value) {
          await setRandomDanmakuColor(roomId, csrfToken)
        }

        const result = await enqueueDanmaku(toSend, roomId, csrfToken, SendPriority.AUTO)
        const display = wasReplaced || toSend !== originalText ? `${originalText} → ${toSend}` : toSend

        if (isMulti) {
          const label = repeatCount > 1 ? `自动跟车 [${i + 1}/${repeatCount}]` : '自动跟车'
          appendLog(result, label, display)
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
            appendLog(`自动跟车${repeatSuffix}：被手动发送打断：${display}`)
          } else if (result.success) {
            autoBlendLastActionText.value = `已跟车：${shortAutoBlendText(display)}`
            appendLog(`已跟车${repeatSuffix}（${info}）：${display}`)
          } else {
            const error = formatDanmakuError(result.error)
            autoBlendLastActionText.value = `没发出去：${shortAutoBlendText(display)}`
            appendLog(`自动跟车没发出去${repeatSuffix}（${info}）：${display}，原因：${error}`)
          }
        }

        if (result.success && !result.cancelled && !isEmote && !memeRecorded) {
          memeRecorded = true
          recordMemeCandidate(originalText)
        }

        if (i < repeatCount - 1) {
          const interval = msgSendInterval.value * 1000
          const offset = randomInterval.value ? Math.floor(Math.random() * 500) : 0
          await new Promise(r => setTimeout(r, Math.max(0, interval - offset)))
        }
      }

      // Gap between different trending messages in a multi-send burst.
      if (isMulti && ti < targets.length - 1) {
        await new Promise(r => setTimeout(r, msgSendInterval.value * 1000))
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    autoBlendLastActionText.value = `出错：${msg}`
    appendLog(`自动跟车出错：${msg}`)
  } finally {
    isSending = false
    updateStatusText()
  }
}

export function startAutoBlend(): void {
  if (unsubscribe) return
  myUid = getDedeUid() ?? null
  autoBlendStatusText.value = '观察中'
  autoBlendCandidateText.value = '暂无'
  autoBlendLastActionText.value = '暂无'

  unsubscribe = subscribeDanmaku({
    onMessage: ev => recordDanmaku(ev.text, ev.uid, ev.isReply),
  })

  if (cleanupTimer === null) {
    cleanupTimer = setInterval(() => {
      pruneExpired(Date.now())
      updateStatusText()
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
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  trendMap.clear()
  clearMemeSession()
  cooldownUntil = 0
  autoBlendStatusText.value = '已关闭'
  autoBlendCandidateText.value = '暂无'
  autoBlendLastActionText.value = '暂无'
}
