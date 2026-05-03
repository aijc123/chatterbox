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

import { requestAiSuggestion, tryAiEvasion } from './ai-evasion'
import { getDedeUid } from './api'
import {
  type CustomChatEvent,
  type CustomChatWsStatus,
  findRecentCustomChatDanmakuSource,
  subscribeCustomChatEvents,
  subscribeCustomChatWsStatus,
} from './custom-chat-events'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'
import { isEmoticonUnique } from './emoticon'
import { startLiveWsSource } from './live-ws-source'
import { appendLog, appendLogQuiet } from './log'
import { learnShadowRules, recordShadowBanObservation } from './shadow-learn'
import { formatCandidatesForLog, generateHeuristicCandidates, type ShadowBypassCandidate } from './shadow-suggestion'
import { aiEvasion, shadowBanMode } from './store'

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

/**
 * Find a recent DOM-source danmaku that matches `text`.
 *
 * IMPORTANT: B站's native UI inserts the user's OWN sent message into
 * `.chat-items` even when the message is shadow-banned (the local insert is
 * unconditional). So a DOM event whose `event.uid` equals the sender's
 * `selfUid` is NOT proof of broadcast — we ignore it. WS echoes for self
 * are still trusted because the server only pushes DANMU_MSG when the
 * message actually broadcast.
 */
