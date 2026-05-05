// Coverage for `src/lib/radar-client.ts`. Mirror the GM-fetch DI pattern from
// cb-backend-client.test.ts: every HTTP path goes through the project's
// `_setGmXhrForTests` seam (see src/lib/gm-fetch.ts) so we never `mock.module`
// internal modules.
//
// What's covered:
//   - getRadarBackendBaseUrl / normalizeRadarBackendUrl — override accept/reject
//   - queryClusterRank — happy path (matched true / false), HTTP error, network
//     error, malformed JSON, empty/oversize text short-circuit, room_id passthru
//   - fetchTodayRadar — happy path, HTTP error, network error, items shape filter
//   - fetchTopAmplifiers — happy path, area passthru, HTTP error, network error
//   - reportRadarObservation — payload shape, dedup-and-trim, silent-on-failure

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')

const {
  fetchTodayRadar,
  fetchTopAmplifiers,
  getRadarBackendBaseUrl,
  normalizeRadarBackendUrl,
  queryClusterRank,
  reportRadarObservation,
} = await import('../src/lib/radar-client')
const { radarBackendUrlOverride } = await import('../src/lib/store-radar')

interface CapturedReq {
  url: string
  method: string
  body?: string
  headers?: Record<string, string>
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
  headers?: Record<string, string>
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

beforeEach(() => {
  resetGmStore()
  captured.length = 0
  responder = () => ({ status: 200, body: '{}' })
  radarBackendUrlOverride.value = ''
  _setGmXhrForTests(((opts: XhrOpts) => {
    const req: CapturedReq = {
      url: opts.url,
      method: opts.method,
      body: opts.data,
      headers: opts.headers,
    }
    captured.push(req)
    const r = responder(req)
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
  _setGmXhrForTests(null)
})

describe('normalizeRadarBackendUrl', () => {
  test('empty input → empty', () => {
    expect(normalizeRadarBackendUrl('')).toBe('')
    expect(normalizeRadarBackendUrl('   ')).toBe('')
  })

  test('valid https passes', () => {
    expect(normalizeRadarBackendUrl('https://radar.example.com')).toBe('https://radar.example.com')
  })

  test('strips trailing slashes', () => {
    expect(normalizeRadarBackendUrl('https://radar.example.com///')).toBe('https://radar.example.com')
  })

  test('http://localhost passes', () => {
    expect(normalizeRadarBackendUrl('http://localhost:8788')).toBe('http://localhost:8788')
    expect(normalizeRadarBackendUrl('http://127.0.0.1:8788')).toBe('http://127.0.0.1:8788')
    expect(normalizeRadarBackendUrl('http://[::1]:8788')).toBe('http://[::1]:8788')
  })

  test('http with remote host rejected', () => {
    expect(normalizeRadarBackendUrl('http://attacker.example.com')).toBe('')
  })

  test('javascript: rejected', () => {
    expect(normalizeRadarBackendUrl('javascript:alert(1)')).toBe('')
  })

  test('garbage URL rejected', () => {
    expect(normalizeRadarBackendUrl('not a url at all')).toBe('')
  })
})

describe('getRadarBackendBaseUrl', () => {
  test('falls back to BASE_URL.RADAR_BACKEND when override is empty', () => {
    radarBackendUrlOverride.value = ''
    expect(getRadarBackendBaseUrl()).toMatch(/^https:\/\//)
    expect(getRadarBackendBaseUrl()).not.toMatch(/\/$/)
  })

  test('uses override when valid', () => {
    radarBackendUrlOverride.value = 'https://my-radar.example.com'
    expect(getRadarBackendBaseUrl()).toBe('https://my-radar.example.com')
  })

  test('rejects malicious http override (falls back to default https)', () => {
    radarBackendUrlOverride.value = 'http://evil.example.com'
    expect(getRadarBackendBaseUrl()).not.toBe('http://evil.example.com')
    expect(getRadarBackendBaseUrl()).toMatch(/^https:\/\//)
  })
})

describe('queryClusterRank', () => {
  beforeEach(() => {
    radarBackendUrlOverride.value = 'https://radar.test.local'
  })

  test('empty / whitespace text → null without HTTP', async () => {
    const out1 = await queryClusterRank('')
    const out2 = await queryClusterRank('   ')
    expect(out1).toBeNull()
    expect(out2).toBeNull()
    expect(captured).toHaveLength(0)
  })

  test('text >500 chars → null without HTTP', async () => {
    const out = await queryClusterRank('x'.repeat(501))
    expect(out).toBeNull()
    expect(captured).toHaveLength(0)
  })

  test('matched=true returns ClusterRankResult', async () => {
    responder = () => ({
      status: 200,
      body: JSON.stringify({
        matched: true,
        clusterId: 42,
        similarity: 0.92,
        currentRankToday: 7,
        heatScore: 1.5,
        slopeScore: 0.3,
        isTrending: true,
      }),
    })
    const out = await queryClusterRank('草')
    expect(out).not.toBeNull()
    expect(out!.clusterId).toBe(42)
    expect(out!.similarity).toBe(0.92)
    expect(out!.currentRankToday).toBe(7)
    expect(out!.heatScore).toBe(1.5)
    expect(out!.slopeScore).toBe(0.3)
    expect(out!.isTrending).toBe(true)
  })

  test('matched=false → null (caller treats as "no signal")', async () => {
    responder = () => ({ status: 200, body: JSON.stringify({ matched: false, similarity: 0, isTrending: false }) })
    const out = await queryClusterRank('hello')
    expect(out).toBeNull()
  })

  test('passes text and room_id as query params', async () => {
    responder = () => ({ status: 200, body: JSON.stringify({ matched: false }) })
    await queryClusterRank('草', 12345)
    expect(captured).toHaveLength(1)
    const url = new URL(captured[0].url)
    expect(url.pathname).toBe('/radar/cluster-rank')
    expect(url.searchParams.get('text')).toBe('草')
    expect(url.searchParams.get('room_id')).toBe('12345')
  })

  test('omits room_id when not provided', async () => {
    responder = () => ({ status: 200, body: JSON.stringify({ matched: false }) })
    await queryClusterRank('草')
    const url = new URL(captured[0].url)
    expect(url.searchParams.has('room_id')).toBe(false)
  })

  test('omits room_id for non-positive / NaN values', async () => {
    responder = () => ({ status: 200, body: JSON.stringify({ matched: false }) })
    await queryClusterRank('草', 0)
    await queryClusterRank('草', -1)
    await queryClusterRank('草', Number.NaN)
    for (const req of captured) {
      const url = new URL(req.url)
      expect(url.searchParams.has('room_id')).toBe(false)
    }
  })

  test('non-2xx HTTP → null', async () => {
    responder = () => ({ status: 502, body: '' })
    const out = await queryClusterRank('草')
    expect(out).toBeNull()
  })

  test('network error → null', async () => {
    responder = () => ({ throwError: 'ECONNREFUSED' })
    const out = await queryClusterRank('草')
    expect(out).toBeNull()
  })

  test('malformed JSON → null', async () => {
    responder = () => ({ status: 200, body: '<html>oops</html>' })
    const out = await queryClusterRank('草')
    expect(out).toBeNull()
  })

  test('matched=true but clusterId not a number → null (defensive)', async () => {
    responder = () => ({
      status: 200,
      body: JSON.stringify({ matched: true, clusterId: 'forty-two', isTrending: true }),
    })
    const out = await queryClusterRank('草')
    expect(out).toBeNull()
  })

  test('partial fields default to safe values', async () => {
    responder = () => ({
      status: 200,
      body: JSON.stringify({ matched: true, clusterId: 1 }),
    })
    const out = await queryClusterRank('草')
    expect(out).not.toBeNull()
    expect(out!.similarity).toBe(0)
    expect(out!.currentRankToday).toBeNull()
    expect(out!.heatScore).toBe(0)
    expect(out!.slopeScore).toBe(0)
    expect(out!.isTrending).toBe(false)
  })
})

describe('fetchTodayRadar', () => {
  beforeEach(() => {
    radarBackendUrlOverride.value = 'https://radar.test.local'
  })

  function clusterListBody(items: unknown[]) {
    return JSON.stringify({ items, limit: items.length, offset: 0, crossRoomOnly: true })
  }

  test('happy path returns RadarClusterSummary[]', async () => {
    responder = () => ({
      status: 200,
      body: clusterListBody([
        {
          id: 1,
          representativeText: '哈哈哈',
          memberCount: 50,
          distinctRoomCount: 10,
          distinctUidCount: 30,
          heatScore: 2,
          slopeScore: 0.5,
          firstSeenTs: 1700000000,
          lastSeenTs: 1700001000,
          status: 'active',
        },
      ]),
    })
    const out = await fetchTodayRadar()
    expect(out).toHaveLength(1)
    expect(out[0].representativeText).toBe('哈哈哈')
    expect(captured[0].method).toBe('GET')
    expect(captured[0].url).toMatch(/\/radar\/clusters\/today\?limit=20$/)
  })

  test('limit param is clamped to [1, 100] and rounded', async () => {
    responder = () => ({ status: 200, body: clusterListBody([]) })
    await fetchTodayRadar(0)
    expect(captured.at(-1)!.url).toContain('limit=1')
    await fetchTodayRadar(1000)
    expect(captured.at(-1)!.url).toContain('limit=100')
    await fetchTodayRadar(15.7)
    expect(captured.at(-1)!.url).toContain('limit=15')
  })

  test('non-2xx → []', async () => {
    responder = () => ({ status: 503, body: '' })
    const out = await fetchTodayRadar()
    expect(out).toEqual([])
  })

  test('network error → []', async () => {
    responder = () => ({ throwError: 'ENETUNREACH' })
    const out = await fetchTodayRadar()
    expect(out).toEqual([])
  })

  test('malformed JSON → []', async () => {
    responder = () => ({ status: 200, body: 'not json' })
    const out = await fetchTodayRadar()
    expect(out).toEqual([])
  })

  test('items missing → []', async () => {
    responder = () => ({ status: 200, body: JSON.stringify({}) })
    const out = await fetchTodayRadar()
    expect(out).toEqual([])
  })

  test('items with bad shape are filtered', async () => {
    responder = () => ({
      status: 200,
      body: clusterListBody([
        { id: 1, representativeText: 'good', memberCount: 5 },
        { id: 'two', representativeText: 'bad-id', memberCount: 5 },
        null,
        { id: 3, memberCount: 5 }, // missing text
      ]),
    })
    const out = await fetchTodayRadar()
    expect(out).toHaveLength(1)
    expect(out[0].representativeText).toBe('good')
  })
})

describe('fetchTopAmplifiers', () => {
  beforeEach(() => {
    radarBackendUrlOverride.value = 'https://radar.test.local'
  })

  function ampsBody(items: unknown[]) {
    return JSON.stringify({ items, limit: items.length, area: null })
  }

  test('happy path returns AmplifierSummary[]', async () => {
    responder = () => ({
      status: 200,
      body: ampsBody([
        {
          channelUid: 99,
          channelName: 'Alice',
          avgLagSeconds: 12.3,
          amplificationCount24h: 8,
          trendScore: 1.4,
        },
      ]),
    })
    const out = await fetchTopAmplifiers()
    expect(out).toHaveLength(1)
    expect(out[0].channelUid).toBe(99)
    expect(captured[0].url).toMatch(/\/radar\/amplifiers\/today$/)
  })

  test('passes area as query param', async () => {
    responder = () => ({ status: 200, body: ampsBody([]) })
    await fetchTopAmplifiers('虚拟主播')
    const url = new URL(captured[0].url)
    expect(url.searchParams.get('area')).toBe('虚拟主播')
  })

  test('empty / whitespace area is omitted', async () => {
    responder = () => ({ status: 200, body: ampsBody([]) })
    await fetchTopAmplifiers('')
    await fetchTopAmplifiers('   ')
    for (const req of captured) {
      expect(req.url).not.toContain('area=')
    }
  })

  test('non-2xx → []', async () => {
    responder = () => ({ status: 500, body: '' })
    const out = await fetchTopAmplifiers()
    expect(out).toEqual([])
  })

  test('network error → []', async () => {
    responder = () => ({ throwError: 'ECONNREFUSED' })
    const out = await fetchTopAmplifiers()
    expect(out).toEqual([])
  })

  test('items with bad shape filtered', async () => {
    responder = () => ({
      status: 200,
      body: ampsBody([
        { channelUid: 1, amplificationCount24h: 5 },
        { channelUid: 'bad', amplificationCount24h: 5 },
        { amplificationCount24h: 5 },
      ]),
    })
    const out = await fetchTopAmplifiers()
    expect(out).toHaveLength(1)
    expect(out[0].channelUid).toBe(1)
  })
})

describe('reportRadarObservation', () => {
  beforeEach(() => {
    radarBackendUrlOverride.value = 'https://radar.test.local'
  })

  test('happy path POSTs to /radar/report', async () => {
    responder = () => ({ status: 200, body: '{}' })
    await reportRadarObservation({
      roomId: 12345,
      channelUid: 67890,
      sampledTexts: ['草', 'awsl', 'xswl'],
      windowStartTs: 1000,
      windowEndTs: 2000,
    })
    expect(captured).toHaveLength(1)
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toMatch(/\/radar\/report$/)
    const body = JSON.parse(captured[0].body!)
    expect(body.roomId).toBe(12345)
    expect(body.channelUid).toBe(67890)
    expect(body.sampledTexts).toEqual(['草', 'awsl', 'xswl'])
    expect(body.windowStartTs).toBe(1000)
    expect(body.windowEndTs).toBe(2000)
  })

  test('roomId <= 0 short-circuits without HTTP', async () => {
    await reportRadarObservation({
      roomId: 0,
      channelUid: 1,
      sampledTexts: ['x'],
      windowStartTs: 0,
      windowEndTs: 1,
    })
    await reportRadarObservation({
      roomId: -1,
      channelUid: 1,
      sampledTexts: ['x'],
      windowStartTs: 0,
      windowEndTs: 1,
    })
    expect(captured).toHaveLength(0)
  })

  test('empty sampledTexts → no HTTP', async () => {
    await reportRadarObservation({
      roomId: 1,
      channelUid: 1,
      sampledTexts: [],
      windowStartTs: 0,
      windowEndTs: 1,
    })
    expect(captured).toHaveLength(0)
  })

  test('strips invalid + oversize texts and caps to 30', async () => {
    responder = () => ({ status: 200, body: '{}' })
    const tooLong = 'x'.repeat(201)
    const samples: unknown[] = []
    for (let i = 0; i < 50; i++) samples.push(`text-${i}`)
    samples.push('') // empty — drop
    samples.push('   ') // whitespace — drop
    samples.push(tooLong) // too long — drop
    samples.push(null) // not string — drop
    await reportRadarObservation({
      roomId: 1,
      channelUid: 1,
      sampledTexts: samples as string[],
      windowStartTs: 0,
      windowEndTs: 1,
    })
    expect(captured).toHaveLength(1)
    const body = JSON.parse(captured[0].body!)
    expect(body.sampledTexts.length).toBe(30)
    expect(body.sampledTexts[0]).toBe('text-0')
  })

  test('all-invalid sampledTexts → no HTTP', async () => {
    await reportRadarObservation({
      roomId: 1,
      channelUid: 1,
      sampledTexts: ['', '   ', 'x'.repeat(201)],
      windowStartTs: 0,
      windowEndTs: 1,
    })
    expect(captured).toHaveLength(0)
  })

  test('endpoint 404 (Week 9-10 not yet shipped) is swallowed silently', async () => {
    responder = () => ({ status: 404, body: 'Not Found' })
    await expect(
      reportRadarObservation({
        roomId: 1,
        channelUid: 1,
        sampledTexts: ['x'],
        windowStartTs: 0,
        windowEndTs: 1,
      })
    ).resolves.toBeUndefined()
  })

  test('network error swallowed silently', async () => {
    responder = () => ({ throwError: 'ECONNREFUSED' })
    await expect(
      reportRadarObservation({
        roomId: 1,
        channelUid: 1,
        sampledTexts: ['x'],
        windowStartTs: 0,
        windowEndTs: 1,
      })
    ).resolves.toBeUndefined()
  })
})
