import { signal } from '@preact/signals'

import { BASE_URL } from './const'
import { formatLockedEmoticonReject, isLockedEmoticon } from './emoticon'
import { appendLog } from './log'
import { enqueueDanmaku, SendPriority } from './send-queue'
import { aiEvasion } from './store'
import { getGraphemes } from './utils'

interface DetectionResult {
  hasSensitiveContent?: boolean
  sensitiveWords?: string[]
  severity?: string
  categories?: string[]
}

// 上游 LAPLACE chat-audit 的响应对我们而言是不可信的(网络层之外):一旦上游被
// 入侵或换形,`sensitiveWords` 完全可能不是 `string[]`。下游 `replaceSensitiveWords`
// 用 `.split(word)` 调用,word 不是字符串就会 throw,把熔断器立刻推到 open。
// 这里做最小校验 + 长度截断,把无效项过滤掉,异常 shape 不再级联到调用方。
// 导出仅供测试,生产路径只在 detectSensitiveWords 内部用一次。
export const SENSITIVE_WORD_MAX_LEN = 200
export const SENSITIVE_WORDS_MAX_COUNT = 64
export function sanitizeDetectionResult(raw: unknown): DetectionResult {
  if (typeof raw !== 'object' || raw === null) return { hasSensitiveContent: false }
  const r = raw as Record<string, unknown>
  const out: DetectionResult = {}
  if (typeof r.hasSensitiveContent === 'boolean') out.hasSensitiveContent = r.hasSensitiveContent
  if (typeof r.severity === 'string') out.severity = r.severity.slice(0, 64)
  if (Array.isArray(r.sensitiveWords)) {
    const cleaned: string[] = []
    for (const w of r.sensitiveWords) {
      if (cleaned.length >= SENSITIVE_WORDS_MAX_COUNT) break
      if (typeof w !== 'string') continue
      if (w.length === 0 || w.length > SENSITIVE_WORD_MAX_LEN) continue
      cleaned.push(w)
    }
    out.sensitiveWords = cleaned
  }
  if (Array.isArray(r.categories)) {
    out.categories = r.categories.filter((c): c is string => typeof c === 'string').slice(0, 32)
  }
  return out
}

// ---------------------------------------------------------------------------
// 简易熔断器 —— 防止上游 LAPLACE chat-audit 挂了之后每条消息都吃一次失败延迟,
// 以及防止满屏 "AI检测服务出错" 日志洪水。
//
// 状态机:
//  - closed:正常调用上游
//  - open:连续 CIRCUIT_FAIL_THRESHOLD 次失败 → 熔断 CIRCUIT_OPEN_DURATION_MS,
//          期间 detectSensitiveWords 立刻返回"无敏感词",不再打到上游
//  - half-open(隐式):open 时间到了之后下一次调用会真正穿透;成功 → closed,
//          失败 → 重新 open
//
// 暴露 `aiEvasionDegraded` signal 方便 UI 层显示"AI 检测临时不可用"提示。
// ---------------------------------------------------------------------------
const CIRCUIT_FAIL_THRESHOLD = 3
const CIRCUIT_OPEN_DURATION_MS = 60_000

let consecutiveFailures = 0
let circuitOpenedAt: number | null = null

/** AI 检测是否处于降级状态(供 UI 横幅订阅;无需持久化)。 */
export const aiEvasionDegraded = signal(false)

function isCircuitOpen(now: number): boolean {
  if (circuitOpenedAt === null) return false
  return now - circuitOpenedAt < CIRCUIT_OPEN_DURATION_MS
}

function onAuditSuccess(): void {
  if (consecutiveFailures > 0 || circuitOpenedAt !== null) {
    appendLog('✅ AI 检测服务已恢复')
  }
  consecutiveFailures = 0
  circuitOpenedAt = null
  aiEvasionDegraded.value = false
}

function onAuditFailure(reason: string): void {
  consecutiveFailures++
  if (consecutiveFailures >= CIRCUIT_FAIL_THRESHOLD && circuitOpenedAt === null) {
    circuitOpenedAt = Date.now()
    aiEvasionDegraded.value = true
    appendLog(
      `⚠️ AI 检测服务连续 ${CIRCUIT_FAIL_THRESHOLD} 次失败,暂停 ${CIRCUIT_OPEN_DURATION_MS / 1000}s 后重试(${reason})`
    )
  } else {
    // open 状态下也可能再撞失败(half-open probe 失败),仅打一行简短日志,避免刷屏。
    appendLog(`⚠️ AI 检测服务出错:${reason}`)
  }
}

/**
 * Calls Laplace chat-audit API to detect sensitive words.
 */
async function detectSensitiveWords(text: string): Promise<DetectionResult> {
  if (isCircuitOpen(Date.now())) {
    // 降级:静默返回"无敏感词",上游恢复前不再产生网络等待和日志噪声。
    return { hasSensitiveContent: false }
  }
  try {
    const resp = await fetch(BASE_URL.LAPLACE_CHAT_AUDIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completionMetadata: { input: text },
      }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: unknown = await resp.json()
    const completion = (data as { completion?: unknown } | null)?.completion
    onAuditSuccess()
    return sanitizeDetectionResult(completion)
  } catch (err) {
    onAuditFailure(err instanceof Error ? err.message : String(err))
    return { hasSensitiveContent: false }
  }
}

