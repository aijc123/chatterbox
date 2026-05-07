// Coverage for the guard-room-sync helpers the existing test files don't reach:
//
//   - classifyRiskEvent              — all 4 branches (muted / account-restricted /
//                                       rate-limited / fallback send_failed)
//   - syncGuardRoomRiskEvent         — gating, payload shape, success, failure dedup
//   - createGuardRoomLiveDeskSession — gating, success {id}, network/non-OK paths
//   - syncGuardRoomLiveDeskHeartbeat — gating, success, failure surfacing, payload trim
//   - buildGuardRoomLiveDeskUrl      — query-param construction
//
// Existing files cover normalizeGuardRoomEndpoint, syncGuardRoomShadowRule,
// syncGuardRoomWatchlist, fetchGuardRoomControlProfile.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

interface FetchCall {
  url: string
  init: RequestInit
}
const fetchCalls: FetchCall[] = []
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> = async (_url, _init) =>
  new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test-version' } },
  GM_setValue: () => {},
}))

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const i = init ?? {}
  fetchCalls.push({ url, init: i })
  return fetchImpl(url, i)
}) as typeof fetch

const {
  buildGuardRoomLiveDeskUrl,
  classifyRiskEvent,
  createGuardRoomLiveDeskSession,
  syncGuardRoomLiveDeskHeartbeat,
  syncGuardRoomRiskEvent,
  _resetGuardRoomSyncWarnings,
} = await import('../src/lib/guard-room-sync')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store')
const { logLines } = await import('../src/lib/log')
const { guardRoomCurrentRiskLevel } = await import('../src/lib/guard-room-live-desk-state')

beforeEach(() => {
  fetchCalls.length = 0
  fetchImpl = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  guardRoomEndpoint.value = 'https://guard.example.com'
  guardRoomSyncKey.value = 'test-key'
  guardRoomCurrentRiskLevel.value = 'pass'
  _resetGuardRoomSyncWarnings()
  logLines.value = []
})

afterEach(() => {
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
})

describe('classifyRiskEvent', () => {
  test('muted error → kind=muted, level=stop, advice mentions 禁言 + duration', () => {
    const out = classifyRiskEvent('您已被禁言 5 分钟')
    expect(out.kind).toBe('muted')
    expect(out.level).toBe('stop')
    expect(out.advice).toContain('禁言')
  })

  test('account-restricted error (账号) → kind=account_restricted, level=stop', () => {
    const out = classifyRiskEvent('账号风控，请稍后再试')
    expect(out.kind).toBe('account_restricted')
    expect(out.level).toBe('stop')
    expect(out.advice).toContain('账号')
  })

  test('account-restricted error (英文 risk) → still classified', () => {
    const out = classifyRiskEvent('account risk control triggered')
    expect(out.kind).toBe('account_restricted')
    expect(out.level).toBe('stop')
  })

  test('rate-limit error → kind=rate_limited, level=observe (NOT stop)', () => {
    const out = classifyRiskEvent('发送频率过快')
    expect(out.kind).toBe('rate_limited')
    expect(out.level).toBe('observe')
    expect(out.advice).toContain('频率')
  })

  test('rate-limit error (英文) → also classified', () => {
    const out = classifyRiskEvent('Rate limited, retry later')
    expect(out.kind).toBe('rate_limited')
    expect(out.level).toBe('observe')
  })

  test('unknown error → fallback kind=send_failed, level=observe', () => {
    const out = classifyRiskEvent('something went wrong')
    expect(out.kind).toBe('send_failed')
    expect(out.level).toBe('observe')
    expect(out.advice).toContain('发送失败')
  })

  test('undefined error → fallback send_failed', () => {
    const out = classifyRiskEvent(undefined) // skipcq: JS-W1042
    expect(out.kind).toBe('send_failed')
    expect(out.level).toBe('observe')
  })

  test('precedence: muted-pattern wins over account-pattern when both present', () => {
    // "禁言" matches isMutedError; "账号" matches isAccountRestrictedError.
    // Implementation checks muted FIRST, so muted wins.
    const out = classifyRiskEvent('账号已被禁言')
    expect(out.kind).toBe('muted')
  })

  test('precedence: account-pattern wins over rate-limit when both present', () => {
    // Implementation checks account BEFORE rate-limit.
    const out = classifyRiskEvent('账号 风控 频率过快')
    expect(out.kind).toBe('account_restricted')
  })
})

