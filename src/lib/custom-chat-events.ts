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

const handlers = new Set<CustomChatEventHandler>()
const wsStatusHandlers = new Set<(status: CustomChatWsStatus) => void>()
let currentWsStatus: CustomChatWsStatus = 'off'

export function subscribeCustomChatEvents(handler: CustomChatEventHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
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
    fields: event.fields?.map(field => ({
      ...field,
      key: field.key.trim(),
      label: field.label.trim(),
      value: field.value.trim(),
    })).filter(field => field.key && field.label && field.value),
  }
}

export function emitCustomChatEvent(event: CustomChatEvent): void {
  const normalized = normalizeCustomChatEvent(event)
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
