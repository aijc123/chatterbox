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
  tone: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export type NotifyLevel = UserNotice['tone']

/** Queue of active user-facing notices surfaced outside the collapsed log panel. */
export const userNotices = signal<UserNotice[]>([])

function showUserNotice(message: string, tone: UserNotice['tone']): void {
  const id = Date.now()
  userNotices.value = [...userNotices.value, { id, tone, message }]
  setTimeout(() => {
    userNotices.value = userNotices.value.filter(n => n.id !== id)
  }, 5000)
}

function maybeSurfaceLogMessage(message: string): void {
  if (/^(❌|🔴)/.test(message) || /失败|出错|错误|没发出去|未找到登录信息/.test(message)) {
    showUserNotice(message, 'error')
  } else if (/^⚠️/.test(message)) {
    showUserNotice(message, 'warning')
  }
}

export function notifyUser(level: NotifyLevel, message: string, detail?: string): void {
  const fullMessage = detail ? `${message}：${detail}` : message
  const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️'
  appendLog(`${prefix} ${fullMessage}`)
  if (level === 'warning' || level === 'error') showUserNotice(fullMessage, level)
}

function formatTs(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

function pushLine(line: string): void {
  const max = maxLogLines.value
  const lines = logLines.value
  logLines.value = lines.length >= max ? [...lines.slice(lines.length - max + 1), line] : [...lines, line]
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
  const ts = formatTs(new Date())

  const message =
    typeof arg === 'string'
      ? `${ts} ${arg}`
      : arg.cancelled
        ? `${ts} ⏭ ${label}: ${display}（被手动发送中断）`
        : arg.success
          ? `${ts} ✅ ${label}: ${display}`
          : `${ts} ❌ ${label}: ${display}，原因：${formatDanmakuError(arg.error)}`

  pushLine(message)

  if (typeof arg === 'string') {
    maybeSurfaceLogMessage(arg)
  } else if (!arg.success && !arg.cancelled) {
    showUserNotice(`${label}: ${display}，原因：${formatDanmakuError(arg.error)}`, 'error')
  }
}

/**
 * Appends a free-form log entry without triggering the auto-toast surfacing
 * regex. Used by callers that want to write a `⚠️` line but suppress the
 * Toast (e.g. duplicate shadow-ban warnings inside the auto-loop).
 */
export function appendLogQuiet(message: string): void {
  pushLine(`${formatTs(new Date())} ${message}`)
}
