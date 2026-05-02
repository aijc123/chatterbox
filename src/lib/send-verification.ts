/**
 * Real-broadcast verification for outgoing danmaku.
 *
 * Bilibili can return `code: 0` from `/msg/send` (API-level success) yet
 * silently drop the message from the live broadcast (shadow ban / fan-medal
 * gating / risk control). The only reliable way to confirm a send actually
 * reached the room is to wait for the same text to come back through the
 * danmaku WebSocket or DOM observer.
 *
 * `waitForSentEcho` is the primitive (originally extracted from auto-blend)
 * and `verifyBroadcast` is the higher-level helper that the four send paths
 * (auto-blend, loop, manual/+1, native B站 input) call to log a `⚠️` warning
 * when the API succeeded but no broadcast echo arrived within the timeout.
 */

import { tryAiEvasion } from './ai-evasion'
import { getDedeUid } from './api'
import {
  type CustomChatEvent,
  findRecentCustomChatDanmakuSource,
  subscribeCustomChatEvents,
} from './custom-chat-events'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'
import { isEmoticonUnique } from './emoticon'
import { appendLog, appendLogQuiet } from './log'
import { learnShadowRules, recordShadowBanObservation } from './shadow-learn'
import { aiEvasion } from './store'

export const SEND_ECHO_TIMEOUT_MS = 4000
export type EchoSource = 'ws' | 'dom' | 'local' | null

const RECENT_DOM_DANMAKU_HISTORY_MS = 15_000
const RECENT_DOM_DANMAKU_HISTORY_MAX = 240

const recentDomDanmaku: Array<{ text: string; uid: string | null; observedAt: number }> = []

function pruneRecentDomDanmaku(now = Date.now()): void {
  while (recentDomDanmaku.length > 0 && now - recentDomDanmaku[0].observedAt > RECENT_DOM_DANMAKU_HISTORY_MS) {
    recentDomDanmaku.shift()
  }
  while (recentDomDanmaku.length > RECENT_DOM_DANMAKU_HISTORY_MAX) {
    recentDomDanmaku.shift()
  }
}

export function rememberRecentDomDanmaku(text: string, uid: string | null, observedAt: number): void {
  if (!text) return
  pruneRecentDomDanmaku(observedAt)
  recentDomDanmaku.push({ text, uid, observedAt })
}

function findRecentDomDanmakuSource(text: string, uid: string | null, sinceTs: number): 'dom' | null {
  const target = text.trim()
  if (!target) return null
  pruneRecentDomDanmaku()
  for (let i = recentDomDanmaku.length - 1; i >= 0; i--) {
    const event = recentDomDanmaku[i]
    if (event.observedAt < sinceTs) break
    if (event.text !== target) continue
    if (uid && event.uid && event.uid !== uid) continue
    return 'dom'
  }
  return null
}

export function clearRecentDomDanmaku(): void {
  recentDomDanmaku.length = 0
}

function matchesCustomChatEchoEvent(event: CustomChatEvent, target: string, uid: string | null): boolean {
  return event.kind === 'danmaku' && event.text.trim() === target && (!uid || !event.uid || event.uid === uid)
}

function matchesDomEchoEvent(event: DanmakuEvent, target: string, uid: string | null): boolean {
  return event.text.trim() === target && (!uid || !event.uid || event.uid === uid)
}

// DOM observer is lazily attached on first `waitForSentEcho` call so that
// loop/manual/native paths can verify even when auto-blend isn't running.
// `subscribeDanmaku` is ref-counted; one extra callback is essentially free.
let domSubscribed = false
function ensureDomTracking(): void {
  if (domSubscribed) return
  domSubscribed = true
  subscribeDanmaku({
    onMessage: ev => rememberRecentDomDanmaku(ev.text, ev.uid, Date.now()),
  })
}

/**
 * Resolves with the source of the broadcast echo if observed within `timeoutMs`,
 * otherwise resolves to `'local'` (only local API echo seen → likely shadow-ban)
 * or `null` (nothing observed at all).
 */
export function waitForSentEcho(
  text: string,
  uid: string | null,
  sinceTs: number,
  timeoutMs = SEND_ECHO_TIMEOUT_MS
): Promise<EchoSource> {
  ensureDomTracking()
  const target = text.trim()
  if (!target) return Promise.resolve(null)
  // Only count real broadcast echoes (ws/dom) as immediate confirmation.
  // 'local' is emitted synchronously inside sendDanmaku and would always
  // short-circuit this check before any WS echo has a chance to arrive.
  const recentCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs)
  if (recentCustomSource && recentCustomSource !== 'local') return Promise.resolve(recentCustomSource)
  const recentDomSource = findRecentDomDanmakuSource(target, uid, sinceTs)
  if (recentDomSource) return Promise.resolve(recentDomSource)

  return new Promise(resolve => {
    let done = false
    let unsubscribeEvents = () => {}
    let unsubscribeDom = () => {}
    const finish = (source: EchoSource) => {
      if (done) return
      done = true
      clearTimeout(timer)
      unsubscribeEvents()
      unsubscribeDom()
      resolve(source)
    }
    // After timeout, fall back to 'local' if the API echo exists — means the
    // message was sent and shown locally but no broadcast was detected.
    const timer = setTimeout(() => {
      const localFallback = findRecentCustomChatDanmakuSource(target, uid, sinceTs)
      finish(localFallback === 'local' ? 'local' : null)
    }, timeoutMs)
    unsubscribeEvents = subscribeCustomChatEvents(event => {
      if (!matchesCustomChatEchoEvent(event, target, uid)) return
      // Ignore local events mid-wait; only real broadcast sources count.
      if (event.source !== 'local') finish(event.source)
    })
    unsubscribeDom = subscribeDanmaku({
      onMessage: event => {
        if (!matchesDomEchoEvent(event, target, uid)) return
        finish('dom')
      },
    })
    // Late check: only real broadcast sources.
    const lateCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs)
    const lateDomSource = findRecentDomDanmakuSource(target, uid, sinceTs)
    const lateSource = (lateCustomSource !== 'local' ? lateCustomSource : null) ?? lateDomSource
    if (lateSource) finish(lateSource)
  })
}

