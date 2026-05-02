import { effect } from '@preact/signals'

import type { BilibiliGetEmoticonsResponse } from '../types'

import { mapWithConcurrency } from './concurrency'
import { BASE_URL } from './const'
import { emitLocalDanmakuEcho } from './custom-chat-events'
import { findEmoticon, isEmoticonUnique, isLockedEmoticon } from './emoticon'
import { describeRestrictionDuration, type RestrictionSignal, scanRestrictionSignals } from './moderation'
import { buildReplacementMap } from './replacement'
import { availableDanmakuColors, cachedEmoticonPackages, cachedRoomId, cachedStreamerUid } from './store'
import { extractRoomNumber } from './utils'
import { cachedWbiKeys, encodeWbi } from './wbi'

/** Default Bilibili danmaku color palette (used when room config not loaded). */
const DEFAULT_DANMAKU_COLORS = [
  '0xe33fff',
  '0x54eed8',
  '0x58c1de',
  '0x455ff6',
  '0x975ef9',
  '0xc35986',
  '0xff8c21',
  '0x00fffc',
  '0x7eff00',
  '0xffed4f',
  '0xff9800',
]

const SEND_DANMAKU_TIMEOUT_MS = 12000

/**
 * Reads a single cookie value by name from `document.cookie`.
 */
function getCookie(name: string): string | undefined {
  const prefix = `${name}=`
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(prefix))
    ?.slice(prefix.length)
}

/**
 * Gets the spm_prefix value from the meta tag for web_location.
 */
export function getSpmPrefix(): string {
  const metaTag = document.querySelector('meta[name="spm_prefix"]')
  return metaTag?.getAttribute('content') ?? '444.8'
}

/**
 * Gets the CSRF token from browser cookies (bili_jct).
 */
export function getCsrfToken(): string | undefined {
  return getCookie('bili_jct')
}

/**
 * Gets the logged-in user's UID from browser cookies (DedeUserID).
 */
export function getDedeUid(): string | undefined {
  return getCookie('DedeUserID')
}

function getLiveLocalEchoName(): string {
  const selectors = [
    '.user-panel-ctnr .user-name',
    '.right-ctnr .userinfo-ctnr .uname',
    '.chat-control-panel-vm .user-name',
    '[class*="user-panel"] [class*="user-name"]',
    '[class*="user-info"] [class*="name"]',
  ]
  for (const selector of selectors) {
    const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim()
    if (text) return text
  }
  return '我'
}

/**
 * Fetches the real room ID for a Bilibili live room from the API.
 */
export async function getRoomId(url = window.location.href): Promise<number> {
  const shortUid = safeExtractRoomNumber(url)
  if (!shortUid) throw new Error('无法从当前页面 URL 解析直播间号')

  // Primary: room_init resolves legacy short-room-IDs to real IDs.
  try {
    const room = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT}?id=${shortUid}`, {
      method: 'GET',
      credentials: 'include',
    })
    if (room.ok) {
      const roomData: { data: { room_id: number; uid: number } } = await room.json()
      cachedStreamerUid.value = roomData.data.uid
      return roomData.data.room_id
    }
  } catch {
    // fall through to alternative
  }

  // Fallback: try get_info with the slug as room_id (works for modern rooms).
  try {
    const room = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT_ALT}?room_id=${shortUid}`, {
      method: 'GET',
      credentials: 'include',
    })
    if (room.ok) {
      const json: { code?: number; data?: { room_id?: number; uid?: number } } = await room.json()
      if (json.code === 0 && json.data?.room_id) {
        if (json.data.uid) cachedStreamerUid.value = json.data.uid
        return json.data.room_id
      }
    }
  } catch {
    // fall through to last resort
  }

  // Last resort: for modern rooms the URL slug is already the real room ID.
  const directId = Number(shortUid)
  if (Number.isFinite(directId) && directId > 0) return directId
  throw new Error('无法获取真实直播间 ID')
}

// The URL slug (e.g. "12345") used to resolve the currently cached room ID.
// If the user navigates to a different room without a full reload, the slug
// changes and we invalidate the cache so the next call re-resolves.
let cachedRoomSlug: string | null = null

// Keep the slug in sync with `cachedRoomId`. If anything outside this module
// resets `cachedRoomId.value = null` (e.g. an imported settings backup),
// the slug must reset too — otherwise `ensureRoomId` would happily re-cache
// the same room id without re-resolving against the current URL.
effect(() => {
  if (cachedRoomId.value === null) cachedRoomSlug = null
})

