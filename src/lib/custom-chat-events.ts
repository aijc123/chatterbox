export type CustomChatKind = 'danmaku' | 'gift' | 'superchat' | 'enter' | 'notice' | 'system'

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

export function emitCustomChatEvent(event: CustomChatEvent): void {
  for (const handler of handlers) {
    handler(event)
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