export interface VerifyBroadcastInput {
  /** Text that should appear in the live broadcast (use the post-replacement form). */
  text: string
  /** Log label, e.g. `'手动'`, `'自动'`, `'+1'`, `'B站原生'`. */
  label: string
  /** Display text used in the log line (may include `→` replacement hint). */
  display: string
  /** Send start timestamp — typically `result.startedAt`. */
  sinceTs: number
  /** Skip verification for emoticon-only sends (their broadcast text often differs). */
  isEmoticon?: boolean
  /** Allow surfacing a Toast for the warning. Default `true`. */
  surfaceToast?: boolean
  /** When provided, suppress duplicate Toasts for the same key within a 30s window. */
  toastDedupeKey?: string
  /** Override the echo wait window. Defaults to `SEND_ECHO_TIMEOUT_MS`. */
  timeoutMs?: number
  /** Allow `verifyBroadcast` to call `tryAiEvasion` when broadcast fails. Requires `roomId` + `csrfToken`. */
  enableAiEvasion?: boolean
  /** Required when `enableAiEvasion` is true: room id used by `tryAiEvasion` for the resend. */
  roomId?: number
  /** Required when `enableAiEvasion` is true: csrf token used by `tryAiEvasion` for the resend. */
  csrfToken?: string
  /** Internal: tag set when called recursively from a post-evasion verify so we never retry the AI loop. */
  isPostEvasion?: boolean
}

const TOAST_COOLDOWN_MS = 30_000
const lastToastAt = new Map<string, number>()

/**
 * Resets the per-key toast cooldown state. Test-only.
 */
export function clearVerifyBroadcastToastDedupe(): void {
  lastToastAt.clear()
}

/**
 * Awaits `waitForSentEcho` and writes the appropriate log line:
 * - On real broadcast (`ws` / `dom`): silent (the existing `✅` from `appendLog`
 *   already covers the API success).
 * - On `local` or `null`: writes `⚠️ {label}: {display}（接口成功但未检测到广播，可能被屏蔽）`.
 *   Toast suppression is governed by `surfaceToast` and `toastDedupeKey`.
 */
export async function verifyBroadcast(input: VerifyBroadcastInput): Promise<void> {
  const isEmoticon = input.isEmoticon ?? isEmoticonUnique(input.text)
  if (isEmoticon) return

  const uid = getDedeUid() ?? null
  const source = await waitForSentEcho(input.text, uid, input.sinceTs, input.timeoutMs)
  if (source === 'ws' || source === 'dom') return

  const message = `⚠️ ${input.label}: ${input.display}（接口成功但未检测到广播，可能被屏蔽）`
  let surfaceToast = input.surfaceToast !== false
  if (surfaceToast && input.toastDedupeKey) {
    const now = Date.now()
    const prev = lastToastAt.get(input.toastDedupeKey) ?? 0
    if (now - prev < TOAST_COOLDOWN_MS) {
      surfaceToast = false
    } else {
      lastToastAt.set(input.toastDedupeKey, now)
    }
  }
  if (surfaceToast) {
    // appendLog auto-surfaces ⚠️-prefixed lines as a warning Toast.
    appendLog(message)
  } else {
    appendLogQuiet(message)
  }

  // Layer 1+2+3 — only when this is the FIRST verifyBroadcast pass for this
  // text. The post-evasion verify pass shares the same code path but skips
  // re-triggering AI evasion to avoid an infinite loop.
  if (input.isPostEvasion) {
    // AI evasion already ran AND the rewritten send still didn't broadcast.
    recordShadowBanObservation({ text: input.text, roomId: input.roomId, evadedAlready: true })
    return
  }

  const canRunAiEvasion =
    input.enableAiEvasion === true &&
    aiEvasion.value &&
    input.roomId !== undefined &&
    typeof input.csrfToken === 'string' &&
    input.csrfToken.length > 0

  if (!canRunAiEvasion) {
    recordShadowBanObservation({ text: input.text, roomId: input.roomId, evadedAlready: false })
    return
  }

  // input.roomId / input.csrfToken are guaranteed defined by canRunAiEvasion.
  const roomId = input.roomId as number
  const csrfToken = input.csrfToken as string
  const result = await tryAiEvasion(input.text, roomId, csrfToken, `${input.label}·影子屏蔽-`)

  if (result.success && result.evadedMessage) {
    if (result.sensitiveWords && result.sensitiveWords.length > 0) {
      learnShadowRules({
        roomId,
        sensitiveWords: result.sensitiveWords,
        evadedMessage: result.evadedMessage,
        originalMessage: input.text,
      })
    }
    // Re-verify the AI-rewritten message once. No further retry / no toast —
    // the user already saw the first warning, this just adds an honest follow-up.
    void verifyBroadcast({
      text: result.evadedMessage,
      label: `${input.label}·AI`,
      display: result.evadedMessage,
      sinceTs: Date.now(),
      isPostEvasion: true,
      surfaceToast: false,
    })
  } else {
    // Laplace returned no usable rewrite — record for manual review.
    recordShadowBanObservation({ text: input.text, roomId: input.roomId, evadedAlready: false })
  }
}
