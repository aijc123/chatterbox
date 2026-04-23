import { ensureRoomId, fetchMedalRooms } from './api'
import { subscribeCustomChatEvents } from './custom-chat-events'
import {
  guardRoomCurrentRiskLevel,
  guardRoomLiveDeskHeartbeatSec,
  guardRoomLiveDeskSessionId,
} from './guard-room-live-desk-state'
import { syncGuardRoomLiveDeskHeartbeat } from './guard-room-sync'
import { autoBlendCandidateText, guardRoomEndpoint, guardRoomSyncKey } from './store'

interface SeenEvent {
  ts: number
  uid: string | null
}

const WINDOW_MS = 60 * 1000
let timer: ReturnType<typeof setInterval> | null = null
let unsubscribe: (() => void) | null = null
const seen: SeenEvent[] = []

function trimSeen(now: number): void {
  while (seen.length > 0 && now - seen[0].ts > WINDOW_MS) seen.shift()
}

async function uploadSnapshot(): Promise<void> {
  const sessionId = guardRoomLiveDeskSessionId.value.trim()
  if (!sessionId || !guardRoomEndpoint.value.trim() || !guardRoomSyncKey.value.trim()) return

  const roomId = await ensureRoomId()
  const rooms = await fetchMedalRooms().catch(() => [])
  const current = rooms.find((item) => item.roomId === roomId)
  const now = Date.now()
  trimSeen(now)
  const uniqueUsers = new Set(seen.map((item) => item.uid).filter(Boolean))
  const candidateText = autoBlendCandidateText.value !== '暂无' ? autoBlendCandidateText.value : undefined

  await syncGuardRoomLiveDeskHeartbeat({
    sessionId,
    roomId,
    anchorName: current?.anchorName ?? `直播间 ${roomId}`,
    medalName: current?.medalName ?? '粉丝牌',
    liveStatus: 'live',
    sampledAt: new Date(now).toISOString(),
    messageCount: seen.length,
    activeUsersEstimate: uniqueUsers.size,
    candidateText,
    riskLevel: guardRoomCurrentRiskLevel.value,
  })
}

export function startLiveDeskSync(): void {
  if (timer || unsubscribe) return

  unsubscribe = subscribeCustomChatEvents((event) => {
    if (event.kind !== 'danmaku') return
    const now = Date.now()
    seen.push({ ts: now, uid: event.uid })
    trimSeen(now)
  })

  timer = setInterval(() => {
    void uploadSnapshot()
  }, Math.max(10, guardRoomLiveDeskHeartbeatSec.value) * 1000)
  void uploadSnapshot()
}

export function stopLiveDeskSync(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  unsubscribe?.()
  unsubscribe = null
  seen.splice(0, seen.length)
}