/**
 * Returns the cached room ID, fetching and caching it if needed.
 * Invalidates the cache when window.location.href no longer matches the slug
 * that was used to populate it, so SPA navigation picks up the new room.
 */
export async function ensureRoomId(): Promise<number> {
  const currentSlug = safeExtractRoomNumber(window.location.href)
  if (cachedRoomId.value !== null && cachedRoomSlug === currentSlug) {
    return cachedRoomId.value
  }
  // URL changed or first call — reset and re-resolve.
  cachedRoomId.value = null
  cachedRoomSlug = currentSlug
  const roomId = await getRoomId()
  cachedRoomId.value = roomId
  // Room-specific replacement rules depend on the resolved room id.
  buildReplacementMap()
  return roomId
}

export async function fetchEmoticons(roomId: number): Promise<void> {
  const resp = await fetch(`${BASE_URL.BILIBILI_GET_EMOTICONS}?platform=pc&room_id=${roomId}`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: BilibiliGetEmoticonsResponse = await resp.json()
  if (json?.code === 0 && json.data?.data) {
    // 把傻逼b豆表情移除（pkg_id === 100）
    cachedEmoticonPackages.value = json.data.data.filter(pkg => pkg.pkg_id !== 100)
  }
}

export interface SendDanmakuResult {
  success: boolean
  message: string
  isEmoticon: boolean
  startedAt?: number
  error?: string
  errorCode?: number
  errorData?: unknown
  /**
   * Set by the global send queue when this item was preempted by a
   * higher-priority send before it could go out. Callers should treat this
   * as a benign skip rather than a failure.
   */
  cancelled?: boolean
}

function safeExtractRoomNumber(url: string): string | null {
  try {
    return extractRoomNumber(url) ?? null
  } catch {
    return null
  }
}

export interface MedalRoom {
  roomId: number
  medalName: string
  anchorName: string
  anchorUid: number | null
  source: 'medal-link' | 'medal-room-id' | 'anchor-uid'
}

export interface FollowingRoom {
  roomId: number
  anchorName: string
  anchorUid: number
}

export async function fetchRoomLiveStatus(roomId: number): Promise<'live' | 'offline' | 'unknown'> {
  const response = await fetch(`${BASE_URL.BILIBILI_ROOM_INIT}?id=${roomId}`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) return 'unknown'
  const json: { code?: number; data?: { live_status?: number } } = await response.json()
  if (json.code !== 0) return 'unknown'
  if (json.data?.live_status === 1) return 'live'
  if (typeof json.data?.live_status === 'number') return 'offline'
  return 'unknown'
}

export interface MedalRestrictionCheck {
  room: MedalRoom
  status: 'restricted' | 'ok' | 'unknown' | 'deactivated'
  signals: RestrictionSignal[]
  checkedAt: number
  note?: string
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return '未知'
}

function roomIdFromLiveLink(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/live\.bilibili\.com\/(?:blanc\/)?(\d+)/)
  if (!match) return null
  return toNumber(match[1])
}

function findMedalEntries(data: unknown): unknown[] {
  if (typeof data !== 'object' || data === null) return []
  const root = data as Record<string, unknown>
  const candidates = [root.list, root.data]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = candidate as Record<string, unknown>
      if (Array.isArray(nested.list)) return nested.list
    }
  }
  return []
}

function medalEntryToRoom(entry: unknown): MedalRoom | null {
  if (typeof entry !== 'object' || entry === null) return null
  const obj = entry as Record<string, unknown>
  const medal =
    typeof obj.medal_info === 'object' && obj.medal_info !== null ? (obj.medal_info as Record<string, unknown>) : {}
  const anchor =
    typeof obj.anchor_info === 'object' && obj.anchor_info !== null ? (obj.anchor_info as Record<string, unknown>) : {}
  const linkedRoomId = roomIdFromLiveLink(obj.link) ?? roomIdFromLiveLink(medal.link) ?? roomIdFromLiveLink(anchor.link)
  const directRoomId =
    toNumber(medal.roomid) ?? toNumber(medal.room_id) ?? toNumber(obj.roomid) ?? toNumber(obj.room_id)
  const roomId = directRoomId ?? linkedRoomId
  const anchorUid = toNumber(medal.target_id) ?? toNumber(anchor.uid) ?? toNumber(obj.target_id)
  if (roomId === null || roomId <= 0) return null
  return {
    roomId,
    medalName: firstString(medal.medal_name, medal.name, obj.medal_name, obj.medal_name, obj.name),
    anchorName: firstString(
      obj.target_name,
      anchor.uname,
      anchor.name,
      medal.anchor_uname,
      obj.anchor_uname,
      obj.uname
    ),
    anchorUid,
    source: directRoomId !== null ? 'medal-room-id' : 'medal-link',
  }
}