/** 测试用:重置熔断器到 closed 状态。 */
export function _resetAiEvasionCircuitForTests(): void {
  consecutiveFailures = 0
  circuitOpenedAt = null
  aiEvasionDegraded.value = false
}

function insertInvisibleChars(word: string): string {
  const graphemes = getGraphemes(word)
  return graphemes.join('­')
}

export function processText(text: string): string {
  return insertInvisibleChars(text)
}

export function replaceSensitiveWords(text: string, sensitiveWords: string[]): string {
  let result = text
  for (const word of sensitiveWords) {
    if (!word) continue
    result = result.split(word).join(processText(word))
  }
  return result
}

/**
 * Returns true when the AI-evasion replacement output is safe to enqueue —
 * i.e. it contains at least one non-whitespace character.
 *
 * Without this guard a sensitive-word list that consumes the whole message
 * (e.g. word === message) would produce an empty string that we'd happily
 * send as an empty danmaku.
 */
export function isEvadedMessageSendable(evadedMessage: string): boolean {
  return evadedMessage.trim().length > 0
}

export interface TryAiEvasionResult {
  success: boolean
  evadedMessage?: string
  error?: string
  /** Sensitive words Laplace flagged on this attempt — exposed so callers can
   *  learn (sensitiveWord → processText(sensitiveWord)) into local rules. */
  sensitiveWords?: string[]
}

/**
 * Detects sensitive words via Laplace and returns the rewritten text WITHOUT
 * resending. Used by `verifyBroadcast` in suggest-only mode so the user can
 * copy/paste the AI variant into their input box without the script taking
 * an autonomous send action on their behalf.
 *
 * Returns:
 *   - `null` if `aiEvasion` is off, Laplace finds nothing, or the rewrite
 *     would produce empty / whitespace-only text.
 *   - `{ evadedMessage, sensitiveWords }` otherwise.
 */
export async function requestAiSuggestion(
  text: string
): Promise<{ evadedMessage: string; sensitiveWords: string[] } | null> {
  if (!aiEvasion.value) return null
  const trimmed = text.trim()
  if (!trimmed) return null
  const detection = await detectSensitiveWords(trimmed)
  if (!detection.hasSensitiveContent || !detection.sensitiveWords?.length) return null
  const evadedMessage = replaceSensitiveWords(trimmed, detection.sensitiveWords)
  if (!isEvadedMessageSendable(evadedMessage)) return null
  if (evadedMessage === trimmed) return null
  return { evadedMessage, sensitiveWords: detection.sensitiveWords }
}

/**
 * Attempts AI evasion for a failed message by detecting and replacing sensitive words, then resending.
 */
export async function tryAiEvasion(
  message: string,
  roomId: number,
  csrfToken: string,
  logPrefix: string
): Promise<TryAiEvasionResult> {
  if (!aiEvasion.value) return { success: false }

  appendLog(`🤖 ${logPrefix}AI规避：正在检测敏感词…`)

  const detection = await detectSensitiveWords(message)

  if (detection.hasSensitiveContent && detection.sensitiveWords && detection.sensitiveWords.length > 0) {
    appendLog(`🤖 ${logPrefix}检测到敏感词：${detection.sensitiveWords.join(', ')}，正在尝试规避…`)

    const evadedMessage = replaceSensitiveWords(message, detection.sensitiveWords)
    // Guard against the API returning a sensitive-word list that, after
    // replacement, leaves nothing meaningful to send. Without this we'd
    // happily enqueue an empty / whitespace-only danmaku.
    if (!isEvadedMessageSendable(evadedMessage)) {
      const error = 'AI规避后内容为空'
      appendLog(`❌ ${logPrefix}AI规避失败：替换后内容为空，已跳过发送`)
      return { success: false, evadedMessage, error }
    }
    if (isLockedEmoticon(evadedMessage)) {
      const error = 'AI规避结果是锁定表情'
      appendLog(formatLockedEmoticonReject(evadedMessage, `${logPrefix}AI规避表情`))
      return { success: false, evadedMessage, error }
    }

    const retryResult = await enqueueDanmaku(evadedMessage, roomId, csrfToken, SendPriority.MANUAL)

    if (retryResult.success) {
      appendLog(`✅ ${logPrefix}AI规避成功: ${evadedMessage}`)
      return { success: true, evadedMessage, sensitiveWords: detection.sensitiveWords }
    }

    appendLog(`❌ ${logPrefix}AI规避失败: ${evadedMessage}，原因：${retryResult.error}`)
    return { success: false, evadedMessage, error: retryResult.error, sensitiveWords: detection.sensitiveWords }
  }

  appendLog(`⚠️ ${logPrefix}无法检测到敏感词，请手动检查`)
  return { success: false }
}
