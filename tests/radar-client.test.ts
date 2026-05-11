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

let responder: Responder = _req => ({ status: 200, body: '{}' })

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
    if (!out) throw new Error('expected non-null cluster-rank result')
    expect(out.clusterId).toBe(42)
    expect(out.similarity).toBe(0.92)
    expect(out.currentRankToday).toBe(7)
    expect(out.heatScore).toBe(1.5)
    expect(out.slopeScore).toBe(0.3)
    expect(out.isTrending).toBe(true)
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
    if (!out) throw new Error('expected non-null cluster-rank result')
    expect(out.similarity).toBe(0)
    expect(out.currentRankToday).toBeNull()
    expect(out.heatScore).toBe(0)
    expect(out.slopeScore).toBe(0)
    expect(out.isTrending).toBe(false)
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
    expect(captured.at(-1)?.url).toContain('limit=1')
    await fetchTodayRadar(1000)
    expect(captured.at(-1)?.url).toContain('limit=100')
    await fetchTodayRadar(15.7)
    expect(captured.at(-1)?.url).toContain('limit=15')
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
  // 5-min-aligned bucket_ts in the past (well within server's 7d horizon).
  const BASE_BUCKET = Math.floor(Date.now() / 1000 / 300) * 300 - 600

  beforeEach(() => {
    radarBackendUrlOverride.value = 'https://radar.test.local'
  })

  test('happy path POSTs to /radar/report with reporter_uid + client_version + buckets', async () => {
    responder = () => ({ status: 200, body: '{"accepted":1,"rejected":0,"dedupedRows":0}' })
    await reportRadarObservation({
      reporter_uid: 12345678,
      buckets: [{ bucket_ts: BASE_BUCKET, room_id: 12345, channel_uid: 67890, msg_count: 7, distinct_uid_count: 4 }],
    })
    expect(captured).toHaveLength(1)
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toMatch(/\/radar\/report$/)
    const body = JSON.parse(captured[0].body ?? '')
    expect(body.reporter_uid).toBe(12345678)
    expect(typeof body.client_version).toBe('string')
    expect(body.client_version.length).toBeGreaterThan(0)
    expect(body.client_version.length).toBeLessThanOrEqual(64)
    expect(body.buckets).toHaveLength(1)
    expect(body.buckets[0]).toEqual({
      bucket_ts: BASE_BUCKET,
      room_id: 12345,
      channel_uid: 67890,
      msg_count: 7,
      distinct_uid_count: 4,
    })
  })

  test('reporter_uid <= 0 short-circuits without HTTP', async () => {
    await reportRadarObservation({
      reporter_uid: 0,
      buckets: [{ bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }],
    })
    await reportRadarObservation({
      reporter_uid: -1,
      buckets: [{ bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }],
    })
    expect(captured).toHaveLength(0)
  })

  test('empty buckets → no HTTP', async () => {
    await reportRadarObservation({ reporter_uid: 1, buckets: [] })
    expect(captured).toHaveLength(0)
  })

  test('client filters bucket_ts not 300-aligned', async () => {
    responder = () => ({ status: 200, body: '{}' })
    await reportRadarObservation({
      reporter_uid: 1,
      // 200 is not a multiple of 300 → filtered out, leaves 0 buckets → no HTTP
      buckets: [{ bucket_ts: 200, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }],
    })
    expect(captured).toHaveLength(0)
  })

  test('client filters bucket where distinct_uid_count > msg_count', async () => {
    responder = () => ({ status: 200, body: '{}' })
    await reportRadarObservation({
      reporter_uid: 1,
      // distinct=5 > msg=2 violates the server cardinality rule → filtered → no HTTP
      buckets: [{ bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 2, distinct_uid_count: 5 }],
    })
    expect(captured).toHaveLength(0)
  })

  test('client caps to 100 buckets (matches server REPORT_MAX_BUCKETS)', async () => {
    responder = () => ({ status: 200, body: '{}' })
    const buckets: Array<{
      bucket_ts: number
      room_id: number
      channel_uid: number
      msg_count: number
      distinct_uid_count: number
    }> = []
    // 105 valid buckets stepping back in 5-min increments — all 300-aligned,
    // well within the server's 7-day past horizon.
    for (let i = 0; i < 105; i++) {
      buckets.push({
        bucket_ts: BASE_BUCKET - i * 300,
        room_id: 1,
        channel_uid: 1,
        msg_count: 1,
        distinct_uid_count: 1,
      })
    }
    await reportRadarObservation({ reporter_uid: 1, buckets })
    expect(captured).toHaveLength(1)
    const body = JSON.parse(captured[0].body ?? '')
    expect(body.buckets.length).toBe(100)
  })

  test('mixed valid + invalid buckets: invalid stripped, valid sent', async () => {
    responder = () => ({ status: 200, body: '{}' })
    await reportRadarObservation({
      reporter_uid: 1,
      buckets: [
        { bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 3, distinct_uid_count: 2 }, // valid
        { bucket_ts: 200, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }, // bad align
        { bucket_ts: BASE_BUCKET + 300, room_id: 0, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }, // bad room
        { bucket_ts: BASE_BUCKET + 600, room_id: 1, channel_uid: 1, msg_count: 0, distinct_uid_count: 0 }, // valid (empty)
      ],
    })
    expect(captured).toHaveLength(1)
    const body = JSON.parse(captured[0].body ?? '')
    expect(body.buckets).toHaveLength(2)
    expect(body.buckets[0].bucket_ts).toBe(BASE_BUCKET)
    expect(body.buckets[1].bucket_ts).toBe(BASE_BUCKET + 600)
  })

  test('endpoint 400 (server validation reject) is swallowed silently', async () => {
    responder = () => ({ status: 400, body: '{"error":"bad_bucket","index":0}' })
    await expect(
      reportRadarObservation({
        reporter_uid: 1,
        buckets: [{ bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }],
      })
    ).resolves.toBeUndefined()
  })

  test('network error swallowed silently', async () => {
    responder = () => ({ throwError: 'ECONNREFUSED' })
    await expect(
      reportRadarObservation({
        reporter_uid: 1,
        buckets: [{ bucket_ts: BASE_BUCKET, room_id: 1, channel_uid: 1, msg_count: 1, distinct_uid_count: 1 }],
      })
    ).resolves.toBeUndefined()
  })
})
