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

function replaceSensitiveWords(text: string, sensitiveWords: string[]): string {
  let result = text
  for (const word of sensitiveWords) {
    result = result.split(word).join(processText(word))
  }
  return result
}

export interface TryAiEvasionResult {
  success: boolean
  evadedMessage?: string
  error?: string
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
    if (isLockedEmoticon(evadedMessage)) {
      const error = 'AI规避结果是锁定表情'
      appendLog(formatLockedEmoticonReject(evadedMessage, `${logPrefix}AI规避表情`))
      return { success: false, evadedMessage, error }
    }

    const retryResult = await enqueueDanmaku(evadedMessage, roomId, csrfToken, SendPriority.MANUAL)

    if (retryResult.success) {
      appendLog(`✅ ${logPrefix}AI规避成功: ${evadedMessage}`)
      return { success: true, evadedMessage }
    }

    appendLog(`❌ ${logPrefix}AI规避失败: ${evadedMessage}，原因：${retryResult.error}`)
    return { success: false, evadedMessage, error: retryResult.error }
  }

  appendLog(`⚠️ ${logPrefix}无法检测到敏感词，请手动检查`)
  return { success: false }
}
