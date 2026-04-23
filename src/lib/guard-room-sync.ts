import { VERSION } from './const'
import { guardRoomCurrentRiskLevel } from './guard-room-live-desk-state'
import { describeRestrictionDuration, isAccountRestrictedError, isMutedError, isRateLimitError } from './moderation'
import { guardRoomEndpoint, guardRoomSyncKey } from './store'

type RiskEventKind =
  | 'send_failed'
  | 'rate_limited'
  | 'muted'
  | 'account_restricted'
  | 'login_missing'
  | 'queue_cancelled'
  | 'unknown'

type RiskEventSource = 'manual' | 'auto-send' | 'auto-blend' | 'stt' | 'ai-evasion' | 'system'
type RiskEventLevel = 'stop' | 'observe' | 'pass'

interface RiskEventInput {
  kind: RiskEventKind
  source: RiskEventSource
  level: RiskEventLevel
  roomId?: number | null
  errorCode?: number | null
  reason?: string
  advice?: string
}

export interface LiveDeskHeartbeatInput {
  sessionId: string
  roomId: number
  anchorName: string
  medalName: string
  liveStatus: 'live' | 'offline' | 'unknown'
  sampledAt: string
  messageCount: number
  activeUsersEstimate: number
  candidateText?: string
  riskLevel: RiskEventLevel
}

function normalizeGuardRoomEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

export function classifyRiskEvent(
  error?: string,
  errorData?: unknown
): Pick<RiskEventInput, 'kind' | 'level' | 'advice'> {
  if (isMutedError(error)) {
    return {
      kind: 'muted',
      level: 'stop',
      advice: `检测到房间禁言，先停车。禁言时长：${describeRestrictionDuration(error, errorData)}。`,
    }
  }
  if (isAccountRestrictedError(error)) {
    return {
      kind: 'account_restricted',
      level: 'stop',
      advice: `检测到账号级风控，先停发。限制时长：${describeRestrictionDuration(error, errorData)}。`,
    }
  }
  if (isRateLimitError(error)) {
    return { kind: 'rate_limited', level: 'observe', advice: '发送频率过快，先降频或暂停自动跟车。' }
  }
  return { kind: 'send_failed', level: 'observe', advice: '发送失败，建议看一眼房间状态和替换词。' }
}

export async function syncGuardRoomRiskEvent(input: RiskEventInput): Promise<void> {
  const endpoint = normalizeGuardRoomEndpoint(guardRoomEndpoint.value)
  const syncKey = guardRoomSyncKey.value.trim()
  if (!endpoint || !syncKey) return
  guardRoomCurrentRiskLevel.value = input.level

  const payload = {
    eventId: `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scriptVersion: VERSION,
    occurredAt: new Date().toISOString(),
    ...input,
    reason: input.reason?.slice(0, 500),
    advice: input.advice?.slice(0, 500),
  }

  await fetch(`${endpoint}/api/risk-events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sync-key': syncKey,
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined)
}

export async function createGuardRoomLiveDeskSession(name = '老大爷值班台'): Promise<{ id: string } | null> {
  const endpoint = normalizeGuardRoomEndpoint(guardRoomEndpoint.value)
  const syncKey = guardRoomSyncKey.value.trim()
  if (!endpoint || !syncKey) return null

  const response = await fetch(`${endpoint}/api/live-desk/sessions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sync-key': syncKey,
    },
    body: JSON.stringify({ name }),
  }).catch(() => null)

  if (!response?.ok) return null
  return (await response.json()) as { id: string }
}

export async function syncGuardRoomLiveDeskHeartbeat(input: LiveDeskHeartbeatInput): Promise<void> {
  const endpoint = normalizeGuardRoomEndpoint(guardRoomEndpoint.value)
  const syncKey = guardRoomSyncKey.value.trim()
  if (!endpoint || !syncKey) return

  await fetch(`${endpoint}/api/live-desk/heartbeats`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sync-key': syncKey,
    },
    body: JSON.stringify({
      ...input,
      scriptVersion: VERSION,
      candidateText: input.candidateText?.slice(0, 120),
    }),
  }).catch(() => undefined)
}

export function buildGuardRoomLiveDeskUrl(roomId: number, sessionId: string): string {
  const url = new URL(`https://live.bilibili.com/${roomId}`)
  url.searchParams.set('guard_room_source', 'guard-room')
  url.searchParams.set('guard_room_mode', 'dry-run')
  url.searchParams.set('guard_room_autostart', '1')
  url.searchParams.set('guard_room_session', sessionId)
  return url.toString()
}
