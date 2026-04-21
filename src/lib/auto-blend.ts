import { ensureRoomId, getCsrfToken, getDedeUid, setRandomDanmakuColor } from './api'
import { subscribeDanmaku } from './danmaku-stream'
import { appendLog } from './log'
import { tryNominateMeme } from './meme-contributor'
import { applyReplacements } from './replacement'
import { enqueueDanmaku, SendPriority } from './send-queue'
import {
  autoBlendCooldownSec,
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendMinDistinctUsers,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendCount,
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
import { addRandomCharacter, trimText } from './utils'

interface TrendEntry {
  timestamps: number[]
  uniqueUids: Set<string>
}

// message → rolling-window trend data
const trendMap = new Map<string, TrendEntry>()

// Session-level tracker: survives cooldowns, reset on stopAutoBlend()
interface SessionEntry { triggerCount: number; firstSeenAt: number; lastSeenAt: number }
const sessionMap = new Map<string, SessionEntry>()

// Global hard cooldown: while Date.now() < cooldownUntil, all incoming danmaku are
// discarded (not counted). Engaged after every successful send to prevent echo stacking.
let cooldownUntil = 0

let unsubscribe: (() => void) | null = null
let cleanupTimer: ReturnType<typeof setInterval> | null = null
let routineTimer: ReturnType<typeof setInterval> | null = null
let myUid: string | null = null
let isSending = false

function pruneExpired(now: number): void {
  const windowMs = autoBlendWindowSec.value * 1000
  for (const [k, entry] of trendMap) {
    const fresh = entry.timestamps.filter(t => now - t <= windowMs)
    if (fresh.length === 0) {
      trendMap.delete(k)
    } else {
      entry.timestamps = fresh
    }
  }
}

function meetsThreshold(entry: TrendEntry): boolean {
  if (entry.timestamps.length < autoBlendThreshold.value) return false
  if (autoBlendRequireDistinctUsers.value && entry.uniqueUids.size < autoBlendMinDistinctUsers.value) return false
  return true
}

function recordDanmaku(rawText: string, uid: string | null, isReply: boolean): void {
  if (!autoBlendEnabled.value) return

  const now = Date.now()
  if (now < cooldownUntil) return

  const text = rawText.trim()
  if (!text) return
  if (isReply && !autoBlendIncludeReply.value) return

  // Always exclude self to prevent positive feedback loops.
  if (uid && myUid && uid === myUid) return

  pruneExpired(now)

  let entry = trendMap.get(text)
  if (!entry) {
    entry = { timestamps: [], uniqueUids: new Set() }
    trendMap.set(text, entry)
  }
  entry.timestamps.push(now)
  if (uid) entry.uniqueUids.add(uid)

  // Immediate trigger: catch the wave the moment threshold is crossed.
  if (meetsThreshold(entry)) {
    void triggerSend(text, 'burst')
  }
}

function routineTimerTick(): void {
  if (!autoBlendEnabled.value) return
  const now = Date.now()
  if (now < cooldownUntil) return

  pruneExpired(now)

  // Collect candidates that meet the threshold.
  const candidates: Array<[string, number]> = []
  for (const [text, entry] of trendMap) {
    if (meetsThreshold(entry)) {
      candidates.push([text, entry.timestamps.length])
    }
  }
  if (candidates.length === 0) return

  // Weighted random choice: W_i = count_i / sum_counts
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

async function triggerSend(originalText: string, reason: string): Promise<void> {
  // Claim the slot atomically. If a send is already in-flight, bail without
  // engaging cooldown so the trend keeps accumulating.
  if (isSending) return
  isSending = true

  // Engage cooldown up front and wipe pending data so nothing accumulates
  // during the freeze and re-fires the instant it ends.
  cooldownUntil = Date.now() + autoBlendCooldownSec.value * 1000
  trendMap.clear()

  try {
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      appendLog('🚲 自动融入：未登录，跳过')
      return
    }
    const roomId = await ensureRoomId()

    const isEmote = isEmoticonUnique(originalText)
    const useReplacements = autoBlendUseReplacements.value && !isEmote
    const replaced = useReplacements ? applyReplacements(originalText) : originalText
    const wasReplaced = useReplacements && originalText !== replaced

    const reasonLabel = reason === 'burst' ? '爆发' : '例行'
    appendLog(`🚲 自动融入触发 (${reasonLabel}): ${originalText}`)

    const repeatCount = Math.max(1, autoBlendSendCount.value)
    let firstSuccess = false

    for (let i = 0; i < repeatCount; i++) {
      let toSend = replaced
      if (!isEmote && randomChar.value) toSend = addRandomCharacter(toSend)
      if (!isEmote) toSend = trimText(toSend, maxLength.value)[0] ?? toSend

      if (!isEmote && randomColor.value) {
        await setRandomDanmakuColor(roomId, csrfToken)
      }

      const result = await enqueueDanmaku(toSend, roomId, csrfToken, SendPriority.AUTO)
      const baseLabel = result.isEmoticon ? '自动融入(表情)' : '自动融入'
      const label = repeatCount > 1 ? `${baseLabel} [${i + 1}/${repeatCount}]` : baseLabel
      const display = wasReplaced || toSend !== originalText ? `${originalText} → ${toSend}` : toSend
      appendLog(result, label, display)

      // Update session tracker only on first successful send to avoid inflating count.
      if (result.success && !result.cancelled && !isEmote && !firstSuccess) {
        firstSuccess = true
        const now = Date.now()
        const sess = sessionMap.get(originalText) ?? { triggerCount: 0, firstSeenAt: now, lastSeenAt: now }
        sess.triggerCount++
        sess.lastSeenAt = now
        sessionMap.set(originalText, sess)
        tryNominateMeme(originalText, sess.triggerCount, sess.lastSeenAt - sess.firstSeenAt)
      }

      if (i < repeatCount - 1) {
        const interval = msgSendInterval.value * 1000
        const offset = randomInterval.value ? Math.floor(Math.random() * 500) : 0
        await new Promise(r => setTimeout(r, Math.max(0, interval - offset)))
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(`🔴 自动融入出错：${msg}`)
  } finally {
    isSending = false
  }
}

export function startAutoBlend(): void {
  if (unsubscribe) return
  myUid = getDedeUid() ?? null

  unsubscribe = subscribeDanmaku({
    onMessage: ev => recordDanmaku(ev.text, ev.uid, ev.isReply),
  })

  if (cleanupTimer === null) {
    cleanupTimer = setInterval(() => pruneExpired(Date.now()), 5000)
  }

  if (routineTimer === null) {
    routineTimer = setInterval(routineTimerTick, autoBlendRoutineIntervalSec.value * 1000)
  }
}

export function stopAutoBlend(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  if (routineTimer) {
    clearInterval(routineTimer)
    routineTimer = null
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  trendMap.clear()
  sessionMap.clear()
  cooldownUntil = 0
}
