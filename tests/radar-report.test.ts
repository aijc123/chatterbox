// Coverage for `src/lib/radar-report.ts` — the opt-in /radar/report
// aggregator. Two layers of DI:
//   1. `_setSubscribersForTests` swaps in test fakes for subscribeDanmaku /
//      subscribeCustomChatEvents so we don't have to spin up real DOM
//      observers / WS streams.
//   2. `_setGmXhrForTests` from gm-fetch captures the HTTP layer so we can
//      assert the exact /radar/report payload without mock.module-ing
//      internal project modules.
//
// Schema covered (matches server/src/routes/radar-public.ts validateBucket
// as of 2026-05-10):
//   POST /radar/report
//   {
//     reporter_uid: number,                 // required, observer's bili uid
//     client_version: string,               // required, ≤64 chars
//     buckets: [{                           // required, non-empty
//       bucket_ts: number,                  // 300-aligned epoch secs
//       room_id: number,                    // positive int
//       channel_uid: number,                // positive int (streamer's uid)
//       msg_count: number,                  // non-neg int
//       distinct_uid_count: number,         // non-neg int, ≤ msg_count
//     }]
//   }
//
// What's covered:
//   - noteRadarObservation gates: toggle off, roomId null/<=0, channelUid
//     null/<=0, selfUid null/<=0 (anon viewer short-circuits)
//   - Bucket aggregation: multiple events in same 5-min window collapse to
//     one bucket (msg_count++, distinctSenderUids set adds)
//   - Bucket boundary: events on either side of an :xx:00 / :xx:05 line go
//     into separate buckets
//   - Distinct uid: same sender twice → distinct=1; null/missing sender →
//     'anon' sentinel so msg_count and distinct_count stay coherent
//   - Cardinality invariant: distinct_uid_count ≤ msg_count enforced in payload
//   - flushNow: empty → noop, no HTTP; populated → POSTs schema-correct
//     payload + clears buckets; reporter_uid required (skips & drops if null)
//   - client_version is set to VERSION constant (from `$`'s GM_info shim
//     in tests = "test")
//   - MAX_BUCKETS_PER_FLUSH=100 cap: 101+ buckets → server-cap-trim
//   - Room change drops buckets via effect; toggle off drops buckets +
//     unsubscribes + clears timer
//   - DOM/WS ingest both feed noteRadarObservation; WS non-danmaku /
//     non-ws-source events ignored

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')

const {
  _peekRadarReportBucketsForTests,
  _resetRadarReportForTests,
  _setSubscribersForTests,
  flushNow,
  noteRadarObservation,
  startRadarReportLoop,
} = await import('../src/lib/radar-report')
const { cachedRoomId, cachedSelfUid, cachedStreamerUid } = await import('../src/lib/store')
const { radarBackendUrlOverride, radarReportEnabled } = await import('../src/lib/store-radar')

// ---------------------------------------------------------------------------
// HTTP capture (for asserting /radar/report payloads).
// ---------------------------------------------------------------------------
interface CapturedReq {
  url: string
  method: string
  body?: string
}
const captured: CapturedReq[] = []

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
}

// ---------------------------------------------------------------------------
// Subscriber fakes — capture handler refs so tests can drive ingest manually.
// ---------------------------------------------------------------------------
type DanmakuHandler = (ev: { text: string; uid: string | null }) => void
type WsHandler = (ev: { kind: string; source: string; text: string; uid: string | null }) => void

let domHandler: DanmakuHandler | null = null
let wsHandler: WsHandler | null = null
let domUnsubCalls = 0
let wsUnsubCalls = 0

function fakeSubscribeDanmaku(sub: { onMessage?: DanmakuHandler }): () => void {
  domHandler = sub.onMessage ?? null
  return () => {
    domHandler = null
    domUnsubCalls++
  }
}

function fakeSubscribeCustomChatEvents(handler: WsHandler): () => void {
  wsHandler = handler
  return () => {
    wsHandler = null
    wsUnsubCalls++
  }
}

