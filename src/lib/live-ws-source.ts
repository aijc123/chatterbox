import { LiveWS } from '@laplace.live/ws/client'

import { ensureRoomId, getDedeUid } from './api'

// Test-only DI seam: production never sets `_liveWsFactoryOverride`. Tests
// inject a fake LiveWS class so we can drive `bindEvents` handlers and
// assert reconnect / lifecycle behavior without a real WebSocket.
//
// Same rationale as `_setGmXhrForTests` in `gm-fetch.ts`: bun caches `$`
// imports across test files, so `mock.module` on `@laplace.live/ws/client`
// is unreliable; an explicit DI hook is the project convention.
type LiveWsCtorArgs = ConstructorParameters<typeof LiveWS>
type LiveWsFactory = (...args: LiveWsCtorArgs) => LiveWS
let _liveWsFactoryOverride: LiveWsFactory | null = null
/** @internal Tests only. Pass `null` to clear the override. */
export function _setLiveWsFactoryForTests(factory: LiveWsFactory | null): void {
  _liveWsFactoryOverride = factory
}

import { BASE_URL } from './const'
import {
  type CustomChatEvent,
  type CustomChatField,
  chatEventTime,
  emitCustomChatEvent,
  emitCustomChatWsStatus,
} from './custom-chat-events'
import { formatMilliyuanAmount, formatMilliyuanBadgeAmount } from './custom-chat-pricing'
import {
  computeReconnectDelay,
  formatCloseDetail,
  parseAuthUid,
  recentKey,
  shouldForceImmediateReconnect,
} from './live-ws-helpers'
import { appendLog } from './log'
import { encodeWbi, ensureWbiKeys } from './wbi'

interface DanmuInfoResponse {
  code: number
  message?: string
  msg?: string
  data?: {
    token?: string
    host_list?: Array<{
      host?: string
      port?: number
      wss_port?: number
      ws_port?: number
    }>
  }
}

type UnknownRecord = Record<string, unknown>

function getSpmPrefix(): string {
  const metaTag = document.querySelector('meta[name="spm_prefix"]')
  return metaTag?.getAttribute('content') ?? '444.8'
}

let liveConnection: LiveWS | null = null
let started = false
let consumerCount = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let lastStartupFailure = ''
let lastStartupFailureAt = 0
let addressIndex = 0
let reconnectAttempt = 0
let connectionSerial = 0
let lastWsCloseDetail = ''
// Set to true once the WS reaches the room-entered state (`live` event), and
// flipped back to false when the connection closes. Used by the
// visibilitychange recovery path to decide whether to force a reconnect when
// the tab returns to the foreground.
let connectionHealthy = false
let visibilityRecoveryWired = false
const recentDanmaku = new Map<string, number>()
// Hard cap so a misbehaving feed can't grow this map forever between cleanups.
const RECENT_DANMAKU_MAX = 500

const STARTUP_FAILURE_LOG_INTERVAL = 60_000

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {}
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value !== undefined && value !== null) liveWsCoercionDiagnostics.stringFallbacks++
  return fallback
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  // `null` and `undefined` are valid "field absent" signals on B 站 payloads
  // and don't indicate schema drift; we only count the genuinely surprising
  // shapes (string-where-number, object-where-number, NaN/Infinity).
  if (value !== undefined && value !== null) liveWsCoercionDiagnostics.numberFallbacks++
  return fallback
}

/**
 * Diagnostic counters incremented whenever `asNumber` / `asString` swap a
 * surprisingly-shaped WS payload field for a fallback. Numbers staying at 0
 * across a full session implies B 站's payload shape matches our types;
 * non-zero values usually mean a schema change shipped upstream and one of
 * the chat features is silently degrading. Inspect via
 * `window.__chatterboxLiveWsCoercion` from DevTools when triaging issues
 * about missing prices / blank usernames / wrong gift counts.
 */
export const liveWsCoercionDiagnostics = { numberFallbacks: 0, stringFallbacks: 0 }
if (typeof window !== 'undefined') {
  ;(window as unknown as { __chatterboxLiveWsCoercion?: typeof liveWsCoercionDiagnostics }).__chatterboxLiveWsCoercion =
    liveWsCoercionDiagnostics
}

function nonEmptyFields(fields: Array<CustomChatField | null | undefined>): CustomChatField[] {
  return fields.filter((field): field is CustomChatField => field?.value != null && field.value !== '')
}