function medalEntryToAnchorFallback(entry: unknown): Omit<MedalRoom, 'roomId' | 'source'> | null {
  if (typeof entry !== 'object' || entry === null) return null
  const obj = entry as Record<string, unknown>
  const medal =
    typeof obj.medal_info === 'object' && obj.medal_info !== null ? (obj.medal_info as Record<string, unknown>) : {}
  const anchor =
    typeof obj.anchor_info === 'object' && obj.anchor_info !== null ? (obj.anchor_info as Record<string, unknown>) : {}
  const anchorUid = toNumber(medal.target_id) ?? toNumber(anchor.uid) ?? toNumber(obj.target_id)
  if (anchorUid === null || anchorUid <= 0) return null
  return {
    medalName: firstString(medal.medal_name, medal.name, obj.medal_name, obj.name),
    anchorName: firstString(
      obj.target_name,
      anchor.uname,
      anchor.name,
      medal.anchor_uname,
      obj.anchor_uname,
      obj.uname
    ),
    anchorUid,
  }
}

const ANCHOR_LOOKUP_TIMEOUT_MS = 8000
const ANCHOR_LOOKUP_CONCURRENCY = 6

async function fetchRoomByAnchorUid(anchor: Omit<MedalRoom, 'roomId' | 'source'>): Promise<MedalRoom | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ANCHOR_LOOKUP_TIMEOUT_MS)
  try {
    const resp = await fetch(`${BASE_URL.BILIBILI_ROOM_INFO_BY_UID}?mid=${anchor.anchorUid}`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    })
    if (!resp.ok) return null
    const json: { code?: number; data?: { roomid?: number; link?: string } } = await resp.json()
    if (json.code !== 0) return null
    const roomId = toNumber(json.data?.roomid) ?? roomIdFromLiveLink(json.data?.link)
    if (roomId === null || roomId <= 0) return null
    return { ...anchor, roomId, source: 'anchor-uid' }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface FollowingEntry {
  anchorUid: number
  anchorName: string
}

function followEntryToAnchor(entry: unknown): FollowingEntry | null {
  if (typeof entry !== 'object' || entry === null) return null
  const obj = entry as Record<string, unknown>
  const anchorUid = toNumber(obj.mid) ?? toNumber(obj.uid)
  if (anchorUid === null || anchorUid <= 0) return null
  return {
    anchorUid,
    anchorName: firstString(obj.uname, obj.name, obj.nickname),
  }
}

