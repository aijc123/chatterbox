import type { CustomChatEvent, CustomChatKind } from './custom-chat-events'

const CUSTOM_CHAT_SEARCH_KEYS = new Set(['user', 'name', 'from', 'uid', 'text', 'msg', 'kind', 'type', 'source', 'is'])
const CUSTOM_CHAT_SEARCH_KINDS: CustomChatKind[] = [
  'danmaku',
  'gift',
  'superchat',
  'guard',
  'redpacket',
  'lottery',
  'enter',
  'follow',
  'like',
  'share',
  'notice',
  'system',
]

export function kindLabel(kind: CustomChatKind): string {
  if (kind === 'danmaku') return '弹幕'
  if (kind === 'gift') return '礼物'
  if (kind === 'superchat') return 'SC'
  if (kind === 'guard') return '舰队'
  if (kind === 'redpacket') return '红包'
  if (kind === 'lottery') return '天选'
  if (kind === 'enter') return '进场'
  if (kind === 'follow') return '关注'
  if (kind === 'like') return '点赞'
  if (kind === 'share') return '分享'
  if (kind === 'notice') return '通知'
  if (kind === 'system') return '系统'
  return kind
}

export function customChatSearchHint(query: string): string {
  for (const token of splitQuery(query)) {
    const normalized = token.startsWith('-') ? token.slice(1).trim() : token.trim()
    const colon = normalized.indexOf(':')
    if (colon <= 0 || normalized.includes('://')) continue

    const key = normalized.slice(0, colon).toLowerCase()
    const value = normalized
      .slice(colon + 1)
      .trim()
      .toLowerCase()
    if (!isSearchFilterKey(key)) {
      const suggestion = closestSearchSuggestion(key, [...CUSTOM_CHAT_SEARCH_KEYS])
      return suggestion ? `不认识 ${key}: 条件，试试 ${suggestion}:` : '不认识这个搜索条件'
    }
    if ((key === 'kind' || key === 'type') && value && !matchesKnownKind(value)) {
      const suggestion = closestSearchSuggestion(value, CUSTOM_CHAT_SEARCH_KINDS)
      return suggestion ? `没有这种类型，试试 kind:${suggestion}` : '没有这种消息类型'
    }
  }
  return ''
}

export function messageMatchesCustomChatSearch(
  message: CustomChatEvent,
  query: string,
  isKindVisible: (kind: CustomChatKind) => boolean
): boolean {
  if (!isKindVisible(message.kind)) return false
  const tokens = splitQuery(query)
  for (const rawToken of tokens) {
    const negative = rawToken.startsWith('-')
    const token = negative ? rawToken.slice(1) : rawToken
    const matched = tokenMatches(message, token)
    if (negative ? matched : !matched) return false
  }
  return true
}

function splitQuery(query: string): string[] {
  return (
    query
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      ?.map(token => token.replace(/^"|"$/g, '').trim())
      .filter(Boolean) ?? []
  )
}

function isSearchFilterKey(key: string): boolean {
  return /^[a-z][a-z-]*$/i.test(key) && CUSTOM_CHAT_SEARCH_KEYS.has(key)
}

function includesFolded(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function matchesKnownKind(value: string): boolean {
  return CUSTOM_CHAT_SEARCH_KINDS.some(kind => includesFolded(kind, value) || includesFolded(kindLabel(kind), value))
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)
  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      current[j] =
        a[i - 1] === b[j - 1] ? previous[j - 1] : Math.min(previous[j - 1] + 1, previous[j] + 1, current[j - 1] + 1)
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[b.length]
}

function closestSearchSuggestion(value: string, candidates: string[]): string | null {
  const suggestion = candidates
    .map(candidate => ({ value: candidate, distance: levenshteinDistance(value, candidate.toLowerCase()) }))
    .sort((a, b) => a.distance - b.distance)[0]
  return suggestion && suggestion.distance <= 3 ? suggestion.value : null
}

function tokenMatches(message: CustomChatEvent, token: string): boolean {
  const normalized = token.trim()
  if (!normalized) return true
  const colon = normalized.indexOf(':')
  if (colon > 0) {
    const key = normalized.slice(0, colon).toLowerCase()
    const value = normalized.slice(colon + 1)
    if (key === 'user' || key === 'name' || key === 'from') return includesFolded(message.uname, value)
    if (key === 'uid') return includesFolded(message.uid ?? '', value)
    if (key === 'text' || key === 'msg') return includesFolded(message.text, value)
    if (key === 'kind' || key === 'type')
      return includesFolded(message.kind, value) || includesFolded(kindLabel(message.kind), value)
    if (key === 'source') return includesFolded(message.source, value)
    if (key === 'is') return value.toLowerCase() === 'reply' ? message.isReply : false
  }
  return includesFolded(message.text, normalized) || includesFolded(message.uname, normalized)
}
