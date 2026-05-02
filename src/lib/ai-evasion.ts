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

/**
 * Calls Laplace chat-audit API to detect sensitive words.
 */
async function detectSensitiveWords(text: string): Promise<DetectionResult> {
  try {
    const resp = await fetch(BASE_URL.LAPLACE_CHAT_AUDIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completionMetadata: { input: text },
      }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: { completion?: DetectionResult } = await resp.json()
    return data.completion ?? { hasSensitiveContent: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(`⚠️ AI检测服务出错：${msg}`)
    return { hasSensitiveContent: false }
  }
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
