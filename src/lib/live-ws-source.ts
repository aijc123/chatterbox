import { KeepLiveWS } from '@laplace.live/ws/client'

import { ensureRoomId } from './api'
import { BASE_URL } from './const'
import {
  chatEventTime,
  emitCustomChatEvent,
  emitCustomChatWsStatus,
  type CustomChatEvent,
  type CustomChatField,
} from './custom-chat-events'
import { appendLog } from './log'

interface DanmuInfoResponse {
  code: number
  message?: string
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

let keep: KeepLiveWS | null = null
let started = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
const recentDanmaku = new Map<string, number>()

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
  const value = asNumber(price)
  return value > 0 ? `¥${Math.round(value / 1000)}` : ''
}

function avatarUrl(uid: string | null): string | undefined {
  return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : undefined
}

function cleanupRecent(): void {
  const now = Date.now()
  for (const [key, ts] of recentDanmaku) {
    if (now - ts > 8000) recentDanmaku.delete(key)
  }
}

export function hasRecentWsDanmaku(text: string, uid: string | null): boolean {
  cleanupRecent()
  return recentDanmaku.has(`${uid ?? ''}:${text}`)
}

function rememberWsDanmaku(text: string, uid: string | null): void {
  cleanupRecent()
  recentDanmaku.set(`${uid ?? ''}:${text}`, Date.now())
}

function eventId(cmd: string, data: UnknownRecord, fallback: string): string {
  return asString(data.msg_id) || String(data.id ?? data.uid ?? fallback)
}

async function fetchDanmuInfo(roomId: number): Promise<{ key: string; address: string }> {
  const resp = await fetch(`${BASE_URL.BILIBILI_DANMU_INFO}?id=${roomId}&type=0`, { credentials: 'include' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: DanmuInfoResponse = await resp.json()
  if (json.code !== 0 || !json.data?.token) throw new Error(json.message ?? '弹幕服务器信息获取失败')
  const host = json.data.host_list?.find(item => item.host && (item.wss_port || item.port || item.ws_port))
  if (!host?.host) throw new Error('弹幕服务器地址为空')
  const port = host.wss_port || host.port || host.ws_port || 443
  return { key: json.data.token, address: `wss://${host.host}:${port}/sub` }
}

function emit(event: CustomChatEvent): void {
  emitCustomChatEvent(event)
}

function bindEvents(roomId: number, live: KeepLiveWS): void {
  live.addEventListener('live', () => {
    emitCustomChatWsStatus('live')
    appendLog(`🟢 Chatterbox Chat WS 已连接：${roomId}`)
  })
  live.addEventListener('close', () => {
    emitCustomChatWsStatus('closed')
    appendLog('⚪ Chatterbox Chat WS 已断开')
  })
  live.addEventListener('error', () => {
    emitCustomChatWsStatus('error')
    appendLog('🔴 Chatterbox Chat WS 连接异常，DOM 消息源继续兜底')
  })

  live.addEventListener('DANMU_MSG', ({ data }) => {
    const info = data.info
    const text = info[1]
    const user = info[2]
    const badge = info[3]
    const level = info[4]
    const uid = String(user[0])
    rememberWsDanmaku(text, uid)
    const badges: string[] = []
    if (badge && badge[0]) badges.push(`${badge[1]} ${badge[0]}`)
    if (level?.[0]) badges.push(`UL ${level[0]}`)
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
      badges: gift.price > 0 ? [`${Math.round(gift.price / 1000)}元`] : [],
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
  try {
    emitCustomChatWsStatus('connecting')
    const roomId = await ensureRoomId()
    const info = await fetchDanmuInfo(roomId)
    keep = new KeepLiveWS(roomId, info)
    bindEvents(roomId, keep)
  } catch (err) {
    emitCustomChatWsStatus('error')
    const message = err instanceof Error ? err.message : String(err)
    appendLog(`🔴 Chatterbox Chat WS 启动失败：${message}`)
    reconnectTimer = setTimeout(() => void connect(), 8000)
  }
}

export function startLiveWsSource(): void {
  if (started) return
  started = true
  emitCustomChatWsStatus('connecting')
  void connect()
}

export function stopLiveWsSource(): void {
  started = false
  emitCustomChatWsStatus('off')
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  keep?.close()
  keep = null
}