function yuanFromGiftPrice(price: unknown): string {
  return formatMilliyuanAmount(asNumber(price))
}

function avatarUrl(uid: string | null): string | undefined {
  return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : undefined
}

// Bilibili's DANMU_MSG packs sticker metadata into `info[0][13]` whenever
// `info[0][12] === 1` (dm_type=1 = the whole danmaku is a single emoticon).
// When present, `url` is authoritative: it points at the room-specific image
// even for packages we never fetched into the cache. Falling back to text
// scanning loses these stickers. Exported for unit tests.
export function extractEmoticonImage(
  info: unknown,
  text: string
): { url: string; alt: string; width?: number; height?: number } | undefined {
  if (!Array.isArray(info)) return undefined
  const meta = info[0]
  if (!Array.isArray(meta)) return undefined
  if (meta[12] !== 1) return undefined
  const opts = asRecord(meta[13])
  const url = asString(opts.url)
  if (!url) return undefined
  const alt = asString(opts.emoticon_unique) || asString(opts.emoji) || text || '表情'
  const width = typeof opts.width === 'number' && opts.width > 0 ? opts.width : undefined
  const height = typeof opts.height === 'number' && opts.height > 0 ? opts.height : undefined
  return { url, alt, width, height }
}

// Counter so we sweep at most once every N reads. Amortizes the linear scan
// to O(1) per call while preserving TTL semantics: a stale key won't survive
// indefinitely, just up to (sweep interval) extra reads.
let recentSweepCounter = 0
const RECENT_SWEEP_INTERVAL = 32

function cleanupRecent(): void {
  recentSweepCounter++
  // Always sweep when we're past the size cap; otherwise sweep periodically.
  if (recentDanmaku.size <= RECENT_DANMAKU_MAX && recentSweepCounter < RECENT_SWEEP_INTERVAL) return
  recentSweepCounter = 0
  const now = Date.now()
  for (const [key, ts] of recentDanmaku) {
    if (now - ts > 8000) recentDanmaku.delete(key)
  }
  // Best-effort: if expiry alone didn't drop us below the cap (e.g. a very
  // chatty room with sub-8s churn), drop the oldest entries by insertion order.
  while (recentDanmaku.size > RECENT_DANMAKU_MAX) {
    const oldest = recentDanmaku.keys().next().value
    if (oldest === undefined) break
    recentDanmaku.delete(oldest)
  }
}

export function hasRecentWsDanmaku(text: string, uid: string | null): boolean {
  cleanupRecent()
  return recentDanmaku.has(recentKey(text, uid))
}

function rememberWsDanmaku(text: string, uid: string | null): void {
  cleanupRecent()
  recentDanmaku.set(recentKey(text, uid), Date.now())
}

function eventId(_cmd: string, data: UnknownRecord, fallback: string): string {
  return asString(data.msg_id) || String(data.id ?? data.uid ?? fallback)
}

function getCookie(name: string): string | undefined {
  const prefix = `${name}=`
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(prefix))
    ?.slice(prefix.length)
}

function getBuvid(): string | undefined {
  return getCookie('buvid3') ?? getCookie('buvid4') ?? getCookie('buvid_fp')
}

// Diagnostic close-event formatter lives in `live-ws-helpers.ts` so unit
// tests can exercise it without loading this module's heavy import graph.

interface DanmuInfo {
  key: string
  addresses: string[]
}

