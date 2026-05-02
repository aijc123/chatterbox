export type CustomChatKind =
  | 'danmaku'
  | 'gift'
  | 'superchat'
  | 'guard'
  | 'redpacket'
  | 'lottery'
  | 'enter'
  | 'follow'
  | 'like'
  | 'share'
  | 'notice'
  | 'system'

export interface CustomChatField {
  key: string
  label: string
  value: string
  kind?: 'text' | 'money' | 'count' | 'duration' | 'level'
}

export interface CustomChatEvent {
  id: string
  kind: CustomChatKind
  text: string
  sendText?: string
  uname: string
  uid: string | null
  time: string
  isReply: boolean
  source: 'dom' | 'ws' | 'local'
  badges: string[]
  avatarUrl?: string
  amount?: number
  fields?: CustomChatField[]
  rawCmd?: string
}

export type CustomChatWsStatus = 'off' | 'connecting' | 'live' | 'error' | 'closed'

export type CustomChatEventHandler = (event: CustomChatEvent) => void

type RecentDanmakuSource = 'dom' | 'ws' | 'local'

const handlers = new Set<CustomChatEventHandler>()
const wsStatusHandlers = new Set<(status: CustomChatWsStatus) => void>()
let currentWsStatus: CustomChatWsStatus = 'off'
const recentDanmakuHistory: Array<{
  text: string
  uid: string | null
  source: RecentDanmakuSource
  observedAt: number
}> = []

const RECENT_DANMAKU_HISTORY_MS = 15_000
const RECENT_DANMAKU_HISTORY_MAX = 240

export function subscribeCustomChatEvents(handler: CustomChatEventHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

function pruneRecentDanmakuHistory(now = Date.now()): void {
  while (recentDanmakuHistory.length > 0 && now - recentDanmakuHistory[0].observedAt > RECENT_DANMAKU_HISTORY_MS) {
    recentDanmakuHistory.shift()
  }
  while (recentDanmakuHistory.length > RECENT_DANMAKU_HISTORY_MAX) {
    recentDanmakuHistory.shift()
  }
}

function rememberRecentDanmaku(event: CustomChatEvent): void {
  if (event.kind !== 'danmaku') return
  if (event.source !== 'dom' && event.source !== 'ws' && event.source !== 'local') return
  const text = event.text.trim()
  if (!text) return
  const now = Date.now()
  pruneRecentDanmakuHistory(now)
  recentDanmakuHistory.push({
    text,
    uid: event.uid,
    source: event.source,
    observedAt: now,
  })
}

export function findRecentCustomChatDanmakuSource(
  text: string,
  uid: string | null,
  sinceTs: number
): RecentDanmakuSource | null {
  const target = text.trim()
  if (!target) return null
  pruneRecentDanmakuHistory()
  for (let i = recentDanmakuHistory.length - 1; i >= 0; i--) {
    const event = recentDanmakuHistory[i]
    if (event.observedAt < sinceTs) break
    if (event.text !== target) continue
    if (uid && event.uid && event.uid !== uid) continue
    return event.source
  }
  return null
}

export function clearRecentCustomChatDanmakuHistory(): void {
  recentDanmakuHistory.length = 0
}

export function emitLocalDanmakuEcho(text: string, uid: string | null, options?: { uname?: string }): void {
  const trimmed = text.trim()
  if (!trimmed) return
  emitCustomChatEvent({
    id: `local-${uid ?? 'anon'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'danmaku',
    text: trimmed,
    sendText: trimmed,
    uname: options?.uname?.trim() || '我',
    uid,
    time: chatEventTime(),
    isReply: false,
    source: 'local',
    badges: [],
  })
}

function normalizeEventKind(event: CustomChatEvent): CustomChatKind {
  const signal = `${event.kind} ${event.text} ${event.badges.join(' ')} ${event.rawCmd ?? ''}`
  if (/SUPER_CHAT/i.test(signal)) return 'superchat'
  if (/GUARD|舰长|提督|总督|大航海|privilege/i.test(signal)) return 'guard'
  if (/红包|RED|ENVELOP/i.test(signal)) return 'redpacket'
  if (/天选|LOTTERY|ANCHOR_LOT/i.test(signal)) return 'lottery'
  if (/点赞|LIKE/i.test(signal)) return 'like'
  if (/分享|SHARE/i.test(signal)) return 'share'
  if (/关注|FOLLOW/i.test(signal)) return 'follow'
  return event.kind
}

export function normalizeCustomChatEvent(event: CustomChatEvent): CustomChatEvent {
  const kind = normalizeEventKind(event)
  return {
    ...event,
    kind,
    text: event.text.trim(),
    uname: event.uname.trim() || '匿名',
    badges: [...new Set(event.badges.map(item => item.trim()).filter(Boolean))],
    fields: event.fields
      ?.map(field => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        value: field.value.trim(),
      }))
      .filter(field => field.key && field.label && field.value),
  }
}

const prewarmedAvatars = new Set<string>()
const PREWARM_AVATAR_CAP = 2000

export function prewarmAvatar(url: string | undefined): void {
  if (!url) return
  if (prewarmedAvatars.has(url)) return
  if (prewarmedAvatars.size >= PREWARM_AVATAR_CAP) {
    const oldest = prewarmedAvatars.values().next().value
    if (oldest) prewarmedAvatars.delete(oldest)
  }
  prewarmedAvatars.add(url)
  const img = new Image()
  img.referrerPolicy = 'no-referrer'
  img.decoding = 'async'
  img.src = url
  // Eagerly decode so the bitmap (not just bytes) is in cache; ignore any errors.
  img.decode().catch(() => {})
}

export function emitCustomChatEvent(event: CustomChatEvent): void {
  const normalized = normalizeCustomChatEvent(event)
  prewarmAvatar(normalized.avatarUrl)
  rememberRecentDanmaku(normalized)
  for (const handler of handlers) {
    handler(normalized)
  }
}

export function subscribeCustomChatWsStatus(handler: (status: CustomChatWsStatus) => void): () => void {
  wsStatusHandlers.add(handler)
  handler(currentWsStatus)
  return () => wsStatusHandlers.delete(handler)
}

export function emitCustomChatWsStatus(status: CustomChatWsStatus): void {
  currentWsStatus = status
  for (const handler of wsStatusHandlers) {
    handler(status)
  }
}

export function chatEventTime(ts = Date.now()): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
