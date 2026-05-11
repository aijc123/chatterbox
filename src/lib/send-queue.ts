/**
 * Global send queue: serializes ALL outbound danmaku across every feature
 * (auto-send, auto-blend, manual, memes, +1, STT, AI evasion) so they never
 * compete with each other against Bilibili's per-account rate limit.
 *
 * - One POST is in flight at any time.
 * - A hard floor of {@link HARD_MIN_GAP_MS} between sends acts as a safety
 *   net so a misconfigured per-source `msgSendInterval` can't burst.
 * - Higher-priority items are inserted ahead of lower-priority items still
 *   waiting in the queue. The in-flight send is never cancelled.
 * - Manual user actions also CANCEL pending AUTO items (auto-send,
 *   auto-blend) so user-initiated sends feel snappy. STT items are only
 *   reordered, never cancelled (cutting off live speech mid-flight would
 *   be jarring).
 */

import { type SendDanmakuResult, sendDanmaku } from './api'

/** Higher number = higher priority. Manual user actions jump ahead of automation. */
export const SendPriority = {
  AUTO: 0,
  STT: 1,
  MANUAL: 2,
} as const

export type SendPriority = (typeof SendPriority)[keyof typeof SendPriority]

interface QueueItem {
  message: string
  roomId: number
  csrfToken: string
  priority: SendPriority
  resolve: (result: SendDanmakuResult) => void
  reject: (err: unknown) => void
  cancelled: boolean
}

/**
 * Bilibili enforces ~1s between sends per account. 10ms safety on top.
 * This is the FLOOR — individual features may pace themselves slower (e.g.
 * 独轮车's `msgSendInterval`) and that local cadence still applies on top.
 */
const HARD_MIN_GAP_MS = 1010

/**
 * 队列上限。1010ms 间隔 × 200 项 ≈ 3.4 分钟纯排队时间;再多基本是 stuck
 * (网络挂掉 / sendDanmaku 阻塞 / 用户疯狂粘贴),应该丢最老的 AUTO 而不是
 * 让队列一直涨。MANUAL/STT 不受此影响——这两类即便满了也能挤掉 AUTO。
 */
const MAX_QUEUE_LENGTH = 200

const queue: QueueItem[] = []
let processing = false
let lastSendCompletedAt = 0

/**
 * The item that has been dequeued but is still waiting through the hard
 * rate-limit gap before sendDanmaku() is called.  During this window the item
 * is no longer in `queue`, so cancelPendingAuto() tracks it here so that
 * clicking 停车 can mark it cancelled before the HTTP request fires.
 *
 * Once sendDanmaku() starts, this is cleared; an actual in-flight HTTP request
 * is never cancelled.
 */
let inflight: QueueItem | null = null

/** Cancel a single AUTO item and resolve its promise with a cancellation result. */
function cancelAutoItem(item: QueueItem, error: string): void {
  if (item.cancelled || item.priority !== SendPriority.AUTO) return
  item.cancelled = true
  item.resolve({ success: false, cancelled: true, message: item.message, isEmoticon: false, error })
}

/**
 * Insert keeping FIFO order WITHIN a priority level, and ordering BETWEEN
 * priority levels (highest first). New item goes after all existing items
 * with priority >= its own.
 */
function insertByPriority(item: QueueItem): void {
  let i = queue.length
  while (i > 0 && queue[i - 1].priority < item.priority) i--
  queue.splice(i, 0, item)
}

async function processQueue(): Promise<void> {
  if (processing) return
  processing = true
  try {
    while (queue.length > 0) {
      while (queue.length > 0 && queue[0].cancelled) queue.shift()
      const item = queue.shift()
      if (!item) break

      // Track this item so cancelPendingAuto() can reach it while it is
      // waiting through the rate-limit gap (no longer in queue at this point).
      inflight = item

      if (lastSendCompletedAt > 0) {
        const sinceLast = Date.now() - lastSendCompletedAt
        if (sinceLast < HARD_MIN_GAP_MS) {
          await new Promise(r => setTimeout(r, HARD_MIN_GAP_MS - sinceLast))
        }
      }

      // Re-check cancellation: the item may have been marked cancelled during
      // the sleep above (e.g. user clicked 停车 while we were waiting).
      if (item.cancelled) {
        inflight = null
        continue
      }

      inflight = null
      try {
        const result = await sendDanmaku(item.message, item.roomId, item.csrfToken)
        lastSendCompletedAt = Date.now()
        item.resolve(result)
      } catch (err) {
        lastSendCompletedAt = Date.now()
        item.reject(err)
      }
    }
  } finally {
    processing = false
  }
}