async function fetchFollowingPage(uid: string, page: number): Promise<FollowingEntry[]> {
  const query = new URLSearchParams({
    vmid: uid,
    pn: String(page),
    ps: '50',
    order: 'desc',
    order_type: 'attention',
  })
  const resp = await fetch(`${BASE_URL.BILIBILI_FOLLOWINGS}?${query.toString()}`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: { code?: number; message?: string; msg?: string; data?: { list?: unknown[] } } = await resp.json()
  if (json.code !== 0) throw new Error(json.message ?? json.msg ?? `code ${json.code}`)
  return (json.data?.list ?? []).map(followEntryToAnchor).filter((entry): entry is FollowingEntry => entry !== null)
}

export async function fetchMedalRooms(): Promise<MedalRoom[]> {
  const uid = getDedeUid()
  if (!uid) throw new Error('未找到登录 UID，请先登录 Bilibili')
  const resp = await fetch(`${BASE_URL.BILIBILI_MEDAL_WALL}?target_id=${encodeURIComponent(uid)}`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: { code?: number; message?: string; msg?: string; data?: unknown } = await resp.json()
  if (json.code !== 0) throw new Error(json.message ?? json.msg ?? `code ${json.code}`)
  const entries = findMedalEntries(json.data)
  const rooms = entries.map(medalEntryToRoom).filter((room): room is MedalRoom => room !== null)
  const unresolvedAnchors = entries
    .filter(entry => medalEntryToRoom(entry) === null)
    .map(medalEntryToAnchorFallback)
    .filter((anchor): anchor is Omit<MedalRoom, 'roomId' | 'source'> => anchor !== null)

  const resolved = await mapWithConcurrency(unresolvedAnchors, ANCHOR_LOOKUP_CONCURRENCY, fetchRoomByAnchorUid)
  for (const room of resolved) {
    if (room) rooms.push(room)
  }

  const deduped = new Map<number, MedalRoom>()
  for (const room of rooms) deduped.set(room.roomId, room)
  return [...deduped.values()]
}

export async function fetchFollowingRooms(maxPages = 4): Promise<FollowingRoom[]> {
  const uid = getDedeUid()
  if (!uid) throw new Error('未找到登录 UID，请先登录 Bilibili')

  const anchors: FollowingEntry[] = []
  for (let page = 1; page <= maxPages; page += 1) {
    const items = await fetchFollowingPage(uid, page)
    anchors.push(...items)
    if (items.length < 50) break
  }

  const rooms = new Map<number, FollowingRoom>()
  const resolved = await mapWithConcurrency(anchors, ANCHOR_LOOKUP_CONCURRENCY, anchor =>
    fetchRoomByAnchorUid({
      medalName: '',
      anchorName: anchor.anchorName,
      anchorUid: anchor.anchorUid,
    }).then(room => (room ? { room, anchor } : null))
  )
  for (const entry of resolved) {
    if (!entry) continue
    const { room, anchor } = entry
    rooms.set(room.roomId, {
      roomId: room.roomId,
      anchorName: room.anchorName,
      anchorUid: room.anchorUid ?? anchor.anchorUid,
    })
  }

  return [...rooms.values()]
}

async function fetchRoomUserInfoSignals(roomId: number): Promise<RestrictionSignal[]> {
  const resp = await fetch(`${BASE_URL.BILIBILI_ROOM_USER_INFO}?room_id=${roomId}&from=0`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
  const json: { code?: number; message?: string; msg?: string; data?: unknown } = await resp.json()
  if (json.code !== 0) {
    return [
      {
        kind: 'unknown',
        message: json.message ?? json.msg ?? `code ${json.code}`,
        duration: describeRestrictionDuration(json.message ?? json.msg, json.data),
        source: 'getInfoByUser',
      },
    ]
  }
  return scanRestrictionSignals(json.data, 'getInfoByUser')
}

async function fetchSilentListSignals(roomId: number): Promise<RestrictionSignal[]> {
  const uid = getDedeUid()
  if (!uid) return []
  const url = `${BASE_URL.BILIBILI_SILENT_USER_LIST}?room_id=${roomId}&ps=50&pn=1`
  const resp = await fetch(url, { method: 'GET', credentials: 'include' })
  if (!resp.ok) return []
  const json: { code?: number; data?: unknown } = await resp.json()
  if (json.code !== 0) return []
  const text = JSON.stringify(json.data)
  if (!text.includes(uid)) return []
  return [
    {
      kind: 'muted',
      message: '当前账号出现在房间禁言列表中',
      duration: describeRestrictionDuration(undefined, json.data),
      source: 'GetSilentUserList',
    },
  ]
}

/**
 * Checks whether the current logged-in user is muted or otherwise restricted
 * in the given room. Used to diagnose silent send failures.
 */
export async function checkSelfRoomRestrictions(roomId: number): Promise<RestrictionSignal[]> {
  const [roomInfoResult, silentListResult] = await Promise.allSettled([
    fetchRoomUserInfoSignals(roomId),
    fetchSilentListSignals(roomId),
  ])
  const signals: RestrictionSignal[] = []
  if (roomInfoResult.status === 'fulfilled') signals.push(...roomInfoResult.value)
  if (silentListResult.status === 'fulfilled') signals.push(...silentListResult.value)
  return signals.filter(s => s.kind !== 'unknown' && s.kind !== 'deactivated')
}

export async function checkMedalRoomRestriction(room: MedalRoom): Promise<MedalRestrictionCheck> {
  const checkedAt = Date.now()
  try {
    const [roomInfoSignals, silentListSignals] = await Promise.all([
      fetchRoomUserInfoSignals(room.roomId),
      fetchSilentListSignals(room.roomId),
    ])
    const allSignals = [...roomInfoSignals, ...silentListSignals]
    const deactivatedSignals = allSignals.filter(signal => signal.kind === 'deactivated')
    const signals = allSignals.filter(signal => signal.kind !== 'unknown' && signal.kind !== 'deactivated')
    return {
      room,
      status: signals.length > 0 ? 'restricted' : deactivatedSignals.length > 0 ? 'deactivated' : 'ok',
      signals,
      checkedAt,
      note:
        signals.length > 0
          ? undefined
          : deactivatedSignals.length > 0
            ? '主播账号已注销，跳过禁言判断'
            : '接口未发现禁言/封禁信号',
    }
  } catch (err) {
    return {
      room,
      status: 'unknown',
      signals: [],
      checkedAt,
      note: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Sends a single danmaku message to the Bilibili live room.
 */
export async function sendDanmaku(message: string, roomId: number, csrfToken: string): Promise<SendDanmakuResult> {
  const emoticon = isEmoticonUnique(message)
  const startedAt = Date.now()

  if (isLockedEmoticon(message)) {
    const reqText = findEmoticon(message)?.unlock_show_text?.trim()
    return {
      success: false,
      message,
      isEmoticon: true,
      startedAt,
      error: reqText ? `表情权限不足，需要 ${reqText}` : '表情权限不足',
    }
  }

  const form = new FormData()
  form.append('bubble', '2')
  form.append('msg', message)
  form.append('color', '16777215')
  form.append('mode', '1')
  form.append('room_type', '0')
  form.append('jumpfrom', '0')
  form.append('reply_mid', '0')
  form.append('reply_attr', '0')
  form.append('replay_dmid', '')
  form.append('statistics', '{"appId":100,"platform":5}')
  form.append('fontsize', '25')
  form.append('rnd', String(Math.floor(Date.now() / 1000)))
  form.append('roomid', String(roomId))
  form.append('csrf', csrfToken)
  form.append('csrf_token', csrfToken)

  if (emoticon) {
    form.append('dm_type', '1')
    // This is expected to be an empty object. Just follows bilibili's API. 😅
    form.append('emoticon_options', '{}')
  }

  try {
    let query = ''
    if (cachedWbiKeys) {
      query = encodeWbi(
        {
          web_location: getSpmPrefix(),
        },
        cachedWbiKeys
      )
    }

    const url = `${BASE_URL.BILIBILI_MSG_SEND}?${query}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SEND_DANMAKU_TIMEOUT_MS)
    let resp: Response
    try {
      resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: form,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!resp.ok) {
      return {
        success: false,
        message,
        isEmoticon: emoticon,
        startedAt,
        error: `HTTP ${resp.status}`,
      }
    }

    // Bilibili returns code 0 on success; non-zero means failure even when
    // HTTP status is 200. Both `message` and `msg` are used for error text
    // depending on the endpoint version.
    const json: { code?: number; message?: string; msg?: string; data?: unknown } = await resp.json()

    if (json.code !== 0) {
      return {
        success: false,
        message,
        isEmoticon: emoticon,
        startedAt,
        error: json.message ?? json.msg ?? `code ${json.code}`,
        errorCode: json.code,
        errorData: json.data,
      }
    }

    emitLocalDanmakuEcho(message, getDedeUid() ?? null, { uname: getLiveLocalEchoName() })

    return {
      success: true,
      message,
      isEmoticon: emoticon,
      startedAt,
    }
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    return {
      success: false,
      message,
      isEmoticon: emoticon,
      startedAt,
      error: aborted
        ? `发送接口 ${Math.round(SEND_DANMAKU_TIMEOUT_MS / 1000)}s 无响应`
        : err instanceof Error
          ? err.message
          : String(err),
    }
  }
}

/**
 * Sets the danmaku display mode for the room (e.g. '1' = scroll).
 * Errors are swallowed (this endpoint is best-effort and non-critical).
 */
export async function setDanmakuMode(roomId: number, csrfToken: string, mode: string): Promise<void> {
  const form = new FormData()
  form.append('room_id', String(roomId))
  form.append('mode', mode)
  form.append('csrf_token', csrfToken)
  form.append('csrf', csrfToken)
  form.append('visit_id', '')
  try {
    await fetch(BASE_URL.BILIBILI_MSG_CONFIG, { method: 'POST', credentials: 'include', body: form })
  } catch {
    // non-critical
  }
}

/**
 * Picks a random color from the room's available palette (or the default
 * fallback) and applies it to outgoing danmaku for the current room.
 * Errors are swallowed (this endpoint is best-effort and non-critical).
 */
export async function setRandomDanmakuColor(roomId: number, csrfToken: string): Promise<void> {
  const colorSet = availableDanmakuColors.value ?? DEFAULT_DANMAKU_COLORS
  const color = colorSet[Math.floor(Math.random() * colorSet.length)] ?? '0xffffff'
  const form = new FormData()
  form.append('room_id', String(roomId))
  form.append('color', color)
  form.append('csrf_token', csrfToken)
  form.append('csrf', csrfToken)
  form.append('visit_id', '')
  try {
    await fetch(BASE_URL.BILIBILI_MSG_CONFIG, { method: 'POST', credentials: 'include', body: form })
  } catch {
    // non-critical
  }
}
