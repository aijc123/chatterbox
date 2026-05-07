// Coverage for `src/lib/auto-blend-radar.ts` — the boost-only radar consult
// helper that auto-blend's triggerSend awaits before engaging cooldown.
//
// The product contract under test: radar may ADD a confidence-log line when
// it sees the same meme heating up across other rooms, but it must NEVER
// block, skip, or alter the local send. These tests prove the helper
// resolves to void on every queryClusterRank outcome (including the
// previously-blocking matched-but-not-trending branch) and only logs on the
// positive trending case.
//
// Pattern follows tests/radar-client.test.ts: every HTTP path goes through
// the project's `_setGmXhrForTests` seam (see src/lib/gm-fetch.ts). We do
// not `mock.module` internal modules.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
const { subscribeAutoBlendEvents } = await import('../src/lib/auto-blend-events')
const { consultRadarBoost } = await import('../src/lib/auto-blend-radar')
const { radarBackendUrlOverride, radarConsultEnabled } = await import('../src/lib/store-radar')

interface CapturedReq {
  url: string
  method: string
  body?: string
}
const captured: CapturedReq[] = []

type Responder = (req: CapturedReq) => {
  status?: number
  statusText?: string
  body?: string
  delayMs?: number
  throwError?: string
}

let responder: Responder = () => ({ status: 200, body: '{}' })

interface XhrOpts {
  method: string
  url: string
  data?: string
  onload?: (r: {
    status: number
    statusText: string
    responseText: string
    responseHeaders: string
    finalUrl: string
  }) => void
  onerror?: (e: { error?: string }) => void
  ontimeout?: () => void
  onabort?: () => void
}

const logs: { message: string; level?: string }[] = []
let unsubscribe: (() => void) | null = null

beforeEach(() => {
  resetGmStore()
  captured.length = 0
  logs.length = 0
  responder = () => ({ status: 200, body: '{}' })
  radarBackendUrlOverride.value = ''
  radarConsultEnabled.value = false

  unsubscribe = subscribeAutoBlendEvents(event => {
    if (event.kind === 'log') logs.push({ message: event.message, level: event.level })
  })

  _setGmXhrForTests(((opts: XhrOpts) => {
    captured.push({ url: opts.url, method: opts.method, body: opts.data })
    const r = responder({ url: opts.url, method: opts.method, body: opts.data })
    setTimeout(() => {
      if (r.throwError) {
        opts.onerror?.({ error: r.throwError })
        return
      }
      const status = r.status ?? 200
      opts.onload?.({
        status,
        statusText: r.statusText ?? (status === 200 ? 'OK' : ''),
        responseText: r.body ?? '',
        responseHeaders: '',
        finalUrl: opts.url,
      })
    }, r.delayMs ?? 0)
    return undefined as unknown as Parameters<typeof _setGmXhrForTests>[0]
  }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
})

afterEach(() => {
  unsubscribe?.()
  unsubscribe = null
  _setGmXhrForTests(null)
  radarConsultEnabled.value = false
})

describe('consultRadarBoost (boost-only auto-follow signal)', () => {
  test('toggle off: no network call, no log, resolves to undefined', async () => {
    radarConsultEnabled.value = false
    responder = () => ({
      status: 200,
      body: JSON.stringify({ matched: true, isTrending: true, clusterId: 1 }),
    })

    const result = await consultRadarBoost('上车')

    expect(result).toBeUndefined()
    expect(captured).toEqual([])
    expect(logs).toEqual([])
  })

  test('isTrending=true → emits a positive confirmation log and resolves', async () => {
    radarConsultEnabled.value = true
    responder = () => ({
      status: 200,
      body: JSON.stringify({
        matched: true,
        clusterId: 7,
        similarity: 0.99,
        currentRankToday: 3,
        heatScore: 12,
        slopeScore: 4,
        isTrending: true,
      }),
    })

    const result = await consultRadarBoost('冲')

    expect(result).toBeUndefined()
    expect(captured.length).toBe(1)
    expect(captured[0].url).toContain('/radar/cluster-rank')
    // Exactly one log emitted, with positive-confirmation wording (no veto/skip).
    expect(logs.length).toBe(1)
    expect(logs[0].message).toContain('radar 确认')
    expect(logs[0].message).not.toContain('否决')
    expect(logs[0].message).not.toContain('跳过')
    // Boost is informational, not a warning.
    expect(logs[0].level).toBeUndefined()
  })

  test('matched but isTrending=false → no log, no veto, resolves cleanly (regression: 2.11.0 used to block here)', async () => {
    radarConsultEnabled.value = true
    responder = () => ({
      status: 200,
      body: JSON.stringify({
        matched: true,
        clusterId: 9,
        similarity: 0.91,
        currentRankToday: 42,
        heatScore: 1,
        slopeScore: 0,
        isTrending: false,
      }),
    })

    const result = await consultRadarBoost('谢谢老板')

    expect(result).toBeUndefined()
    // The radar request fires, but there must be no veto log and no log at all
    // attributable to the negative branch — that was the blocking pre-rework
    // behavior that this rework removes.
    expect(captured.length).toBe(1)
    expect(logs).toEqual([])
  })

  test('null match → no log, resolves cleanly', async () => {
    radarConsultEnabled.value = true
    responder = () => ({
      status: 200,
      body: JSON.stringify({ matched: false }),
    })

    const result = await consultRadarBoost('随便发一句')

    expect(result).toBeUndefined()
    expect(logs).toEqual([])
  })

  test('HTTP error → no log, resolves cleanly (legacy fail-open)', async () => {
    radarConsultEnabled.value = true
    responder = () => ({ status: 500, statusText: 'Internal Server Error', body: 'oops' })

    const result = await consultRadarBoost('boom')

    expect(result).toBeUndefined()
    expect(logs).toEqual([])
  })

  test('network error → no log, resolves cleanly (legacy fail-open)', async () => {
    radarConsultEnabled.value = true
    responder = () => ({ throwError: 'NetworkError' })

    const result = await consultRadarBoost('offline')

    expect(result).toBeUndefined()
    expect(logs).toEqual([])
  })
})
