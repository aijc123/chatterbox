/**
 * radar 观察上报的小聚合器:把"本房间 5 分钟桶内"的弹幕数量与去重发送者数攒
 * 着,定期 fire-and-forget 发给 radar 的 /radar/report endpoint。
 *
 * 触发链:startRadarReportLoop 在 toggle ON 时订阅 danmaku 流(DOM 观察器 + WS
 * 自定义事件,与 auto-blend 同源,toggle OFF 立刻退订),每条 danmaku 喂给
 * noteRadarObservation。条件同时满足才进 buffer:
 *   - radarReportEnabled 开关 ON(默认 OFF — opt-in)
 *   - cachedRoomId / cachedStreamerUid / cachedSelfUid 都已解析(匿名观众
 *     不上报 — 没有可哈希的 reporter_uid)
 *
 * 与 v2.13.0 的差异(2026-05-10 schema-fix):
 *   - 服务端 schema 是 `{ reporter_uid, client_version, buckets: [...] }`,不是
 *     `{ roomId, channelUid, sampledTexts, windowStart/EndTs }`。原来的实现
 *     v2.13.0 中 100% 被 server validation 400 掉,toggle 实际不工作。
 *   - 不再发送原始弹幕文本,仅每个 5 分钟对齐桶的 (msg_count, distinct_uid_count)。
 *     这一改其实更隐私 — 文本样本都不出门了。
 *   - 不再依赖 lookupTrendingMatch 做客户端 trending-gate:server 收 raw 计数
 *     是为了驱动它自己的 trending 数学(见 server/src/routes/radar-public.ts
 *     第 660 行附近的 intent comment),客户端先剔掉"非 trending"等于把它要
 *     算的 baseline 数据也剔掉。隐私上 aggregate-only 已经没有暴露面,无需 gate。
 *
 * 隐私契约(与 radar-client.RadarReportPayload 一致):
 *   - reporter_uid 是观众自己的公开 bilibili uid,server 端 hashUid+IP_HASH_SALT
 *     之后才落地,raw uid 不进 D1。Sender uid(每条弹幕的发出者)只在客户端
 *     当 Set 成员去重 distinct_uid_count,不在 payload 里出现。
 *   - 不带任何文本、emoji、徽章、单条 timestamp。
 *   - channelUid 是主播本人公开 id,不是观众。
 *   - 失败一律静默 — reportRadarObservation 内部已 swallow,这里不再 try/catch。
 *
 * 状态切换:
 *   - 关掉 toggle 时立刻丢掉未发的 buckets。
 *   - 切房间(cachedRoomId 变化)也丢 buckets:跨房间的桶语义混在一起没意义。
 */

import { effect } from '@preact/signals'

import { getDedeUid } from './api'
import { subscribeCustomChatEvents } from './custom-chat-events'
import { subscribeDanmaku } from './danmaku-stream'
import { reportRadarObservation } from './radar-client'
import { cachedRoomId, cachedSelfUid, cachedStreamerUid } from './store'
import { radarReportEnabled } from './store-radar'

// ---------------------------------------------------------------------------
// Test-only DI seams — do NOT use from production code.
// Production paths always go through the real imports above. Tests can swap
// these out via `_setSubscribersForTests` so the aggregator can be exercised
// without spinning up real DOM observers / WS.
// ---------------------------------------------------------------------------
let _subscribeDanmakuImpl: typeof subscribeDanmaku = subscribeDanmaku
let _subscribeCustomChatEventsImpl: typeof subscribeCustomChatEvents = subscribeCustomChatEvents

const FLUSH_INTERVAL_MS = 60_000
const BUCKET_SEC = 300
/** Server-side cap (`REPORT_MAX_BUCKETS` in radar-public.ts). Drop oldest
 *  buckets first if we'd exceed — they're past the rate-limit retry window
 *  anyway, server-side INSERT OR IGNORE handles the cleanest fallback. */
const MAX_BUCKETS_PER_FLUSH = 100

interface BucketAcc {
  bucketTs: number
  roomId: number
  channelUid: number
  msgCount: number
  /** Set of sender uids (string from DOM/WS event). Size = distinct_uid_count. */
  distinctSenderUids: Set<string>
}

// Map keyed on `${roomId}:${bucketTs}` so a mid-window room change doesn't
// collide with the previous room's buckets. Clearing on room change is
// belt-and-suspenders; the key disambiguation makes it correct anyway.
let buckets: Map<string, BucketAcc> = new Map()
let flushTimer: ReturnType<typeof setInterval> | null = null
let started = false

