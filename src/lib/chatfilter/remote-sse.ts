// SSE 客户端 + 轮询降级。
//
// EventSource 走浏览器原生 fetch，不受 @connect 控制，但 Chatfilter 服务
// 已发 `Access-Control-Allow-Origin: *`（见 http_server.py），所以通常可用。
// 如果 5s 内没收到任何 onmessage / onerror，自动切到 5s 轮询 GET /state。
//
// onEvent 接收解析后的事件；onStatus 接收连接状态变化（connecting / connected /
// polling / error）。所有副作用都用回调暴露，便于上层（remote-controller）
// 串到 chatfilterRemoteStatus signal 和 normalizeEventBus。

import type { RemoteEvent, RemoteStatus } from './types'

import { fetchState, type RemoteClientOptions, type StateSnapshot } from './remote-client'

export interface RemoteSseHandle {
  /** 主动关闭 SSE / 停止轮询 / 取消重连。 */
  close(): void
}

export interface RemoteSseOptions extends RemoteClientOptions {
  onEvent: (e: RemoteEvent) => void
  onStatus: (s: RemoteStatus) => void
  /** 默认 5000ms：原生 EventSource 静默超时 → 走轮询。 */
  sseSilentTimeoutMs?: number
  /** 默认 5000ms。 */
  pollIntervalMs?: number
}

const DEFAULT_SSE_SILENT = 5000
const DEFAULT_POLL_INTERVAL = 5000

function tryParseEvent(data: string): RemoteEvent | null {
  try {
    const parsed = JSON.parse(data) as StateSnapshot
    return { kind: 'state', data: parsed }
  } catch {
    return null
  }
}

export function connectRemoteSse(opts: RemoteSseOptions): RemoteSseHandle {
  const endpoint = opts.endpoint.replace(/\/+$/, '')
  const silentTimeoutMs = opts.sseSilentTimeoutMs ?? DEFAULT_SSE_SILENT
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL

  let closed = false
  let es: EventSource | null = null
  let silentTimer: ReturnType<typeof setTimeout> | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null

  const cleanup = () => {
    if (silentTimer !== null) {
      clearTimeout(silentTimer)
      silentTimer = null
    }
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    if (es !== null) {
      try {
        es.close()
      } catch {}
      es = null
    }
  }

  const startPolling = () => {
    if (closed) return
    cleanup()
    opts.onStatus('polling')
    const tick = async () => {
      if (closed) return
      const result = await fetchState(opts)
      if ('error' in result) {
        opts.onEvent({ kind: 'error', reason: result.error })
      } else {
        opts.onEvent({ kind: 'state', data: result })
      }
      if (closed) return
      pollTimer = setTimeout(tick, pollIntervalMs)
    }
    void tick()
  }

  const armSilentTimeout = () => {
    if (silentTimer !== null) clearTimeout(silentTimer)
    silentTimer = setTimeout(() => {
      // 5s 没收到任何事件 → 走轮询
      startPolling()
    }, silentTimeoutMs)
  }

  const startSse = () => {
    if (closed) return
    opts.onStatus('connecting')
    if (typeof EventSource === 'undefined') {
      startPolling()
      return
    }
    try {
      es = new EventSource(`${endpoint}/events`)
    } catch (err) {
      opts.onEvent({ kind: 'error', reason: err instanceof Error ? err.message : String(err) })
      startPolling()
      return
    }
    armSilentTimeout()
    es.onmessage = (ev: MessageEvent<string>) => {
      if (silentTimer !== null) {
        clearTimeout(silentTimer)
        silentTimer = null
      }
      opts.onStatus('connected')
      const parsed = tryParseEvent(ev.data)
      if (parsed !== null) opts.onEvent(parsed)
      armSilentTimeout()
    }
    es.onerror = () => {
      // EventSource 在 close 后也会触发 onerror；用 readyState 区分。
      if (closed) return
      if (es && es.readyState === EventSource.CLOSED) {
        opts.onEvent({ kind: 'error', reason: 'SSE 连接关闭' })
        startPolling()
      }
      // CONNECTING 状态由浏览器自动重试，不主动切换
    }
  }

  startSse()

  return {
    close() {
      closed = true
      cleanup()
      opts.onStatus('idle')
    },
  }
}