beforeEach(() => {
  resetGmStore()
  captured.length = 0
  domHandler = null
  wsHandler = null
  domUnsubCalls = 0
  wsUnsubCalls = 0

  // Reset signals to clean slate.
  radarReportEnabled.value = false
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedSelfUid.value = null
  radarBackendUrlOverride.value = 'https://radar.test.local'

  _resetRadarReportForTests()

  // Wire DI seams.
  _setSubscribersForTests({
    subscribeDanmaku: fakeSubscribeDanmaku as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
    subscribeCustomChatEvents:
      fakeSubscribeCustomChatEvents as unknown as typeof import('../src/lib/custom-chat-events').subscribeCustomChatEvents,
  })

  _setGmXhrForTests(((opts: XhrOpts) => {
    captured.push({ url: opts.url, method: opts.method, body: opts.data })
    setTimeout(() => {
      opts.onload?.({
        status: 200,
        statusText: 'OK',
        responseText: '{"accepted":1,"rejected":0,"dedupedRows":0}',
        responseHeaders: '',
        finalUrl: opts.url,
      })
    }, 0)
    return undefined as unknown as ReturnType<NonNullable<Parameters<typeof _setGmXhrForTests>[0]>>
  }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
})

afterEach(() => {
  _resetRadarReportForTests()
  radarReportEnabled.value = false
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  cachedSelfUid.value = null
  radarBackendUrlOverride.value = ''
  _setGmXhrForTests(null)
})

// Convenience: prime all four signals so noteRadarObservation passes its gates.
// Order matters: set `radarReportEnabled` LAST. Effects from earlier tests are
// still subscribed (bun:test doesn't dispose them between tests), so when the
// toggle flips ON they all re-fire `attachIngest`. By the time that happens
// the room/channel/self signals are already set, so the toggle effect's
// `refreshSelfUidFromCookie` short-circuits at `cachedSelfUid !== null`
// instead of reaching the (undefined-in-bun-test) `document.cookie`.
function primeReady(): void {
  cachedRoomId.value = 100
  cachedStreamerUid.value = 200
  cachedSelfUid.value = 12345678
  radarReportEnabled.value = true
}

// ---------------------------------------------------------------------------
// noteRadarObservation gates
// ---------------------------------------------------------------------------
describe('noteRadarObservation gates', () => {
  test('toggle OFF → no buckets', () => {
    radarReportEnabled.value = false
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 12345678
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('roomId null → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = null
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 12345678
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('roomId 0 → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 0
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 12345678
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('roomId -1 → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = -1
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 12345678
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('channelUid null → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = null
    cachedSelfUid.value = 12345678
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('channelUid 0 / -1 → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedSelfUid.value = 12345678
    cachedStreamerUid.value = 0
    noteRadarObservation('草', 'sender-1')
    cachedStreamerUid.value = -1
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('selfUid null (anon viewer) → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    cachedSelfUid.value = null
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('selfUid 0 / -1 → no buckets', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 0
    noteRadarObservation('草', 'sender-1')
    cachedSelfUid.value = -1
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('happy path → bucket created with msg_count=1, distinct=1', () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    const b = peek.buckets[0]
    expect(b.roomId).toBe(100)
    expect(b.channelUid).toBe(200)
    expect(b.msgCount).toBe(1)
    expect(b.distinctUidCount).toBe(1)
    // bucket_ts must be a multiple of 300 and within ~now.
    const nowSec = Math.floor(Date.now() / 1000)
    expect(b.bucketTs % 300).toBe(0)
    expect(nowSec - b.bucketTs).toBeLessThanOrEqual(300)
    expect(nowSec - b.bucketTs).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// Bucket aggregation
// ---------------------------------------------------------------------------
describe('bucket aggregation', () => {
  test('two events same 5-min window → one bucket, msg=2, distinct=2', () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    noteRadarObservation('awsl', 'sender-2')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].msgCount).toBe(2)
    expect(peek.buckets[0].distinctUidCount).toBe(2)
  })

  test('same sender twice → distinct=1, msg=2 (Set dedup)', () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    noteRadarObservation('草草草', 'sender-1')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].msgCount).toBe(2)
    expect(peek.buckets[0].distinctUidCount).toBe(1)
  })

  test('null sender uid maps to anon sentinel; many anon events → distinct=1', () => {
    primeReady()
    noteRadarObservation('a', null)
    noteRadarObservation('b', null)
    noteRadarObservation('c', null)
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].msgCount).toBe(3)
    expect(peek.buckets[0].distinctUidCount).toBe(1)
  })

  test('anon + named senders coexist as separate distincts', () => {
    primeReady()
    noteRadarObservation('a', null)
    noteRadarObservation('b', 'sender-1')
    noteRadarObservation('c', 'sender-2')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].msgCount).toBe(3)
    expect(peek.buckets[0].distinctUidCount).toBe(3)
  })

  test('cardinality invariant: distinct_uid_count never > msg_count in payload', async () => {
    primeReady()
    // Drive 5 messages from 5 unique senders (distinct=5, msg=5).
    for (let i = 0; i < 5; i++) noteRadarObservation('x', `sender-${i}`)
    flushNow()
    await new Promise(r => setTimeout(r, 5))
    const body = JSON.parse(captured[0]?.body ?? '{}')
    expect(body.buckets[0].distinct_uid_count).toBeLessThanOrEqual(body.buckets[0].msg_count)
  })

  test('bucket boundary: separate buckets when bucket_ts crosses', () => {
    primeReady()
    // Stub Date.now to the very end of one 5-min bucket then the start of next.
    const origNow = Date.now
    let now = 1_700_000_000_000 // arbitrary epoch ms
    // Force this onto a 300-aligned boundary, then -1s for "previous bucket".
    const baseSec = Math.floor(now / 1000 / 300) * 300
    now = (baseSec + 299) * 1000 // last second of current bucket
    Date.now = () => now
    try {
      noteRadarObservation('a', 'sender-1')
      // jump 1 second forward → next bucket
      now = (baseSec + 300) * 1000
      noteRadarObservation('b', 'sender-1')
      const peek = _peekRadarReportBucketsForTests()
      expect(peek.bucketCount).toBe(2)
      expect(peek.buckets[0].bucketTs).toBe(baseSec)
      expect(peek.buckets[1].bucketTs).toBe(baseSec + 300)
      expect(peek.buckets[0].msgCount).toBe(1)
      expect(peek.buckets[1].msgCount).toBe(1)
    } finally {
      Date.now = origNow
    }
  })

  test('room change mid-session: old buckets dropped via effect (when started)', () => {
    primeReady()
    startRadarReportLoop()
    noteRadarObservation('a', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(1)

    cachedRoomId.value = 999
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)

    noteRadarObservation('b', 'sender-1')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].roomId).toBe(999)
  })
})

// ---------------------------------------------------------------------------
// flushNow + payload schema
// ---------------------------------------------------------------------------
describe('flushNow', () => {
  test('empty buckets → noop, no HTTP', async () => {
    flushNow()
    await new Promise(r => setTimeout(r, 5))
    expect(captured).toHaveLength(0)
  })

  test('populated → POSTs schema-correct payload + clears buckets', async () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    noteRadarObservation('awsl', 'sender-2')
    noteRadarObservation('xswl', 'sender-2')

    flushNow()
    await new Promise(r => setTimeout(r, 5))

    expect(captured).toHaveLength(1)
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toMatch(/\/radar\/report$/)

    const body = JSON.parse(captured[0].body ?? '{}')
    // Schema shape.
    expect(body.reporter_uid).toBe(12345678)
    expect(typeof body.client_version).toBe('string')
    expect(body.client_version.length).toBeGreaterThan(0)
    expect(body.client_version.length).toBeLessThanOrEqual(64)
    expect(Array.isArray(body.buckets)).toBe(true)
    expect(body.buckets).toHaveLength(1)
    const b = body.buckets[0]
    expect(b.room_id).toBe(100)
    expect(b.channel_uid).toBe(200)
    expect(b.msg_count).toBe(3)
    expect(b.distinct_uid_count).toBe(2)
    expect(b.bucket_ts % 300).toBe(0)

    // Buckets cleared after flush.
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('reporter_uid required: cachedSelfUid null → no HTTP, buckets dropped', async () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(1)

    // Simulate logout/anon: clear selfUid AFTER buckets accumulated.
    cachedSelfUid.value = null
    flushNow()
    await new Promise(r => setTimeout(r, 5))

    expect(captured).toHaveLength(0)
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('reporter_uid required: cachedSelfUid <=0 → no HTTP', async () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    cachedSelfUid.value = 0
    flushNow()
    await new Promise(r => setTimeout(r, 5))
    expect(captured).toHaveLength(0)
  })

  test('reportRadarObservation throw → flushNow does not throw', async () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')

    _setGmXhrForTests((() => {
      throw new Error('synthetic xhr explosion')
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    expect(() => flushNow()).not.toThrow()
    await new Promise(r => setTimeout(r, 5))
  })

  test('flushNow returns synchronously even if HTTP is slow', () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')

    _setGmXhrForTests(((opts: XhrOpts) => {
      captured.push({ url: opts.url, method: opts.method, body: opts.data })
      // Never call onload — simulates a hung request.
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    const before = Date.now()
    flushNow()
    const after = Date.now()
    expect(after - before).toBeLessThan(100)
  })

  test('over 100 buckets in one flush: server-cap-trim to 100', async () => {
    primeReady()
    // Fabricate 105 buckets manually by stepping bucket_ts via Date.now.
    const origNow = Date.now
    const baseSec = Math.floor(Date.now() / 1000 / 300) * 300
    // Use 105 sequential 5-min buckets going backwards from baseSec, then
    // forwards the equivalent — keeps them all within server's
    // [now-7d, now+300s] tolerance. baseSec - 104*300 ≈ 8.7h ago, well inside
    // the 7-day past horizon.
    for (let i = 0; i < 105; i++) {
      const ts = baseSec - i * 300
      Date.now = () => ts * 1000
      noteRadarObservation('x', `sender-${i}`)
    }
    Date.now = origNow

    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(105)
    flushNow()
    await new Promise(r => setTimeout(r, 5))

    const body = JSON.parse(captured[0]?.body ?? '{}')
    expect(body.buckets.length).toBe(100)
    // All bucket_ts still 300-aligned + sorted ascending after server-cap-trim.
    for (let i = 1; i < body.buckets.length; i++) {
      expect(body.buckets[i].bucket_ts).toBeGreaterThan(body.buckets[i - 1].bucket_ts)
      expect(body.buckets[i].bucket_ts % 300).toBe(0)
    }
  })

  test('multi-bucket flush: each bucket carries its own room/channel/counts', async () => {
    primeReady()
    const origNow = Date.now
    const baseSec = Math.floor(Date.now() / 1000 / 300) * 300
    // Bucket A at baseSec-300: 2 msgs from 2 senders
    Date.now = () => (baseSec - 300) * 1000
    noteRadarObservation('a', 'sender-1')
    noteRadarObservation('b', 'sender-2')
    // Bucket B at baseSec: 3 msgs from 1 sender
    Date.now = () => baseSec * 1000
    noteRadarObservation('c', 'sender-3')
    noteRadarObservation('c', 'sender-3')
    noteRadarObservation('d', 'sender-3')
    Date.now = origNow

    flushNow()
    await new Promise(r => setTimeout(r, 5))

    const body = JSON.parse(captured[0]?.body ?? '{}')
    expect(body.buckets).toHaveLength(2)
    const bA = body.buckets.find((b: { bucket_ts: number }) => b.bucket_ts === baseSec - 300)
    const bB = body.buckets.find((b: { bucket_ts: number }) => b.bucket_ts === baseSec)
    expect(bA.msg_count).toBe(2)
    expect(bA.distinct_uid_count).toBe(2)
    expect(bB.msg_count).toBe(3)
    expect(bB.distinct_uid_count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// _peekRadarReportBucketsForTests / _resetRadarReportForTests
// ---------------------------------------------------------------------------
describe('test seams', () => {
  test('_peek returns empty when no buckets', () => {
    expect(_peekRadarReportBucketsForTests()).toEqual({ bucketCount: 0, buckets: [] })
  })

  test('_peek returns shape when buckets present', () => {
    primeReady()
    noteRadarObservation('草', 'sender-1')
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0]).toEqual({
      bucketTs: expect.any(Number),
      roomId: 100,
      channelUid: 200,
      msgCount: 1,
      distinctUidCount: 1,
    })
  })

  test('_reset clears buckets + detaches ingest + clears timer + un-starts loop', () => {
    primeReady()
    startRadarReportLoop()
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(1)
    expect(domHandler).not.toBeNull()

    _resetRadarReportForTests()
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()

    // After reset, a second startRadarReportLoop should re-subscribe.
    // _resetRadarReportForTests wipes impls back to real subscribers, so
    // re-install fakes first.
    _setSubscribersForTests({
      subscribeDanmaku: fakeSubscribeDanmaku as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
      subscribeCustomChatEvents:
        fakeSubscribeCustomChatEvents as unknown as typeof import('../src/lib/custom-chat-events').subscribeCustomChatEvents,
    })
    primeReady()
    startRadarReportLoop()
    expect(domHandler).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// startRadarReportLoop lifecycle
// ---------------------------------------------------------------------------
describe('startRadarReportLoop', () => {
  test('idempotent: second call does not double-subscribe', () => {
    let calls = 0
    _setSubscribersForTests({
      subscribeDanmaku: ((sub: { onMessage?: DanmakuHandler }) => {
        calls++
        domHandler = sub.onMessage ?? null
        return () => {
          domHandler = null
        }
      }) as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
    })
    primeReady()

    startRadarReportLoop()
    startRadarReportLoop()
    expect(calls).toBe(1)
  })

  test('toggle ON wires both subscribers + timer', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    cachedSelfUid.value = 12345678
    startRadarReportLoop()
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()

    radarReportEnabled.value = true
    expect(domHandler).not.toBeNull()
    expect(wsHandler).not.toBeNull()
  })

  test('toggle ON → OFF: unsubscribes + drops buckets + clears timer', () => {
    primeReady()
    startRadarReportLoop()
    noteRadarObservation('草', 'sender-1')
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(1)

    radarReportEnabled.value = false
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()
    expect(domUnsubCalls).toBe(1)
    expect(wsUnsubCalls).toBe(1)
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('DOM ingest path: { text, uid } reaches noteRadarObservation', () => {
    primeReady()
    startRadarReportLoop()
    expect(domHandler).not.toBeNull()
    domHandler?.({ text: '草', uid: 'sender-7' } as Parameters<DanmakuHandler>[0])
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].msgCount).toBe(1)
    expect(peek.buckets[0].distinctUidCount).toBe(1)
  })

  test('WS ingest: kind=danmaku source=ws → noteRadarObservation runs with uid', () => {
    primeReady()
    startRadarReportLoop()
    expect(wsHandler).not.toBeNull()
    wsHandler?.({ kind: 'danmaku', source: 'ws', text: 'awsl', uid: 'sender-8' })
    const peek = _peekRadarReportBucketsForTests()
    expect(peek.bucketCount).toBe(1)
    expect(peek.buckets[0].distinctUidCount).toBe(1)
  })

  test('WS ingest: kind!=danmaku → ignored', () => {
    primeReady()
    startRadarReportLoop()
    wsHandler?.({ kind: 'gift', source: 'ws', text: 'gift-text', uid: 'x' })
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('WS ingest: source!=ws → ignored (DOM events come through DOM path)', () => {
    primeReady()
    startRadarReportLoop()
    wsHandler?.({ kind: 'danmaku', source: 'dom', text: '草', uid: 'x' })
    expect(_peekRadarReportBucketsForTests().bucketCount).toBe(0)
  })

  test('attach is idempotent across ON→OFF→ON cycles', () => {
    primeReady()
    startRadarReportLoop()
    radarReportEnabled.value = false
    radarReportEnabled.value = true
    radarReportEnabled.value = false
    expect(domUnsubCalls).toBe(2)
    expect(wsUnsubCalls).toBe(2)
  })
})