async function fetchDanmuInfo(roomId: number): Promise<DanmuInfo> {
  const wbiKeys = await ensureWbiKeys()
  if (!wbiKeys) throw new Error('WBI keys unavailable')

  const query = encodeWbi(
    {
      id: roomId,
      type: 0,
      web_location: getSpmPrefix(),
    },
    wbiKeys
  )
  const resp = await fetch(`${BASE_URL.BILIBILI_DANMU_INFO}?${query}`, { credentials: 'include' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: DanmuInfoResponse = await resp.json()
  if (json.code !== 0 || !json.data?.token) {
    const message = json.message ?? json.msg ?? 'danmaku server info unavailable'
    throw new Error(json.code === -352 ? `Bilibili rejected getDanmuInfo (-352): ${message}` : message)
  }
  const addresses = [
    ...new Set(
      json.data.host_list?.filter(item => item.host).map(item => `wss://${item.host}:${item.wss_port || 443}/sub`) ?? []
    ),
  ]
  if (addresses.length === 0) throw new Error('弹幕服务器地址为空')
  return { key: json.data.token, addresses }
}

function appendStartupFailure(message: string): void {
  const now = Date.now()
  if (message === lastStartupFailure && now - lastStartupFailureAt < STARTUP_FAILURE_LOG_INTERVAL) return
  lastStartupFailure = message
  lastStartupFailureAt = now
  appendLog(`⚪ Chatterbox Chat WS 暂不可用，DOM 消息源继续兜底：${message}`)
}

function emit(event: CustomChatEvent): void {
  emitCustomChatEvent(event)
}

function bindEvents(roomId: number, live: LiveWS): void {
  live.addEventListener('live', () => {
    emitCustomChatWsStatus('live')
    lastStartupFailure = ''
    lastStartupFailureAt = 0
    appendLog(`🟢 Chatterbox Chat WS 已连接：${roomId}`)
  })
  live.addEventListener('close', () => {
    emitCustomChatWsStatus('closed')
  })
  live.addEventListener('error', () => {
    emitCustomChatWsStatus('error')
    appendStartupFailure('connection error')
  })

  live.addEventListener('DANMU_MSG', ({ data }) => {
    const info = data.info
    const text = info[1]
    const user = info[2]
    const badge = info[3]
    const level = info[4]
    const uid = String(user[0])
    const userLevel = Number(level?.[0] ?? 0)
    if (uid === (getDedeUid() ?? '')) {
      // skipcq: JS-0002 — diagnostic trace; intentionally bypasses appendLogQuiet so test assertions on the log buffer stay deterministic
      console.log(`[CB][WS-SELF] t=${Date.now()} text="${text}" uid=${uid} room=${roomId}`)
    }
    rememberWsDanmaku(text, uid)
    const badges: string[] = []
    if (badge?.[0]) badges.push(`${badge[1]} ${badge[0]}`)
    if (Number.isFinite(userLevel) && userLevel > 0) badges.push(`LV${userLevel}`)
    if (user[2] === 1) badges.push('房管')
    emit({
      id: data.msg_id ?? `dm-${uid}-${Date.now()}-${Math.random()}`,
      kind: 'danmaku',
      text,
      sendText: text,
      uname: user[1] || '匿名',
      uid,
      time: chatEventTime(asNumber(info[0][4], Date.now())),
      isReply: false,
      source: 'ws',
      badges,
      avatarUrl: avatarUrl(uid),
      rawCmd: data.cmd,
      emoticonImage: extractEmoticonImage(info, text),
    })
  })

  live.addEventListener('SEND_GIFT', ({ data }) => {
    const gift = data.data
    const uid = String(gift.uid ?? '')
    const num = Number(gift.num ?? 1)
    emit({
      id: eventId(data.cmd, gift as unknown as UnknownRecord, `gift-${Date.now()}`),
      kind: 'gift',
      text: `${gift.action || '投喂'} ${gift.giftName} x${num}`,
      uname: gift.uname || '匿名',
      uid,
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: gift.price > 0 ? [formatMilliyuanBadgeAmount(gift.price)] : [],
      avatarUrl: avatarUrl(uid),
      amount: gift.price,
      fields: nonEmptyFields([
        { key: 'gift-name', label: '礼物', value: String(gift.giftName ?? ''), kind: 'text' },
        { key: 'gift-count', label: '数量', value: `x${num}`, kind: 'count' },
        { key: 'gift-price', label: '金额', value: yuanFromGiftPrice(gift.price), kind: 'money' },
        { key: 'gift-action', label: '动作', value: String(gift.action ?? ''), kind: 'text' },
      ]),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('SUPER_CHAT_MESSAGE', ({ data }) => {
    const sc = data.data
    emit({
      id: String(sc.id ?? data.msg_id ?? `sc-${Date.now()}`),
      kind: 'superchat',
      text: sc.message,
      sendText: sc.message,
      uname: sc.user_info?.uname || '匿名',
      uid: String(sc.uid ?? ''),
      time: chatEventTime((sc.ts || sc.start_time || Date.now() / 1000) * 1000),
      isReply: false,
      source: 'ws',
      badges: [`SC ${sc.price}元`],
      avatarUrl: avatarUrl(String(sc.uid ?? '')),
      amount: sc.price,
      fields: nonEmptyFields([
        { key: 'sc-price', label: '金额', value: sc.price ? `¥${sc.price}` : '', kind: 'money' },
        { key: 'sc-duration', label: '时长', value: sc.time ? `${sc.time}s` : '', kind: 'duration' },
        { key: 'sc-user', label: '用户', value: sc.user_info?.uname || '', kind: 'text' },
      ]),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('INTERACT_WORD', ({ data }) => {
    const d = data.data
    if (d.msg_type !== 1 && d.msg_type !== 2) return
    emit({
      id: `interact-${d.uid}-${d.trigger_time || Date.now()}`,
      kind: d.msg_type === 2 ? 'follow' : 'enter',
      text: d.msg_type === 2 ? '关注了直播间' : '进入直播间',
      uname: d.uname || d.uinfo?.base?.name || '匿名',
      uid: String(d.uid ?? ''),
      time: chatEventTime((d.timestamp || Date.now()) * 1000),
      isReply: false,
      source: 'ws',
      badges: d.privilege_type ? [`舰队 ${d.privilege_type}`, `GUARD ${d.privilege_type}`] : [],
      avatarUrl: avatarUrl(String(d.uid ?? '')),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('GUARD_BUY', ({ data }) => {
    const d = data.data
    const uid = String(d.uid ?? '')
    const guard = String(d.guard_level ?? d.privilege_type ?? '')
    const guardName = guard === '1' ? '总督' : guard === '2' ? '提督' : '舰长'
    const months = asNumber(d.num)
    emit({
      id: eventId(data.cmd, d as unknown as UnknownRecord, `guard-${Date.now()}`),
      kind: 'guard',
      text: `${d.username || d.uname || '用户'} 开通 ${guardName}${months ? ` x${months}` : ''}`,
      uname: d.username || d.uname || '匿名',
      uid,
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: guard ? [`GUARD ${guard}`] : [],
      avatarUrl: avatarUrl(uid),
      amount: asNumber(d.price),
      fields: nonEmptyFields([
        { key: 'guard-level', label: '等级', value: guardName, kind: 'level' },
        { key: 'guard-months', label: '月份', value: months ? `${months}个月` : '', kind: 'duration' },
        { key: 'guard-price', label: '金额', value: yuanFromGiftPrice(d.price), kind: 'money' },
      ]),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('POPULARITY_RED_POCKET_START', ({ data }) => {
    const d = asRecord(data.data)
    emit({
      id: eventId(data.cmd, d, `redpacket-${Date.now()}`),
      kind: 'redpacket',
      text: asString(d.title || d.lot_name || d.sender_name, '直播间红包开启'),
      uname: asString(d.sender_name || d.uname, '红包'),
      uid: String(d.sender_uid ?? d.uid ?? ''),
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: ['红包'],
      avatarUrl: avatarUrl(String(d.sender_uid ?? d.uid ?? '')),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('ANCHOR_LOT_START', ({ data }) => {
    const d = asRecord(data.data)
    emit({
      id: eventId(data.cmd, d, `lottery-${Date.now()}`),
      kind: 'lottery',
      text: asString(d.award_name || d.require_text || d.title, '天选时刻开启'),
      uname: '天选时刻',
      uid: null,
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: ['天选'],
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('ENTRY_EFFECT', ({ data }) => {
    const d = data.data
    emit({
      id: `entry-${d.uid}-${d.id}-${Date.now()}`,
      kind: 'enter',
      text: asString(d.copy_writing_v2 || d.copy_writing, '进入直播间').replace(/<%|%>/g, ''),
      uname: d.uinfo?.base?.name || '匿名',
      uid: String(d.uid ?? ''),
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: d.privilege_type ? [`舰队 ${d.privilege_type}`, `GUARD ${d.privilege_type}`] : [],
      avatarUrl: avatarUrl(String(d.uid ?? '')),
      rawCmd: data.cmd,
    })
  })

  live.addEventListener('COMMON_NOTICE_DANMAKU', ({ data }) => {
    const d = asRecord(data)
    emit({
      id: `notice-${Date.now()}-${Math.random()}`,
      kind: 'notice',
      text: asString(asRecord(d.data).content_segments?.toString?.() ?? d.cmd, '系统通知'),
      uname: '系统',
      uid: null,
      time: chatEventTime(),
      isReply: false,
      source: 'ws',
      badges: ['NOTICE'],
      rawCmd: asString(d.cmd),
    })
  })
}

async function connect(): Promise<void> {
  if (!started) return
  reconnectTimer = null
  const serial = ++connectionSerial
  try {
    emitCustomChatWsStatus('connecting')
    const roomId = await ensureRoomId()
    const info = await fetchDanmuInfo(roomId)
    if (!started || serial !== connectionSerial) return

    const address = info.addresses[addressIndex % info.addresses.length]
    addressIndex += 1
    const uid = parseAuthUid(getDedeUid())
    const buvid = getBuvid()
    const authBody: Record<string, unknown> = {
      uid,
      roomid: roomId,
      protover: 3,
      platform: 'web',
      type: 2,
      key: info.key,
      clientver: '1.14.3',
    }
    if (buvid) authBody.buvid = buvid

    const wsOpts = {
      address,
      authBody,
      createWebSocket: (url: string) => {
        const ws = new WebSocket(url)
        ws.addEventListener('close', event => {
          lastWsCloseDetail = `${url} ${formatCloseDetail(event)}`
        })
        ws.addEventListener('error', () => {
          lastWsCloseDetail = `${url} WebSocket error`
        })
        return ws
      },
    }
    const live = _liveWsFactoryOverride ? _liveWsFactoryOverride(roomId, wsOpts) : new LiveWS(roomId, wsOpts)
    const previous = liveConnection
    liveConnection = live
    previous?.close()
    bindEvents(roomId, live)

    live.addEventListener('live', () => {
      reconnectAttempt = 0
      connectionHealthy = true
    })
    live.addEventListener('close', () => {
      connectionHealthy = false
      if (!started || liveConnection !== live) return
      const suffix = lastWsCloseDetail ? ` (${lastWsCloseDetail})` : ''
      appendStartupFailure(live.live ? `connection closed${suffix}` : `closed before room entered${suffix}`)
      const delay = computeReconnectDelay(reconnectAttempt)
      reconnectAttempt += 1
      reconnectTimer = setTimeout(() => void connect(), delay)
    })
  } catch (err) {
    emitCustomChatWsStatus('error')
    const message = err instanceof Error ? err.message : String(err)
    appendStartupFailure(message)
    const delay = Math.min(30_000, 3000 + reconnectAttempt * 2000)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => void connect(), delay)
  }
}

/**
 * Mobile browsers and bfcache transitions throttle (or freeze) `setTimeout`
 * for backgrounded tabs. A reconnect scheduled while hidden may fire many
 * minutes after the user returns — long enough that they assume the chat
 * died. When the page becomes visible again, if we should be connected but
 * aren't, drop any stale pending reconnect and force a fresh attempt
 * immediately.
 *
 * Wired once at module load. No-op when the script loads in a context
 * without `document` (unit tests, Node).
 */
function ensureVisibilityRecoveryWired(): void {
  if (visibilityRecoveryWired) return
  if (typeof document === 'undefined') return
  visibilityRecoveryWired = true
  document.addEventListener('visibilitychange', () => {
    if (
      !shouldForceImmediateReconnect({
        visibilityState: document.visibilityState,
        started,
        connectionHealthy,
      })
    ) {
      return
    }
    // Stale backoff timer (which the OS may have throttled to never-firing)
    // is replaced by an immediate reconnect on next tick.
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempt = 0
    void connect()
  })
}

export function startLiveWsSource(): void {
  consumerCount += 1
  if (started) return
  started = true
  ensureVisibilityRecoveryWired()
  emitCustomChatWsStatus('connecting')
  void connect()
}

export function stopLiveWsSource(): void {
  consumerCount = Math.max(0, consumerCount - 1)
  if (consumerCount > 0) return
  started = false
  connectionSerial += 1
  connectionHealthy = false
  emitCustomChatWsStatus('off')
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  liveConnection?.close()
  liveConnection = null
}

/**
 * 测试用：把模块级状态完全清掉。`startLiveWsSource` / `stopLiveWsSource` 走的是
 * 引用计数协议，无法在测试 setup 中确定性归零（先前 test 的 stop 可能没把
 * `consumerCount` 减到 0）。这个 hook 把 connection / counters / 计时器
 * 全部撕掉，让每个 test 从干净状态起步。
 */
export function _resetLiveWsStateForTests(): void {
  started = false
  consumerCount = 0
  connectionSerial += 1
  connectionHealthy = false
  reconnectAttempt = 0
  addressIndex = 0
  lastStartupFailure = ''
  lastStartupFailureAt = 0
  lastWsCloseDetail = ''
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  liveConnection?.close()
  liveConnection = null
  recentDanmaku.clear()
  recentSweepCounter = 0
  liveWsCoercionDiagnostics.numberFallbacks = 0
  liveWsCoercionDiagnostics.stringFallbacks = 0
}