describe('syncGuardRoomRiskEvent', () => {
  test('endpoint empty → no fetch, current risk level NOT updated', async () => {
    guardRoomEndpoint.value = ''
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    expect(fetchCalls).toHaveLength(0)
    expect(guardRoomCurrentRiskLevel.value).toBe('pass')
  })

  test('sync key empty → no fetch, current risk level NOT updated', async () => {
    guardRoomSyncKey.value = ''
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    expect(fetchCalls).toHaveLength(0)
    expect(guardRoomCurrentRiskLevel.value).toBe('pass')
  })

  test('success path posts to /api/risk-events with x-sync-key header', async () => {
    await syncGuardRoomRiskEvent({ kind: 'rate_limited', source: 'auto-blend', level: 'observe' })
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].url).toBe('https://guard.example.com/api/risk-events')
    expect(fetchCalls[0].init.method).toBe('POST')
    const headers = fetchCalls[0].init.headers as Record<string, string>
    expect(headers['x-sync-key']).toBe('test-key')
    expect(headers['content-type']).toBe('application/json')
  })

  test('payload includes scriptVersion, occurredAt ISO, eventId, and the input fields', async () => {
    await syncGuardRoomRiskEvent({
      kind: 'muted',
      source: 'manual',
      level: 'stop',
      roomId: 12345,
      errorCode: 10024,
      reason: 'banned text',
      advice: 'wait it out',
    })
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.scriptVersion).toBe('test-version')
    expect(body.kind).toBe('muted')
    expect(body.source).toBe('manual')
    expect(body.level).toBe('stop')
    expect(body.roomId).toBe(12345)
    expect(body.errorCode).toBe(10024)
    expect(body.reason).toBe('banned text')
    expect(body.advice).toBe('wait it out')
    // eventId follows the documented `risk-${ts}-${rand}` shape.
    expect(body.eventId).toMatch(/^risk-\d+-[a-z0-9]+$/)
    // occurredAt is a parseable ISO timestamp.
    expect(new Date(body.occurredAt).getTime()).not.toBeNaN()
  })

  test('reason and advice are truncated to 500 chars on the wire', async () => {
    const longReason = 'x'.repeat(800)
    const longAdvice = 'y'.repeat(800)
    await syncGuardRoomRiskEvent({
      kind: 'send_failed',
      source: 'manual',
      level: 'observe',
      reason: longReason,
      advice: longAdvice,
    })
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.reason).toHaveLength(500)
    expect(body.advice).toHaveLength(500)
  })

  test('updates guardRoomCurrentRiskLevel to the input level (UI driver)', async () => {
    await syncGuardRoomRiskEvent({ kind: 'muted', source: 'manual', level: 'stop' })
    expect(guardRoomCurrentRiskLevel.value).toBe('stop')
  })

  test('5xx response surfaces a one-time warning to the log', async () => {
    fetchImpl = async () => new Response('boom', { status: 502 })
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    const matched = logLines.value.filter(l => l.includes('risk-events') && l.includes('HTTP 502'))
    expect(matched).toHaveLength(1)
  })

  test('repeated 5xx failures only warn once (per-session dedup)', async () => {
    fetchImpl = async () => new Response('boom', { status: 502 })
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    const matched = logLines.value.filter(l => l.includes('risk-events'))
    expect(matched).toHaveLength(1)
  })

  test('network error surfaces with the error message', async () => {
    fetchImpl = async () => {
      throw new Error('ETIMEDOUT')
    }
    await syncGuardRoomRiskEvent({ kind: 'send_failed', source: 'manual', level: 'observe' })
    const matched = logLines.value.filter(l => l.includes('risk-events') && l.includes('ETIMEDOUT'))
    expect(matched).toHaveLength(1)
  })
})

