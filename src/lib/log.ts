import { signal } from '@preact/signals'

import type { SendDanmakuResult } from './api'

import { gmSignal } from './gm-signal'
import { formatDanmakuError } from './utils'

/** Maximum number of lines kept in the rolling log buffer. */
export const maxLogLines = gmSignal('maxLogLines', 1000)

/** Rolling log buffer surfaced by the LogPanel. */
export const logLines = signal<string[]>([])

export interface UserNotice {
  id: number
  tone: 'warning' | 'error'
  message: string
}

/** Latest user-facing warning/error surfaced outside the collapsed log panel. */
export const userNotice = signal<UserNotice | null>(null)

let noticeTimer: ReturnType<typeof setTimeout> | null = null

function showUserNotice(message: string, tone: UserNotice['tone']): void {
  userNotice.value = {
    id: Date.now(),
    tone,
    message,
  }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    userNotice.value = null
    noticeTimer = null
  }, 5000)
}

function maybeSurfaceLogMessage(message: string): void {
  if (/^(❌|🔴)/.test(message) || /失败|出错|错误|没发出去|未找到登录信息/.test(message)) {
    showUserNotice(message, 'error')
  } else if (/^⚠️/.test(message)) {
    showUserNotice(message, 'warning')
  }
}

/**
 * Appends an entry to the shared log.
 *
 * - `appendLog('text')` writes a free-form message.
 * - `appendLog(result, label, display)` writes a formatted send result in the
 *   standard `✅/❌ label: text，原因：...` style.
 */
export function appendLog(message: string): void
export function appendLog(result: SendDanmakuResult, label: string, display: string): void
export function appendLog(arg: string | SendDanmakuResult, label?: string, display?: string): void {
  const now = new Date()
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  const message =
    typeof arg === 'string'
      ? `${ts} ${arg}`
      : arg.cancelled
        ? `${ts} ⏭ ${label}: ${display}（被手动发送中断）`
        : arg.success
          ? `${ts} ✅ ${label}: ${display}`
          : `${ts} ❌ ${label}: ${display}，原因：${formatDanmakuError(arg.error)}`

  const max = maxLogLines.value
  const lines = logLines.value
  const next = lines.length >= max ? [...lines.slice(lines.length - max + 1), message] : [...lines, message]
  logLines.value = next

  if (typeof arg === 'string') {
    maybeSurfaceLogMessage(arg)
  } else if (!arg.success && !arg.cancelled) {
    showUserNotice(`${label}: ${display}，原因：${formatDanmakuError(arg.error)}`, 'error')
  }
}