/**
 * Enqueue a danmaku send. Resolves with the same {@link SendDanmakuResult}
 * shape as raw {@link sendDanmaku}, so call sites only swap the function
 * name. The queue paces sends to never violate Bilibili's per-account rate
 * limit and prioritizes manual user actions over background automation.
 *
 * If a higher-priority send arrives and the caller's item is preempted
 * (only AUTO can be preempted, and only by MANUAL), the returned result
 * will have `cancelled: true` so the caller can render a skip log instead
 * of a fake send.
 */
export function enqueueDanmaku(
  message: string,
  roomId: number,
  csrfToken: string,
  priority: SendPriority = SendPriority.AUTO
): Promise<SendDanmakuResult> {
  return new Promise((resolve, reject) => {
    // Reject empty/whitespace-only messages without consuming a rate-limit
    // slot. Bilibili would bounce these server-side anyway, but each rejected
    // POST still counts against the per-account window.
    if (message.trim().length === 0) {
      resolve({ success: false, cancelled: true, message, isEmoticon: false, error: 'empty-text' })
      return
    }
    const item: QueueItem = { message, roomId, csrfToken, priority, resolve, reject, cancelled: false }
    insertByPriority(item)

    if (priority === SendPriority.MANUAL) {
      // Cancel the AUTO item already dequeued and sleeping through the rate-limit gap.
      if (inflight !== null) cancelAutoItem(inflight, 'preempted')
      for (const q of queue) {
        if (q !== item) cancelAutoItem(q, 'preempted')
      }
    }

    // 防溢出:总长度超 MAX_QUEUE_LENGTH 时,从队尾(优先级最低)开始把 AUTO 项
    // cancel 掉,直到回到上限以下。MANUAL/STT 不被丢——它们由用户/语音直接驱动。
    // cancelAutoItem 会调 item.resolve 通知 caller,promise 不会泄漏。
    if (queue.length > MAX_QUEUE_LENGTH) {
      for (let i = queue.length - 1; i >= 0 && queue.length > MAX_QUEUE_LENGTH; i--) {
        const q = queue[i]
        if (q.priority === SendPriority.AUTO && !q.cancelled) {
          cancelAutoItem(q, 'queue-overflow')
          queue.splice(i, 1)
        }
      }
    }

    void processQueue()
  })
}

/** Number of pending (non-cancelled) items. Useful for diagnostics. */
export function getQueueDepth(): number {
  return queue.reduce((n, q) => (q.cancelled ? n : n + 1), 0)
}

/**
 * Test-only: reset module-level state so an integration test can run a
 * second `enqueueDanmaku` without waiting through `HARD_MIN_GAP_MS` carried
 * over from a previous test's send. Production code never resets this — the
 * gap is the rate-limit safety net.
 *
 * Also marks any inflight item cancelled so a still-pending HARD_MIN_GAP
 * setTimeout closure from the previous test can't fire sendDanmaku into
 * the next test's run (the item itself stays referenced by the closure;
 * we can't stop the timer, but we can make processQueue's post-sleep
 * cancellation re-check (line ~100) bail before sending).
 */
export function _resetSendQueueForTests(): void {
  queue.length = 0
  processing = false
  lastSendCompletedAt = 0
  if (inflight !== null) inflight.cancelled = true
  inflight = null
}

/**
 * Immediately cancels all queued AUTO-priority items, plus any AUTO item that
 * has already been dequeued but is still waiting through the hard rate-limit
 * gap. Called by cancelLoop() so clicking 停车 drains the queue at once
 * rather than waiting for each item to be dequeued and discovered as stale.
 */
export function cancelPendingAuto(): void {
  if (inflight !== null) cancelAutoItem(inflight, 'loop-stopped')
  for (const q of queue) cancelAutoItem(q, 'loop-stopped')
}