describe('createGuardRoomLiveDeskSession', () => {
  test('endpoint empty → returns null, no fetch', async () => {
    guardRoomEndpoint.value = ''
    const out = await createGuardRoomLiveDeskSession()
    expect(out).toBeNull()
    expect(fetchCalls).toHaveLength(0)
  })

  test('sync key empty → returns null, no fetch', async () => {
    guardRoomSyncKey.value = ''
    const out = await createGuardRoomLiveDeskSession()
    expect(out).toBeNull()
    expect(fetchCalls).toHaveLength(0)
  })

  test('success returns the {id} from the response body', async () => {
    fetchImpl = async () =>
      new Response(JSON.stringify({ id: 'session-abc-123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const out = await createGuardRoomLiveDeskSession()
    expect(out).toEqual({ id: 'session-abc-123' })
    expect(fetchCalls[0].url).toBe('https://guard.example.com/api/live-desk/sessions')
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.name).toBe('老大爷值班台')
  })

  test('custom name flows into request body', async () => {
    fetchImpl = async () =>
      new Response(JSON.stringify({ id: 'session-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    await createGuardRoomLiveDeskSession('我的值班台')
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.name).toBe('我的值班台')
  })

  test('5xx response → returns null + warns once', async () => {
    fetchImpl = async () => new Response('', { status: 500 })
    const out = await createGuardRoomLiveDeskSession()
    expect(out).toBeNull()
    const matched = logLines.value.filter(l => l.includes('live-desk-session') && l.includes('HTTP 500'))
    expect(matched).toHaveLength(1)
  })

  test('network error → returns null + warns', async () => {
    fetchImpl = async () => {
      throw new Error('ECONNREFUSED')
    }
    const out = await createGuardRoomLiveDeskSession()
    expect(out).toBeNull()
    const matched = logLines.value.filter(l => l.includes('live-desk-session') && l.includes('ECONNREFUSED'))
    expect(matched).toHaveLength(1)
  })
})

describe('syncGuardRoomLiveDeskHeartbeat', () => {
  const baseHeartbeat = {
    sessionId: 'sess-1',
    roomId: 12345,
    anchorName: 'TestAnchor',
    medalName: 'TestMedal',
    liveStatus: 'live' as const,
    sampledAt: '2026-05-03T12:00:00.000Z',
    messageCount: 42,
    activeUsersEstimate: 100,
    riskLevel: 'observe' as const,
  }

  test('endpoint empty → no fetch', async () => {
    guardRoomEndpoint.value = ''
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    expect(fetchCalls).toHaveLength(0)
  })

  test('sync key empty → no fetch', async () => {
    guardRoomSyncKey.value = ''
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    expect(fetchCalls).toHaveLength(0)
  })

  test('success posts to /api/live-desk/heartbeats with x-sync-key', async () => {
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    expect(fetchCalls[0].url).toBe('https://guard.example.com/api/live-desk/heartbeats')
    const headers = fetchCalls[0].init.headers as Record<string, string>
    expect(headers['x-sync-key']).toBe('test-key')
  })

  test('payload includes scriptVersion and the input fields', async () => {
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.scriptVersion).toBe('test-version')
    expect(body.sessionId).toBe('sess-1')
    expect(body.roomId).toBe(12345)
    expect(body.messageCount).toBe(42)
    expect(body.riskLevel).toBe('observe')
  })

  test('candidateText is truncated to 120 chars', async () => {
    const longCandidate = 'a'.repeat(200)
    await syncGuardRoomLiveDeskHeartbeat({ ...baseHeartbeat, candidateText: longCandidate })
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.candidateText).toHaveLength(120)
  })

  test('candidateText omitted → body has no candidateText (or undefined)', async () => {
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.candidateText).toBeUndefined()
  })

  test('5xx → warns once with kind=heartbeat', async () => {
    fetchImpl = async () => new Response('', { status: 503 })
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    const matched = logLines.value.filter(l => l.includes('heartbeat') && l.includes('HTTP 503'))
    expect(matched).toHaveLength(1)
  })

  test('network error → warns with the error message', async () => {
    fetchImpl = async () => {
      throw new Error('ENETUNREACH')
    }
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    const matched = logLines.value.filter(l => l.includes('heartbeat') && l.includes('ENETUNREACH'))
    expect(matched).toHaveLength(1)
  })

  test('repeated heartbeat failures only warn once (dedup)', async () => {
    fetchImpl = async () => new Response('', { status: 503 })
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    await syncGuardRoomLiveDeskHeartbeat(baseHeartbeat)
    const matched = logLines.value.filter(l => l.includes('heartbeat') && l.includes('HTTP 503'))
    expect(matched).toHaveLength(1)
  })
})

describe('buildGuardRoomLiveDeskUrl', () => {
  test('returns a live.bilibili.com URL with the four guard_room_* query params', () => {
    const out = buildGuardRoomLiveDeskUrl(12345, 'sess-abc-123')
    const url = new URL(out)
    expect(url.hostname).toBe('live.bilibili.com')
    expect(url.pathname).toBe('/12345')
    expect(url.searchParams.get('guard_room_source')).toBe('guard-room')
    expect(url.searchParams.get('guard_room_mode')).toBe('dry-run')
    expect(url.searchParams.get('guard_room_autostart')).toBe('1')
    expect(url.searchParams.get('guard_room_session')).toBe('sess-abc-123')
  })

  test('always uses https scheme', () => {
    const out = buildGuardRoomLiveDeskUrl(1, 's')
    expect(out.startsWith('https://')).toBe(true)
  })

  test('encodes session id with URL-special chars safely', () => {
    const out = buildGuardRoomLiveDeskUrl(1, 'sess?with=chars&here')
    const url = new URL(out)
    // URLSearchParams does the encoding for us; round-trip must yield the
    // original string.
    expect(url.searchParams.get('guard_room_session')).toBe('sess?with=chars&here')
  })
})
