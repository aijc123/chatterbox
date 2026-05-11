import type { CustomChatEvent } from './custom-chat-events'

export const CUSTOM_CHAT_MAX_MESSAGES = 220
const CUSTOM_CHAT_MAX_RENDER_BATCH = 36

export type CustomChatPriority = 'message' | 'identity' | 'lite' | 'card' | 'critical'

export type CustomChatBadgeType = 'medal' | 'guard' | 'admin' | 'rank' | 'ul' | 'honor' | 'price' | 'other'

export function trimRenderQueue(queue: CustomChatEvent[]): void {
  if (queue.length > CUSTOM_CHAT_MAX_MESSAGES) {
    queue.splice(0, queue.length - CUSTOM_CHAT_MAX_MESSAGES)
  }
}

export function takeRenderBatch(queue: CustomChatEvent[]): CustomChatEvent[] {
  return queue.splice(0, CUSTOM_CHAT_MAX_RENDER_BATCH)
}

export function shouldAnimateRenderBatch(batchSize: number): boolean {
  return batchSize <= 12
}

export function customChatBadgeType(raw: string): CustomChatBadgeType {
  const value = raw.trim()
  if (!value) return 'other'
  if (/GUARD|privilege|guard/i.test(value) || /[\u603b\u63d0\u8230][\u7763\u957f]|\u8230\u961f/.test(value))
    return 'guard'
  if (/^\s*(?:UL|LV)\s*\d+/i.test(value)) return 'ul'
  if (/[\u623f\u7ba1]/.test(value) || /admin|moderator/i.test(value)) return 'admin'
  if (/[\u699c]\s*[123]|top\s*[123]|rank\s*[123]/i.test(value)) return 'rank'
  if (/[\u8363\u8000]/.test(value) || /honou?r/i.test(value)) return 'honor'
  if (/SC\s*\d+|^\d+(?:\.\d+)?\s*[\u5143]|[¥$]\s*\d+(?:\.\d+)?/i.test(value)) return 'price'
  if (/[^\s]\s+\d{1,3}$/.test(value)) return 'medal'
  return 'other'
}

export function shouldSuppressCustomChatEvent(event: CustomChatEvent): boolean {
  return event.kind === 'enter'
}

export function customChatPriority(event: CustomChatEvent): CustomChatPriority {
  if (event.kind === 'superchat' || event.kind === 'guard') return 'critical'
  if (event.kind === 'gift' || event.kind === 'redpacket' || event.kind === 'lottery') return 'card'
  if (event.kind === 'enter' || event.kind === 'follow' || event.kind === 'like' || event.kind === 'share')
    return 'lite'
  if (event.kind === 'notice' || event.kind === 'system') return 'lite'
  if (event.badges.some(badge => customChatBadgeType(badge) !== 'other')) return 'identity'
  return 'message'
}

export function visibleRenderMessages(
  messages: CustomChatEvent[],
  matches: (message: CustomChatEvent) => boolean
): CustomChatEvent[] {
  return messages.filter(matches).slice(-CUSTOM_CHAT_MAX_MESSAGES)
}
