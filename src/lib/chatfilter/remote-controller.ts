// 远程聚类的生命周期协调：根据 signal 状态启动/停止订阅 danmaku-stream
// 推送 ingest，并把 SSE 事件分发到 remoteEventBus。
//
// 这个文件依赖 store-chatfilter / cachedRoomId / danmaku-stream，所以**不能**
// 放进 chatfilter/ 纯模块层。但它使用 chatfilter/remote-* 的纯客户端类型。

import type { RemoteEvent } from './types'

import { subscribeDanmaku } from '../danmaku-stream'
import { cachedRoomId } from '../store'
import {
  chatfilterRemoteAuthToken,
  chatfilterRemoteEnabled,
  chatfilterRemoteEndpoint,
  chatfilterRemoteStatus,
} from '../store-chatfilter'
import { ingest, type RemoteClientOptions } from './remote-client'
import { connectRemoteSse, type RemoteSseHandle } from './remote-sse'

type RemoteEventHandler = (e: RemoteEvent) => void
const remoteEventSubs = new Set<RemoteEventHandler>()

/** 订阅远程事件。返回 unsubscribe。 */
export function subscribeRemoteEvents(handler: RemoteEventHandler): () => void {
  remoteEventSubs.add(handler)
  return () => {
    remoteEventSubs.delete(handler)
  }
}

function emitRemoteEvent(e: RemoteEvent): void {
  for (const sub of remoteEventSubs) {
    try {
      sub(e)
    } catch {
      // 静默
    }
  }
}

let sseHandle: RemoteSseHandle | null = null
let danmakuUnsubscribe: (() => void) | null = null
let started = false
// 简易 dedup：同一条 raw 在 1.5s 内只 ingest 一次，防止 native DOM 二次回灌。
const recentIngest = new Map<string, number>()
const INGEST_DEDUP_MS = 1500

function getClientOpts(): RemoteClientOptions | null {
  const endpoint = chatfilterRemoteEndpoint.value.trim()
  if (!endpoint) return null
  return {
    endpoint,
    authToken: chatfilterRemoteAuthToken.value.trim() || undefined,
  }
}

export function startRemoteCluster(): void {
  if (started) return
  const clientOpts = getClientOpts()
  if (!clientOpts) {
    chatfilterRemoteStatus.value = 'error'
    emitRemoteEvent({ kind: 'error', reason: '未配置 endpoint' })
    return
  }
  started = true
  // 1) 订阅 danmaku-stream，每条往 /ingest 推。
  danmakuUnsubscribe = subscribeDanmaku({
    onMessage: ev => {
      const text = ev.text?.trim() ?? ''
      if (!text) return
      const now = Date.now()
      // dedup
      const last = recentIngest.get(text)
      if (last !== undefined && now - last < INGEST_DEDUP_MS) return
      recentIngest.set(text, now)
      if (recentIngest.size > 256) {
        // 简单淘汰最旧 64 条
        const keys = Array.from(recentIngest.keys()).slice(0, 64)
        for (const k of keys) recentIngest.delete(k)
      }
      const roomId = cachedRoomId.value
      // fire-and-forget；失败不阻塞主路径
      void ingest(text, roomId, clientOpts).then(res => {
        if (!res.ok) emitRemoteEvent({ kind: 'error', reason: `ingest 失败: ${res.body}` })
      })
    },
  })

  // 2) 开 SSE。
  sseHandle = connectRemoteSse({
    ...clientOpts,
    onEvent: e => emitRemoteEvent(e),
    onStatus: s => {
      chatfilterRemoteStatus.value = s
    },
  })
}

export function stopRemoteCluster(): void {
  if (!started) return
  started = false
  if (danmakuUnsubscribe) {
    danmakuUnsubscribe()
    danmakuUnsubscribe = null
  }
  if (sseHandle) {
    sseHandle.close()
    sseHandle = null
  }
  recentIngest.clear()
  chatfilterRemoteStatus.value = 'idle'
}

export function isRemoteRunning(): boolean {
  return started
}

/** 测试用：把订阅 + 状态全清空。 */
export function _resetRemoteControllerForTests(): void {
  stopRemoteCluster()
  remoteEventSubs.clear()
}

/**
 * 在 app 启动时调用一次：根据 chatfilterRemoteEnabled 自动启停。
 * effect 监听 signal 变化，无需用户重启脚本。
 */
export function installRemoteClusterLifecycle(): () => void {
  // 同步初始状态
  if (chatfilterRemoteEnabled.value) startRemoteCluster()
  // 监听变化
  let lastEnabled = chatfilterRemoteEnabled.value
  let lastEndpoint = chatfilterRemoteEndpoint.value
  let lastToken = chatfilterRemoteAuthToken.value
  const check = () => {
    const enabled = chatfilterRemoteEnabled.value
    const endpoint = chatfilterRemoteEndpoint.value
    const token = chatfilterRemoteAuthToken.value
    if (enabled !== lastEnabled || endpoint !== lastEndpoint || token !== lastToken) {
      stopRemoteCluster()
      lastEnabled = enabled
      lastEndpoint = endpoint
      lastToken = token
      if (enabled) startRemoteCluster()
    }
  }
  // signal 变化时再检查（订阅 .subscribe 在 @preact/signals 里走 effect）
  const unsubEnabled = chatfilterRemoteEnabled.subscribe(check)
  const unsubEndpoint = chatfilterRemoteEndpoint.subscribe(check)
  const unsubToken = chatfilterRemoteAuthToken.subscribe(check)
  return () => {
    unsubEnabled()
    unsubEndpoint()
    unsubToken()
    stopRemoteCluster()
  }
}
