import { GM_getValue, GM_setValue } from '$'
import { appendLog } from './log'
import { memeContentKey } from './meme-content-key'
import { enableMemeContribution, memeContributorCandidatesByRoom, memeContributorSeenTextsByRoom } from './store'
import { currentMemesList } from './store-meme'

const MAX_PER_HOUR = 5
const MAX_CANDIDATES = 15
const MAX_SEEN = 200
const MIN_RECURRENCE_GAP_MS = 10 * 60 * 1000 // 10 minutes between first and last trigger
const SESSION_MAP_KEY = 'memeSessionMapByRoom'
// Discard entries whose most recent timestamp is older than 2 hours on load.
const SESSION_MAP_MAX_AGE_MS = 2 * 60 * 60 * 1000

// roomId(String) → text → list of timestamps when 自动跟车 fired for this text in that room
// Persisted to GM storage so the 10-minute recurrence check survives page reloads.
type RoomTextTimes = Map<string, number[]>

function loadRoomSessionMaps(): Map<string, RoomTextTimes> {
  const raw = GM_getValue<Record<string, Record<string, number[]>>>(SESSION_MAP_KEY, {})
  const now = Date.now()
  const out = new Map<string, RoomTextTimes>()
  for (const [roomKey, byText] of Object.entries(raw)) {
    const inner = new Map<string, number[]>()
    for (const [text, timestamps] of Object.entries(byText)) {
      const last = timestamps.at(-1)
      if (last !== undefined && now - last < SESSION_MAP_MAX_AGE_MS) {
        inner.set(text, timestamps)
      }
    }
    if (inner.size > 0) out.set(roomKey, inner)
  }
  return out
}

function saveRoomSessionMaps(): void {
  const raw: Record<string, Record<string, number[]>> = {}
  for (const [roomKey, inner] of roomSessionMaps) {
    if (inner.size === 0) continue
    const obj: Record<string, number[]> = {}
    for (const [text, timestamps] of inner) obj[text] = timestamps
    raw[roomKey] = obj
  }
  GM_setValue(SESSION_MAP_KEY, raw)
}

function getOrCreateSessionMap(roomKey: string): RoomTextTimes {
  let m = roomSessionMaps.get(roomKey)
  if (!m) {
    m = new Map()
    roomSessionMaps.set(roomKey, m)
  }
  return m
}

const roomSessionMaps = loadRoomSessionMaps()

// Per-room hourly nomination rate-limiting timestamps.
const nominationTimestampsByRoom = new Map<string, number[]>()

function passesQualityFilter(text: string): boolean {
  const len = text.length
  if (len < 4 || len > 30) return false
  if (/^\d+$/.test(text)) return false
  if ([...text].every(c => c === text[0])) return false
  if (/^[\p{P}\p{S}\s]+$/u.test(text)) return false
  return true
}

/**
 * Called by auto-blend on each successful send.
 * Records the trigger and nominates the text if it has recurred
 * across a long enough time span (genuine community meme signal).
 *
 * All counters and lists are isolated per `roomId` so memes mined in one
 * live room do not leak into another's candidate pool.
 */
export function recordMemeCandidate(text: string, roomId: number): void {
  if (!enableMemeContribution.value) return
  if (!passesQualityFilter(text)) return

  const roomKey = String(roomId)
  const sessionMap = getOrCreateSessionMap(roomKey)

  const now = Date.now()
  const times = sessionMap.get(text) ?? []
  times.push(now)
  sessionMap.set(text, times)
  saveRoomSessionMaps()

  // Need at least 2 separate triggers with a 10-minute gap between first and last.
  // A phrase that keeps coming back across a stream is more meme-like than a one-wave spike.
  if (times.length < 2) return
  if (now - times[0] < MIN_RECURRENCE_GAP_MS) return

  const seenForRoom = memeContributorSeenTextsByRoom.value[roomKey] ?? []
  const candForRoom = memeContributorCandidatesByRoom.value[roomKey] ?? []
  if (seenForRoom.includes(text)) return
  if (candForRoom.includes(text)) return

  // 已在库自动跳过 —— `currentMemesList` 是 `MemesList` 组件每次刷新后写入的当前
  // 房间合并后梗集(cb 自建 + LAPLACE + SBHZM,任一启用源都包含在内)。如果待
  // 贡献文本经规整后跟其中任一条等同,直接放进 seen 队列,不打扰用户。
  //
  // 早期 currentMemesList 可能还没载完(空数组)→ 此时所有候选放过,等下次 30s
  // polling 后再过滤新检测的;已经在 candidates 里的不会动(老候选要靠用户手动忽略
  // 或贡献来清,这是有意为之 —— 避免拉取异常时大批候选误删)。
  const candidateKey = memeContentKey(text)
  if (candidateKey) {
    const libraryKeys = new Set(currentMemesList.value.map(m => memeContentKey(m.content)))
    if (libraryKeys.has(candidateKey)) {
      const nextSeen = [...seenForRoom, text]
      memeContributorSeenTextsByRoom.value = {
        ...memeContributorSeenTextsByRoom.value,
        [roomKey]: nextSeen.length > MAX_SEEN ? nextSeen.slice(-MAX_SEEN) : nextSeen,
      }
      // 只在调试模式下记一行,避免 log 被刷屏。
      // appendLog(`[贡献者] "${text}" 已在烂梗库,跳过`)
      return
    }
  }

  // Hourly rate limit, scoped per room
  const stamps = nominationTimestampsByRoom.get(roomKey) ?? []
  const oneHourAgo = now - 3_600_000
  const recentCount = stamps.filter(t => t >= oneHourAgo).length
  if (recentCount >= MAX_PER_HOUR) return

  const nextCand = [...candForRoom, text]
  memeContributorCandidatesByRoom.value = {
    ...memeContributorCandidatesByRoom.value,
    [roomKey]: nextCand.length > MAX_CANDIDATES ? nextCand.slice(-MAX_CANDIDATES) : nextCand,
  }

  const nextSeen = [...seenForRoom, text]
  memeContributorSeenTextsByRoom.value = {
    ...memeContributorSeenTextsByRoom.value,
    [roomKey]: nextSeen.length > MAX_SEEN ? nextSeen.slice(-MAX_SEEN) : nextSeen,
  }

  stamps.push(now)
  nominationTimestampsByRoom.set(roomKey, stamps)

  appendLog(`[贡献者] 检测到高质量烂梗 "${text}"，已加入待贡献池`)
}

export function ignoreMemeCandidate(text: string, roomId: number): void {
  const roomKey = String(roomId)

  const candForRoom = memeContributorCandidatesByRoom.value[roomKey] ?? []
  memeContributorCandidatesByRoom.value = {
    ...memeContributorCandidatesByRoom.value,
    [roomKey]: candForRoom.filter(c => c !== text),
  }

  const seenForRoom = memeContributorSeenTextsByRoom.value[roomKey] ?? []
  if (!seenForRoom.includes(text)) {
    const nextSeen = [...seenForRoom, text]
    memeContributorSeenTextsByRoom.value = {
      ...memeContributorSeenTextsByRoom.value,
      [roomKey]: nextSeen.length > MAX_SEEN ? nextSeen.slice(-MAX_SEEN) : nextSeen,
    }
  }
}

export function clearMemeSession(roomId: number): void {
  const roomKey = String(roomId)
  roomSessionMaps.delete(roomKey)
  saveRoomSessionMaps()
  nominationTimestampsByRoom.delete(roomKey)
}