function bucketKey(roomId: number, bucketTs: number): string {
  return `${roomId}:${bucketTs}`
}

function ensureTimer(): void {
  if (flushTimer !== null) return
  flushTimer = setInterval(flushNow, FLUSH_INTERVAL_MS)
}

function clearTimer(): void {
  if (flushTimer === null) return
  clearInterval(flushTimer)
  flushTimer = null
}

function dropBuckets(): void {
  buckets = new Map()
}

/** Send the current buckets (if non-empty) and reset. */
export function flushNow(): void {
  if (buckets.size === 0) return
  const reporterUid = cachedSelfUid.value
  // 兜底:登录状态在 buffer 攒着的过程中变化,在 flush 时 short-circuit。
  // 已经攒下的 buckets 顺手丢掉(没有 reporter 就没法上报,留着也没用)。
  if (reporterUid === null || reporterUid <= 0) {
    dropBuckets()
    return
  }

  // 截掉 server cap;若超出,丢最老的(server 还会按 (bucket_ts,room,reporter)
  // 唯一索引去重,实际重要的是别让一次 POST 被整体 400)。client-side cardinality
  // sanity:server 会拒掉 distinct_uid_count > msg_count 的桶,我们这里 Set 大小
  // 与计数同源,理论上不会越界,但加一道兜底保险防止 sender-uid 被错误注入。
  const ordered = Array.from(buckets.values()).sort((a, b) => a.bucketTs - b.bucketTs)
  const trimmed = ordered.length > MAX_BUCKETS_PER_FLUSH ? ordered.slice(-MAX_BUCKETS_PER_FLUSH) : ordered
  const payloadBuckets = trimmed.map(b => {
    const distinct = b.distinctSenderUids.size
    return {
      bucket_ts: b.bucketTs,
      room_id: b.roomId,
      channel_uid: b.channelUid,
      msg_count: b.msgCount,
      // server validates `distinct_uid_count <= msg_count`. Our bookkeeping
      // already satisfies this (each Set add comes paired with msgCount++),
      // but Math.min keeps the contract explicit and survives any future bug
      // that skips the increment. Cheap and defensive.
      distinct_uid_count: Math.min(distinct, b.msgCount),
    }
  })

  // Reset before await:flush 自身是 fire-and-forget,在 reportRadarObservation
  // 跑的同时新弹幕可以照常进新窗口的 buffer。
  dropBuckets()

  void reportRadarObservation({
    reporter_uid: reporterUid,
    buckets: payloadBuckets,
  })
}

/**
 * Per-message hook called by the danmaku-stream / custom-chat-events
 * subscriptions wired up in startRadarReportLoop. Cheap fast-paths (toggle
 * off / no roomId / no selfUid / no senderUid) so the hot path stays cheap.
 *
 * `senderUid` is the danmaku sender's uid (string from DOM dataset / WS
 * event). It's used only for distinct-count Set membership, never sent over
 * the wire. `null` means we couldn't extract it from the event — count it
 * as one anonymous sender ("anon" sentinel) so msg_count and distinct_count
 * stay coherent. (Server's cardinality check tolerates anon as a single
 * distinct sender, which is the truthful read of the event.)
 *
 * Exported for unit tests; production callers go through the subscription.
 */
export function noteRadarObservation(_rawText: string, senderUid: string | null): void {
  if (!radarReportEnabled.value) return
  const roomId = cachedRoomId.value
  if (roomId === null || roomId <= 0) return
  const channelUid = cachedStreamerUid.value
  if (channelUid === null || channelUid <= 0) return
  const selfUid = cachedSelfUid.value
  if (selfUid === null || selfUid <= 0) return

  const bucketTs = Math.floor(Date.now() / 1000 / BUCKET_SEC) * BUCKET_SEC
  const key = bucketKey(roomId, bucketTs)
  let acc = buckets.get(key)
  if (acc === undefined) {
    acc = {
      bucketTs,
      roomId,
      channelUid,
      msgCount: 0,
      distinctSenderUids: new Set(),
    }
    buckets.set(key, acc)
  }
  acc.msgCount += 1
  // 没拿到 sender uid(DOM 提取失败 / WS 老格式)就用一个稳定 sentinel,
  // 这样 distinct_count 仍然是"至少一个匿名发送者",不会越界 msg_count,
  // 也不至于在 sender_uid 全 null 时把每条弹幕都当成一个独立的 distinct user。
  acc.distinctSenderUids.add(senderUid ?? 'anon')
}

