import { showConfirm } from '../components/ui/alert-dialog'
import { tryAiEvasion } from './ai-evasion'
import { ensureRoomId, getCsrfToken } from './api'
import { formatLockedEmoticonReject, isEmoticonUnique, isLockedEmoticon } from './emoticon'
import { classifyRiskEvent, syncGuardRoomRiskEvent } from './guard-room-sync'
import { appendLog } from './log'
import { applyReplacements } from './replacement'
import { enqueueDanmaku, SendPriority } from './send-queue'
import { verifyBroadcast } from './send-verification'
import { activeTab, aiEvasion, customChatEnabled, dialogOpen, fasongText, maxLength, msgSendInterval } from './store'
import { processMessages } from './utils'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  }
}

export async function stealDanmaku(msg: string): Promise<void> {
  const copied = await copyText(msg)
  fasongText.value = msg
  if (!focusCustomChatComposer()) {
    activeTab.value = 'fasong'
    dialogOpen.value = true
  }
  appendLog(copied ? `🥷 偷并复制: ${msg}` : `🥷 偷: ${msg}`)
}

function focusCustomChatComposer(): boolean {
  if (!customChatEnabled.value) return false
  const input = document.querySelector<HTMLTextAreaElement>('#laplace-custom-chat textarea')
  if (!input) return false

  input.value = fasongText.value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
  return true
}

export async function repeatDanmaku(
  msg: string,
  options: { confirm?: boolean; anchor?: { x: number; y: number } } = {}
): Promise<void> {
  if (options.confirm) {
    const confirmed = await showConfirm({
      title: '确认发送以下弹幕？',
      body: msg,
      confirmText: '发送',
      anchor: options.anchor,
    })
    if (!confirmed) return
  }

  try {
    const roomId = await ensureRoomId()
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      appendLog('❌ 未找到登录信息，请先登录 Bilibili')
      return
    }
    const processed = applyReplacements(msg)
    if (isLockedEmoticon(processed)) {
      appendLog(formatLockedEmoticonReject(processed, '+1 表情'))
      return
    }
    const result = await enqueueDanmaku(processed, roomId, csrfToken, SendPriority.MANUAL)
    const display = msg !== processed ? `${msg} → ${processed}` : processed
    appendLog(result, '+1', display)
    if (result.success && !result.cancelled) {
      void verifyBroadcast({
        text: processed,
        label: '+1',
        display,
        sinceTs: result.startedAt ?? Date.now(),
        isEmoticon: result.isEmoticon,
        enableAiEvasion: true,
        roomId,
        csrfToken,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    appendLog(`🔴 +1 出错：${message}`)
  }
}

export async function sendManualDanmaku(originalMessage: string): Promise<boolean> {
  const trimmed = originalMessage.trim()
  if (!trimmed) {
    appendLog('⚠️ 消息内容不能为空')
    return false
  }

  const isEmote = isEmoticonUnique(trimmed)
  if (isLockedEmoticon(trimmed)) {
    appendLog(formatLockedEmoticonReject(trimmed, '手动表情'))
    return false
  }
  const processedMessage = isEmote ? trimmed : applyReplacements(trimmed)
  const wasReplaced = !isEmote && trimmed !== processedMessage

  try {
    const roomId = await ensureRoomId()
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      appendLog('❌ 未找到登录信息，请先登录 Bilibili')
      void syncGuardRoomRiskEvent({
        kind: 'login_missing',
        source: 'manual',
        level: 'observe',
        roomId,
        reason: '未找到登录信息',
        advice: '先登录 Bilibili，再发送弹幕。',
      })
      return false
    }

    const segments = isEmote ? [processedMessage] : processMessages(processedMessage, maxLength.value)
    let allSuccess = true

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const result = await enqueueDanmaku(segment, roomId, csrfToken, SendPriority.MANUAL)
      const baseLabel = result.isEmoticon ? '手动表情' : '手动'
      const label = segments.length > 1 ? `${baseLabel} [${i + 1}/${segments.length}]` : baseLabel
      const displayMsg = wasReplaced && segments.length === 1 ? `${trimmed} → ${segment}` : segment

      appendLog(result, label, displayMsg)
      if (!result.success) {
        allSuccess = false
        const risk = classifyRiskEvent(result.error)
        void syncGuardRoomRiskEvent({
          ...risk,
          source: 'manual',
          roomId,
          errorCode: result.errorCode,
          reason: result.error,
        })
        if (aiEvasion.value) {
          await tryAiEvasion(segment, roomId, csrfToken, '')
        }
      } else if (!result.cancelled) {
        void verifyBroadcast({
          text: segment,
          label,
          display: displayMsg,
          sinceTs: result.startedAt ?? Date.now(),
          isEmoticon: result.isEmoticon,
          enableAiEvasion: true,
          roomId,
          csrfToken,
        })
      }

      if (i < segments.length - 1) {
        await new Promise(r => setTimeout(r, msgSendInterval.value * 1000))
      }
    }

    return allSuccess
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    appendLog(`🔴 发送出错：${msg}`)
    return false
  }
}
