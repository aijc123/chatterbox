import { LiveWS } from '@laplace.live/ws/client'

import { ensureRoomId, getDedeUid } from './api'
import { BASE_URL } from './const'
import {
  type CustomChatEvent,
  type CustomChatField,
  chatEventTime,
  emitCustomChatEvent,
  emitCustomChatWsStatus,
} from './custom-chat-events'
import { formatMilliyuanAmount, formatMilliyuanBadgeAmount } from './custom-chat-pricing'
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
const recentDanmaku = new Map<string, number>()
// Hard cap so a misbehaving feed can't grow this map forever between cleanups.
const RECENT_DANMAKU_MAX = 500
// Use a NUL separator that can't appear in `uid` (digits) or chat `text` (Bilibili
// strips control chars). Avoids `${uid}:${text}` collisions like
// `uid="1", text="2:hi"` matching `uid="1:2", text="hi"`.
const RECENT_DANMAKU_KEY_SEP = '\x00'

// Exported for unit-test reach so we can verify the key shape doesn't
// collide on values that contain the legacy `:` separator.
export function recentKey(text: string, uid: string | null): string {
  return `${uid ?? ''}${RECENT_DANMAKU_KEY_SEP}${text}`
}

/**
 * Parses the value of the DedeUserID cookie into a numeric Bilibili LiveWS
 * `uid` field. Bilibili expects a number. We fall back to anonymous (`0`) if:
 *  - the cookie is missing/empty
 *  - the value is not a finite integer
 *  - the value is negative
 *  - the value exceeds `Number.MAX_SAFE_INTEGER` (forward-compat against
 *    future UID growth — sending a precision-lost number would be silently
 *    wrong)
 */
export function parseAuthUid(uidCookie: string | null | undefined): number {
  if (!uidCookie) return 0
  const parsed = Number(uidCookie)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return parsed
}

const RECONNECT_BASE_MS = 3000
const RECONNECT_STEP_MS = 2000
const RECONNECT_CAP_MS = 30_000
const RECONNECT_JITTER_RATIO = 0.25

/**
 * Computes the next reconnect delay with capped linear backoff plus 0–25%
 * jitter. The jitter prevents multiple Chatterbox tabs from reconnecting in
 * lockstep against Bilibili's WS endpoints.
 */
export function computeReconnectDelay(attempt: number, random: () => number = Math.random): number {
  const baseDelay = Math.min(RECONNECT_CAP_MS, RECONNECT_BASE_MS + attempt * RECONNECT_STEP_MS)
  const jitter = Math.floor(random() * baseDelay * RECONNECT_JITTER_RATIO)
  return baseDelay + jitter
}
const STARTUP_FAILURE_LOG_INTERVAL = 60_000

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function nonEmptyFields(fields: Array<CustomChatField | null | undefined>): CustomChatField[] {
  return fields.filter((field): field is CustomChatField => !!field?.value)
}

function yuanFromGiftPrice(price: unknown): string {
  return formatMilliyuanAmount(asNumber(price))
}

function avatarUrl(uid: string | null): string | undefined {
  return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : undefined
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

function closeDetail(event: CloseEvent): string {
  const reason = event.reason ? `, reason=${event.reason}` : ''
  return `code=${event.code}, clean=${event.wasClean}${reason}`
}

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

    const live = new LiveWS(roomId, {
      address,
      authBody,
      createWebSocket: url => {
        const ws = new WebSocket(url)
        ws.addEventListener('close', event => {
          lastWsCloseDetail = `${url} ${closeDetail(event)}`
        })
        ws.addEventListener('error', () => {
          lastWsCloseDetail = `${url} WebSocket error`
        })
        return ws
      },
    })
    const previous = liveConnection
    liveConnection = live
    previous?.close()
    bindEvents(roomId, live)

    live.addEventListener('live', () => {
      reconnectAttempt = 0
    })
    live.addEventListener('close', () => {
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

export function startLiveWsSource(): void {
  consumerCount += 1
  if (started) return
  started = true
  emitCustomChatWsStatus('connecting')
  void connect()
}

export function stopLiveWsSource(): void {
  consumerCount = Math.max(0, consumerCount - 1)
  if (consumerCount > 0) return
  started = false
  connectionSerial += 1
  emitCustomChatWsStatus('off')
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  liveConnection?.close()
  liveConnection = null
}
