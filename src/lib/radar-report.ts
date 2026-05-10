/**
 * radar 观察上报的小聚合器:把"本房间窗口内、命中已知 trending 簇"的弹幕
 * 文本去重攒着,定期 fire-and-forget 发给 radar 的 /radar/report endpoint。
 *
 * 触发链:startRadarReportLoop 在 toggle ON 时订阅 danmaku 流(DOM 观察器 + WS
 * 自定义事件,与 auto-blend 同源,toggle OFF 立刻退订),每条 danmaku 喂给
 * noteRadarObservation。我们只在以下三个条件同时满足时才把文本进 buffer:
 *   - radarReportEnabled 开关 ON(默认 OFF — opt-in)
 *   - lookupTrendingMatch(text) 命中 — 即雷达侧已经把这条文本归到某个 trending
 *     簇(等价于"cluster-rank 命中")
 *   - cachedRoomId / cachedStreamerUid 已解析
 *
 * 隐私契约(与 radar-client.RadarReportPayload 一致):
 *   - 只送 dedupe 后的短文本数组(单条 ≤200,buffer 上限 30)
 *   - 不带逐条 timestamp,只带窗口 start/end
 *   - 不带 uid(明文 or 哈希都不带);channelUid 是主播本人公开 id,不是观众
 *   - 失败一律静默 — reportRadarObservation 内部已 swallow,这里不再 try/catch
 *
 * 状态切换:
 *   - 关掉 toggle 时立刻丢掉未发的 buffer(不要在用户改主意之后才发出去)
 *   - 切房间(cachedRoomId 变化)也丢掉 buffer + 重置窗口起点,避免把上一间的
 *     文本带到下一间
 */

import { effect } from '@preact/signals'

import { subscribeCustomChatEvents } from './custom-chat-events'
import { subscribeDanmaku } from './danmaku-stream'
import { lookupTrendingMatch } from './meme-trending'
import { reportRadarObservation } from './radar-client'
import { cachedRoomId, cachedStreamerUid } from './store'
import { radarReportEnabled } from './store-radar'

const FLUSH_INTERVAL_MS = 60_000
const MAX_SAMPLES = 30
const MAX_TEXT_LEN = 200

interface RoomBuffer {
  roomId: number
  channelUid: number
  windowStartTs: number
  // Set 给 dedupe;插入顺序 = 时间顺序,Set 保留插入顺序天然就是 FIFO。
  texts: Set<string>
}

let buffer: RoomBuffer | null = null
let flushTimer: ReturnType<typeof setInterval> | null = null
let started = false

function ensureTimer(): void {
  if (flushTimer !== null) return
  flushTimer = setInterval(flushNow, FLUSH_INTERVAL_MS)
}

function clearTimer(): void {
  if (flushTimer === null) return
  clearInterval(flushTimer)
  flushTimer = null
}

function dropBuffer(): void {
  buffer = null
}

/** Send the current buffer (if any has samples) and reset the window. */
export function flushNow(): void {
  const b = buffer
  if (!b || b.texts.size === 0) {
    // 没东西也得把窗口起点滚到 now,否则下一窗口会从老 startTs 开始,误导服务端。
    if (b) b.windowStartTs = Date.now()
    return
  }
  const payload = {
    roomId: b.roomId,
    channelUid: b.channelUid,
    sampledTexts: Array.from(b.texts),
    windowStartTs: b.windowStartTs,
    windowEndTs: Date.now(),
  }
  // Reset before await:flush 自身是 fire-and-forget,在 reportRadarObservation
  // 跑的同时新弹幕可以照常进新窗口的 buffer。
  buffer = {
    roomId: b.roomId,
    channelUid: b.channelUid,
    windowStartTs: payload.windowEndTs,
    texts: new Set(),
  }
  // 不 await — reportRadarObservation 已经 swallow 所有错误。
  void reportRadarObservation(payload)
}

/**
 * Per-message hook called by the danmaku-stream / custom-chat-events
 * subscriptions wired up in startRadarReportLoop. Cheap fast-paths (toggle
 * off / no roomId / no trending match) so the hot path stays cheap.
 *
 * Exported for unit tests; production callers go through the subscription.
 */
export function noteRadarObservation(rawText: string): void {
  if (!radarReportEnabled.value) return
  const roomId = cachedRoomId.value
  if (roomId === null || roomId <= 0) return
  const channelUid = cachedStreamerUid.value
  if (channelUid === null || channelUid <= 0) return

  const text = rawText.trim()
  if (!text || text.length > MAX_TEXT_LEN) return

  // 关键过滤:只有命中 radar 已知簇的才上报。这把绝大多数房间噪声挡在外面,
  // 也保证 server 那边不用反过来处理"你们是不是把整个聊天都送过来了"。
  if (lookupTrendingMatch(text) === null) return

  if (buffer === null || buffer.roomId !== roomId) {
    buffer = {
      roomId,
      channelUid,
      windowStartTs: Date.now(),
      texts: new Set(),
    }
  }
  // dedupe — 同一窗口里说 100 次的也只算一次。
  if (buffer.texts.has(text)) return
  // 防过载:buffer 已经满了就丢新条目(留旧的 — 旧的是窗口里最早被命中的,信号更纯)。
  if (buffer.texts.size >= MAX_SAMPLES) return
  buffer.texts.add(text)
}

let unsubscribeDom: (() => void) | null = null
let unsubscribeWs: (() => void) | null = null

function attachIngest(): void {
  if (unsubscribeDom !== null) return
  unsubscribeDom = subscribeDanmaku({
    onMessage: ev => noteRadarObservation(ev.text),
  })
  unsubscribeWs = subscribeCustomChatEvents(event => {
    if (event.kind !== 'danmaku' || event.source !== 'ws') return
    noteRadarObservation(event.text)
  })
}

function detachIngest(): void {
  if (unsubscribeDom) {
    unsubscribeDom()
    unsubscribeDom = null
  }
  if (unsubscribeWs) {
    unsubscribeWs()
    unsubscribeWs = null
  }
}

/**
 * Wire signal subscriptions once at app boot. Idempotent.
 *  - toggle ON → 订阅 danmaku 流(DOM + WS)+ 启动定时 flush
 *  - toggle OFF → 取消订阅 + 丢 buffer + 停 flush
 *  - 切房间 → 丢 buffer(下一条 noteRadarObservation 自动重建)
 *
 * 不在模块顶层 effect():tests import 这个模块只为调 noteRadarObservation,不应
 * 被强制订阅 GM signal。app-lifecycle 在生产路径调一次。
 */
export function startRadarReportLoop(): void {
  if (started) return
  started = true

  effect(() => {
    if (radarReportEnabled.value) {
      attachIngest()
      ensureTimer()
    } else {
      // 用户改主意时,buffer 里还没发的也别发出去。
      detachIngest()
      dropBuffer()
      clearTimer()
    }
  })

  effect(() => {
    // 切房间触发:roomId 变化时把上一间的 buffer 丢掉。
    void cachedRoomId.value
    if (buffer && buffer.roomId !== cachedRoomId.value) dropBuffer()
  })
}

/** Test-only: peek buffer state. */
export function _peekRadarReportBufferForTests(): {
  roomId: number
  size: number
  windowStartTs: number
} | null {
  if (!buffer) return null
  return { roomId: buffer.roomId, size: buffer.texts.size, windowStartTs: buffer.windowStartTs }
}

/** Test-only: reset module state between tests. */
export function _resetRadarReportForTests(): void {
  buffer = null
  clearTimer()
  detachIngest()
  started = false
}
