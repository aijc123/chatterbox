import { signal } from '@preact/signals'

import type { SendDanmakuResult } from './api'

import { gmSignal, numericGmSignal } from './gm-signal'
import { formatDanmakuError } from './utils'

/**
 * Maximum number of lines kept in the rolling log buffer.
 *
 * Bounded so a corrupted backup or hand-edited GM storage cannot push the cap
 * to 0 (always-empty log) or a negative/NaN value (`slice(N - max + 1)` blows
 * up). Upper bound caps memory in long-running sessions.
 */
export const maxLogLines = numericGmSignal('maxLogLines', 1000, { min: 50, max: 100000, integer: true })

/**
 * When true, `appendLogQuiet` traces are surfaced in the visible log panel
 * with a `🔍` prefix. Off by default; flip on to capture a verbose log dump
 * for issue reports.
 */
export const debugLogVisible = gmSignal('debugLogVisible', false)

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

/**
 * Translate common English runtime / fetch / HTTP error messages into Chinese
 * so they don't leak into otherwise-Chinese toast text. Applied at the
 * `notifyUser` boundary (catches all `notifyUser(level, label, err.message)`
 * call sites in one place) and at `appendLog(string)` (catches free-form
 * `appendLog('⚠️ X 失败：${err.message}')` writes that also auto-surface to
 * the toast via `maybeSurfaceLogMessage`).
 *
 * Conservative: only rewrites well-known English needles. Chinese text passes
 * through untouched. Unrecognized English is left alone — better to show the
 * raw string than to mangle it.
 *
 * Why this lives at the log layer instead of at each fetch wrapper: every
 * call site currently does `err instanceof Error ? err.message : String(err)`
 * and there are ~30 such sites. Centralizing here is one edit; ad-hoc
 * normalization in every client wrapper drifts.
 */
export function normalizeErrorMessage(raw: string): string {
  if (!raw) return raw
  let s = raw
  // Browser fetch failure (CORS / DNS / offline). Most visible "WTF" string
  // that leaks into Chinese toast.
  s = s.replace(/TypeError:\s*Failed to fetch/gi, '网络连接失败（无法访问目标站点）')
  s = s.replace(/Failed to fetch/gi, '网络连接失败')
  s = s.replace(/NetworkError when attempting to fetch resource\.?/gi, '网络错误（无法访问目标站点）')
  s = s.replace(/Load failed/g, '资源加载失败')
  // Aborted / timed-out requests
  s = s.replace(/^AbortError:?\s*/i, '请求已取消：')
  s = s.replace(/The operation was aborted\.?/gi, '请求已取消（可能超时或主动中断）')
  s = s.replace(/signal is aborted without reason/gi, '请求已取消（超时）')
  // Common HTTP status snippets
  s = s.replace(/\bHTTP\s*401\b|\bUnauthorized\b/g, 'HTTP 401（未授权，请检查 API key）')
  s = s.replace(/\bHTTP\s*403\b|\bForbidden\b/g, 'HTTP 403（被拒绝访问）')
  s = s.replace(/\bHTTP\s*404\b|\bNot Found\b/g, 'HTTP 404（资源不存在）')
  s = s.replace(/\bHTTP\s*429\b|\bToo Many Requests\b/g, 'HTTP 429（触发限速）')
  // Cleanup: double colons left by chained replacements ("请求已取消：The operation...")
  s = s.replace(/：\s*：/g, '：').replace(/：\s*$/g, '')
  return s
}

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
  const normalizedDetail = detail ? normalizeErrorMessage(detail) : detail
  const fullMessage = normalizedDetail ? `${message}：${normalizedDetail}` : message
  const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️'
  appendLog(`${prefix} ${fullMessage}`)
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

  const cancelledReason =
    arg !== null && typeof arg === 'object' && 'cancelled' in arg && arg.cancelled
      ? arg.error === 'empty-text'
        ? '内容为空'
        : '被手动发送中断'
      : ''

  const normalizedString = typeof arg === 'string' ? normalizeErrorMessage(arg) : null
  const message =
    typeof arg === 'string'
      ? `${ts} ${normalizedString}`
      : arg.cancelled
        ? `${ts} ⏭ ${label}: ${display}（${cancelledReason}）`
        : arg.success
          ? `${ts} ✅ ${label}: ${display}`
          : `${ts} ❌ ${label}: ${display}，原因：${formatDanmakuError(arg.error)}`

  pushLine(message)

  if (typeof arg === 'string') {
    // Use normalized form for the toast as well so 「Failed to fetch」/「AbortError」
    // never appear inside an otherwise-Chinese surface message.
    maybeSurfaceLogMessage(normalizedString ?? arg)
  } else if (!arg.success && !arg.cancelled) {
    showUserNotice(`${label}: ${display}，原因：${formatDanmakuError(arg.error)}`, 'error')
  }
}

/**
 * Appends a free-form log entry without triggering the auto-toast surfacing
 * regex. Used by callers that want to write a `⚠️` line but suppress the
 * Toast (e.g. duplicate shadow-ban warnings inside the auto-loop).
 *
 * When `debugLogVisible` is on, the line is annotated with a `🔍` prefix so
 * users (and maintainers reading a shared log dump) can tell it apart from
 * normal user-facing entries.
 */
export function appendLogQuiet(message: string): void {
  const prefix = debugLogVisible.value ? '🔍 ' : ''
  pushLine(`${formatTs(new Date())} ${prefix}${message}`)
}
