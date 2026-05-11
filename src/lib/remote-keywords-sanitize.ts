// Sanitizer for the remote-keyword JSON fetched from `workers.vrp.moe`. The
// remote endpoint is trusted only as far as the network — a compromised CDN
// could otherwise inject arbitrary maps that flow into `applyReplacements`
// (and thus into outgoing danmaku) or balloon GM storage.
//
// Hard caps and per-entry typeof checks keep the output well-formed.

export interface RemoteKeywords {
  global?: { keywords?: Record<string, string> }
  rooms?: Array<{ room: string; keywords?: Record<string, string> }>
}

export const REMOTE_KEYWORDS_MAX_GLOBAL = 1000
export const REMOTE_KEYWORDS_MAX_PER_ROOM = 500
export const REMOTE_KEYWORDS_MAX_ROOMS = 200
const REMOTE_KEYWORDS_MAX_KEY_LEN = 200
export const REMOTE_KEYWORDS_MAX_VALUE_LEN = 200

export function sanitizeKeywordsRecord(input: unknown, maxEntries: number): Record<string, string> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {}
  const out: Record<string, string> = {}
  let count = 0
  for (const [from, to] of Object.entries(input as Record<string, unknown>)) {
    if (count >= maxEntries) break
    if (typeof from !== 'string' || typeof to !== 'string') continue
    // Reject empty AND whitespace-only keys. A `" "` key would otherwise
    // pass `length > 0` and silently match every space in outgoing danmaku
    // when fed into `applyReplacements` (a single bad CDN row could rewrite
    // every message in the room).
    if (from.trim().length === 0 || from.length > REMOTE_KEYWORDS_MAX_KEY_LEN) continue
    if (to.length > REMOTE_KEYWORDS_MAX_VALUE_LEN) continue
    out[from] = to
    count++
  }
  return out
}

export function sanitizeRemoteKeywords(input: unknown): RemoteKeywords {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {}
  const obj = input as Record<string, unknown>
  const result: RemoteKeywords = {}
  const globalSection = obj.global
  if (typeof globalSection === 'object' && globalSection !== null && !Array.isArray(globalSection)) {
    result.global = {
      keywords: sanitizeKeywordsRecord((globalSection as Record<string, unknown>).keywords, REMOTE_KEYWORDS_MAX_GLOBAL),
    }
  }
  if (Array.isArray(obj.rooms)) {
    const rooms: Array<{ room: string; keywords?: Record<string, string> }> = []
    for (const entry of obj.rooms) {
      if (rooms.length >= REMOTE_KEYWORDS_MAX_ROOMS) break
      if (typeof entry !== 'object' || entry === null) continue
      const roomEntry = entry as Record<string, unknown>
      const roomId = typeof roomEntry.room === 'string' ? roomEntry.room : String(roomEntry.room ?? '')
      if (!roomId) continue
      rooms.push({
        room: roomId,
        keywords: sanitizeKeywordsRecord(roomEntry.keywords, REMOTE_KEYWORDS_MAX_PER_ROOM),
      })
    }
    result.rooms = rooms
  }
  return result
}