let unsubscribeDom: (() => void) | null = null
let unsubscribeWs: (() => void) | null = null

function attachIngest(): void {
  if (unsubscribeDom !== null) return
  unsubscribeDom = _subscribeDanmakuImpl({
    onMessage: ev => noteRadarObservation(ev.text, ev.uid),
  })
  unsubscribeWs = _subscribeCustomChatEventsImpl(event => {
    if (event.kind !== 'danmaku' || event.source !== 'ws') return
    noteRadarObservation(event.text, event.uid)
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

/** Read DedeUserID cookie once and store as a number; failure → null (anon). */
function refreshSelfUidFromCookie(): void {
  if (cachedSelfUid.value !== null) return
  // bun:test runs without happy-dom by default, so `document` is undefined
  // when stale toggle-effects from prior tests fire. Tests that exercise
  // the selfUid path set `cachedSelfUid` directly; production runs in a
  // real page where `document.cookie` works. Skipping in non-DOM contexts
  // means cachedSelfUid simply stays whatever it was — null in tests,
  // populated in real B站 pages.
  if (typeof document === 'undefined') return
  const raw = getDedeUid()
  if (!raw) return
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return
  cachedSelfUid.value = n
}

/**
 * Wire signal subscriptions once at app boot. Idempotent.
 *  - toggle ON → 订阅 danmaku 流(DOM + WS)+ 启动定时 flush
 *  - toggle OFF → 取消订阅 + 丢 buckets + 停 flush
 *  - 切房间 → 丢 buckets(下一条 noteRadarObservation 自动重建)
 *
 * 不在模块顶层 effect():tests import 这个模块只为调 noteRadarObservation,不应
 * 被强制订阅 GM signal。app-lifecycle 在生产路径调一次。
 */
export function startRadarReportLoop(): void {
  if (started) return
  started = true

  refreshSelfUidFromCookie()

  effect(() => {
    if (radarReportEnabled.value) {
      // Re-read on toggle-on as well — covers the edge case where the user
      // logs in after the script booted (rare, since B站 login navigates).
      refreshSelfUidFromCookie()
      attachIngest()
      ensureTimer()
    } else {
      // 用户改主意时,buckets 里还没发的也别发出去。
      detachIngest()
      dropBuckets()
      clearTimer()
    }
  })

  effect(() => {
    // 切房间触发:roomId 变化时把上一间的 buckets 丢掉。
    void cachedRoomId.value
    dropBuckets()
  })
}

/** Test-only: peek bucket aggregator state. */
export function _peekRadarReportBucketsForTests(): {
  bucketCount: number
  buckets: ReadonlyArray<{
    bucketTs: number
    roomId: number
    channelUid: number
    msgCount: number
    distinctUidCount: number
  }>
} {
  return {
    bucketCount: buckets.size,
    buckets: Array.from(buckets.values())
      .sort((a, b) => a.bucketTs - b.bucketTs)
      .map(b => ({
        bucketTs: b.bucketTs,
        roomId: b.roomId,
        channelUid: b.channelUid,
        msgCount: b.msgCount,
        distinctUidCount: b.distinctSenderUids.size,
      })),
  }
}

/** Test-only: reset module state between tests. */
export function _resetRadarReportForTests(): void {
  buckets = new Map()
  clearTimer()
  detachIngest()
  started = false
  // Restore default impls so a stray test override doesn't leak across files.
  _subscribeDanmakuImpl = subscribeDanmaku
  _subscribeCustomChatEventsImpl = subscribeCustomChatEvents
}

/**
 * Test-only DI seam: swap subscriber implementations so unit tests don't
 * have to spin up real DOM observers / WS streams. Pass a partial options
 * object — only provided keys are overridden. Reset to real impls via
 * `_resetRadarReportForTests`.
 */
export function _setSubscribersForTests(
  opts: {
    subscribeDanmaku?: typeof subscribeDanmaku
    subscribeCustomChatEvents?: typeof subscribeCustomChatEvents
  } = {}
): void {
  if (opts.subscribeDanmaku) _subscribeDanmakuImpl = opts.subscribeDanmaku
  if (opts.subscribeCustomChatEvents) _subscribeCustomChatEventsImpl = opts.subscribeCustomChatEvents
}