function findRecentDomDanmakuSource(
  text: string,
  uid: string | null,
  sinceTs: number,
  selfUid: string | null
): 'dom' | null {
  const target = text.trim()
  if (!target) return null
  pruneRecentDomDanmaku()
  for (let i = recentDomDanmaku.length - 1; i >= 0; i--) {
    const event = recentDomDanmaku[i]
    if (event.observedAt < sinceTs) break
    if (event.text !== target) continue
    if (uid && event.uid && event.uid !== uid) continue
    if (selfUid && event.uid === selfUid) continue // self-insert is not proof
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

function matchesDomEchoEvent(event: DanmakuEvent, target: string, uid: string | null, selfUid: string | null): boolean {
  if (event.text.trim() !== target) return false
  if (uid && event.uid && event.uid !== uid) return false
  if (selfUid && event.uid === selfUid) return false // see findRecentDomDanmakuSource
  return true
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

// WS source must be running for self-broadcast verification: B站 always inserts
// the user's own message into the local DOM regardless of broadcast outcome,
// so DOM-self echoes are filtered out as unreliable. Only WS-self echoes
// (DANMU_MSG pushed by the server) prove a real broadcast. We therefore
// ref-count `startLiveWsSource` ourselves on first verification — page-lifetime
// consumer, never stopped — independent of the Custom Chat UI toggle.
let wsTrackingStarted = false
let currentWsStatus: CustomChatWsStatus = 'off'
function ensureWsTracking(): void {
  if (wsTrackingStarted) return
  wsTrackingStarted = true
  subscribeCustomChatWsStatus(status => {
    currentWsStatus = status
  })
  startLiveWsSource()
}

/**
 * Resolves with the source of the broadcast echo if observed within `timeoutMs`,
 * otherwise resolves to `'local'` (only local API echo seen → likely shadow-ban)
 * or `null` (nothing observed at all).
 *
 * `uid` is the sender UID we want to match in the danmaku stream (typically
 * the current user's own UID). When provided AND the matching event's UID
 * equals it, **DOM** echoes are rejected: B站 client-side inserts your own
 * sent message into `.chat-items` even when shadow-banned, so DOM-self is
 * not proof of broadcast. **WS** echoes for self are still trusted because
 * the server only pushes DANMU_MSG when the message actually broadcast.
 */
export function waitForSentEcho(
  text: string,
  uid: string | null,
  sinceTs: number,
  timeoutMs = SEND_ECHO_TIMEOUT_MS
): Promise<EchoSource> {
  ensureDomTracking()
  ensureWsTracking()
  const target = text.trim()
  if (!target) return Promise.resolve(null)
  // The sender UID is also the "self UID" we use to filter unreliable
  // DOM-self-insert echoes. We pass it as both `uid` (match) and `selfUid`
  // (filter) so callers don't have to thread it twice.
  const selfUid = uid
  // Only count real broadcast echoes (ws/dom) as immediate confirmation.
  // 'local' is emitted synchronously inside sendDanmaku and would always
  // short-circuit this check before any WS echo has a chance to arrive.
  const recentCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs)
  if (recentCustomSource && recentCustomSource !== 'local') return Promise.resolve(recentCustomSource)
  const recentDomSource = findRecentDomDanmakuSource(target, uid, sinceTs, selfUid)
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
        if (!matchesDomEchoEvent(event, target, uid, selfUid)) return
        finish('dom')
      },
    })
    // Late check: only real broadcast sources.
    const lateCustomSource = findRecentCustomChatDanmakuSource(target, uid, sinceTs)
    const lateDomSource = findRecentDomDanmakuSource(target, uid, sinceTs, selfUid)
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
  console.log(`[CB][VERIFY] t=${Date.now()} text="${input.text}" source=${source} wsStatus=${currentWsStatus}`)
  if (source === 'ws' || source === 'dom') return

  // For self-sent messages, WS-self is the only trustworthy broadcast proof
  // (DOM-self is filtered as unreliable — see findRecentDomDanmakuSource).
  // If the WS isn't actually `live` at this moment (still connecting after
  // page load, errored, closed, or simply off because Custom Chat is
  // disabled and auto-blend isn't running), we cannot distinguish a real
  // shadow ban from "no listener". Fall back to a quiet info note instead
  // of emitting a misleading ⚠️ warning + bogus rewrite candidates.
  if (currentWsStatus !== 'live') {
    appendLogQuiet(`⚪ ${input.label}: ${input.display}（广播校验跳过：WS 未就绪 ${currentWsStatus}）`)
    return
  }

  // Conservative fallback (pending diagnosis): WS is live but no self-WS echo
  // arrived. If a self-DOM echo for the same text was observed within the
  // verification window, treat it as "at least locally inserted" and skip the
  // ⚠️ warning. Trade-off: a true shadow-ban also produces a self-DOM echo
  // (B站 inserts your own message regardless), so this regresses true-positive
  // detection until we know whether B站 ever pushes self-DANMU_MSG over WS.
  // The `[CB][WS-SELF]` and `[CB][VERIFY]` console diagnostics let us decide.
  const target = input.text.trim()
  const recentSelfDom = recentDomDanmaku.some(
    ev => ev.observedAt >= input.sinceTs && ev.text === target && uid !== null && ev.uid === uid
  )
  if (recentSelfDom) {
    appendLogQuiet(`⚪ ${input.label}: ${input.display}（仅本地回显，未拿到 WS 广播证据 — 可能是 B站 不向自身推送）`)
    return
  }

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

  // Post-evasion follow-up: AI already ran AND the rewritten send still
  // didn't broadcast. Record without re-triggering anything.
  if (input.isPostEvasion) {
    recordShadowBanObservation({ text: input.text, roomId: input.roomId, evadedAlready: true })
    return
  }

  // ---- Bypass suggestions ----
  // Always generate heuristic candidates (no network) so the user has
  // something to copy even when AI evasion is off.
  const heuristic = generateHeuristicCandidates(input.text)
  const candidates: ShadowBypassCandidate[] = [...heuristic]

  // If aiEvasion is on, also fetch the AI variant — but ALWAYS as a
  // suggestion (no enqueue). The actual auto-resend path below decides
  // whether to act on it.
  let aiSuggestion: { evadedMessage: string; sensitiveWords: string[] } | null = null
  if (input.enableAiEvasion && aiEvasion.value) {
    try {
      aiSuggestion = await requestAiSuggestion(input.text)
    } catch {
      aiSuggestion = null
    }
    if (aiSuggestion) {
      candidates.push({
        strategy: 'ai',
        label: 'AI改写',
        text: aiSuggestion.evadedMessage,
      })
    }
  }

  const formatted = formatCandidatesForLog(candidates)
  if (formatted) appendLogQuiet(formatted)

  // Always record the observation, with candidates attached so the panel
  // can render copy / fill buttons.
  recordShadowBanObservation({
    text: input.text,
    roomId: input.roomId,
    evadedAlready: false,
    candidates,
  })

  // ---- Optional auto-resend (gated, opt-in) ----
  // Only act on AI suggestion when ALL conditions hold:
  //   - shadowBanMode is explicitly 'auto-resend' (default is 'suggest')
  //   - AI suggestion was produced
  //   - room id + csrf token are available for the resend
  const canAutoResend =
    shadowBanMode.value === 'auto-resend' &&
    aiSuggestion !== null &&
    input.roomId !== undefined &&
    typeof input.csrfToken === 'string' &&
    input.csrfToken.length > 0
  if (!canAutoResend) return

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
    // Post-evasion verify: one-shot, no further retry / toast.
    void verifyBroadcast({
      text: result.evadedMessage,
      label: `${input.label}·AI`,
      display: result.evadedMessage,
      sinceTs: Date.now(),
      isPostEvasion: true,
      surfaceToast: false,
    })
  }
}
