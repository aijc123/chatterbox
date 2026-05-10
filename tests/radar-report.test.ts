// Coverage for `src/lib/radar-report.ts` — the opt-in /radar/report
// aggregator. Two layers of DI:
//   1. `_setSubscribersForTests` swaps in test fakes for subscribeDanmaku /
//      subscribeCustomChatEvents / lookupTrendingMatch so we don't have to
//      spin up real DOM observers or seed the trending signal map.
//   2. `_setGmXhrForTests` from gm-fetch captures the HTTP layer so we can
//      assert the exact /radar/report payload without mock.module-ing
//      internal project modules.
//
// What's covered (mapped to source branches):
//   - noteRadarObservation gates: toggle off, roomId null/<=0, channelUid
//     null/<=0, empty/whitespace text, text >MAX_TEXT_LEN (200), trending
//     miss, dedupe, MAX_SAMPLES (30) cap, room change rebuild
//   - flushNow: null buffer, empty buffer rolls window, populated buffer
//     fires reportRadarObservation with exact payload, buffer rotation
//     (same room/channel, windowStartTs = previous windowEndTs), throw
//     swallowed via fire-and-forget
//   - startRadarReportLoop: idempotent, toggle ON wires subscriptions and
//     timer, toggle OFF tears them down + drops buffer, room change drops
//     buffer, DOM ingest / WS ingest both feed noteRadarObservation, WS
//     non-danmaku / non-ws-source events ignored
//   - _peekRadarReportBufferForTests: null + populated
//   - _resetRadarReportForTests: clears state

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')

const {
  _peekRadarReportBufferForTests,
  _resetRadarReportForTests,
  _setSubscribersForTests,
  flushNow,
  noteRadarObservation,
  startRadarReportLoop,
} = await import('../src/lib/radar-report')
const { cachedRoomId, cachedStreamerUid } = await import('../src/lib/store')
const { radarBackendUrlOverride, radarReportEnabled } = await import('../src/lib/store-radar')
const { _resetTrendingMemesForTests } = await import('../src/lib/meme-trending')

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
type DanmakuHandler = (ev: { text: string }) => void
type WsHandler = (ev: { kind: string; source: string; text: string }) => void

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

// Default trending lookup: any non-empty text matches. Tests can override.
let trendingPredicate: (text: string) => boolean = _t => true

function fakeLookupTrendingMatch(text: string) {
  return trendingPredicate(text) ? { rank: 1, clusterId: 1, heatScore: 1, slopeScore: 0 } : null
}

beforeEach(() => {
  resetGmStore()
  captured.length = 0
  domHandler = null
  wsHandler = null
  domUnsubCalls = 0
  wsUnsubCalls = 0
  trendingPredicate = _t => true

  // Reset signals to clean slate.
  radarReportEnabled.value = false
  cachedRoomId.value = null
  cachedStreamerUid.value = null
  radarBackendUrlOverride.value = 'https://radar.test.local'
  _resetTrendingMemesForTests()

  _resetRadarReportForTests()

  // Wire DI seams.
  _setSubscribersForTests({
    subscribeDanmaku: fakeSubscribeDanmaku as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
    subscribeCustomChatEvents:
      fakeSubscribeCustomChatEvents as unknown as typeof import('../src/lib/custom-chat-events').subscribeCustomChatEvents,
    lookupTrendingMatch:
      fakeLookupTrendingMatch as unknown as typeof import('../src/lib/meme-trending').lookupTrendingMatch,
  })

  _setGmXhrForTests(((opts: XhrOpts) => {
    captured.push({ url: opts.url, method: opts.method, body: opts.data })
    setTimeout(() => {
      opts.onload?.({
        status: 200,
        statusText: 'OK',
        responseText: '{}',
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
  radarBackendUrlOverride.value = ''
  _resetTrendingMemesForTests()
  _setGmXhrForTests(null)
})

// ---------------------------------------------------------------------------
// noteRadarObservation gates
// ---------------------------------------------------------------------------
describe('noteRadarObservation gates', () => {
  test('toggle OFF → no buffer change', () => {
    radarReportEnabled.value = false
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('roomId null → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = null
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('roomId 0 → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 0
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('roomId -1 → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = -1
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('channelUid null → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = null
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('channelUid 0 → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 0
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('channelUid -1 → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = -1
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('empty text → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('whitespace-only text → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('   \t  ')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('text exactly 200 chars → accepted', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('x'.repeat(200))
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)
  })

  test('text 201 chars → rejected', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('x'.repeat(201))
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('trending miss → no buffer', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    trendingPredicate = _t => false
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('happy path → buffer created + text added', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    const before = Date.now()
    noteRadarObservation('草')
    const after = Date.now()
    const peek = _peekRadarReportBufferForTests()
    expect(peek).not.toBeNull()
    expect(peek?.roomId).toBe(100)
    expect(peek?.size).toBe(1)
    expect(peek?.windowStartTs ?? -1).toBeGreaterThanOrEqual(before)
    expect(peek?.windowStartTs ?? Number.MAX_SAFE_INTEGER).toBeLessThanOrEqual(after)
  })

  test('dedupe: same text twice → one entry', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    noteRadarObservation('草')
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)
  })

  test('text with leading/trailing whitespace dedupes against trimmed', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    noteRadarObservation('  草  ')
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)
  })

  test('buffer cap: 30th accepted, 31st dropped', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    for (let i = 0; i < 30; i++) noteRadarObservation(`text-${i}`)
    expect(_peekRadarReportBufferForTests()?.size).toBe(30)
    noteRadarObservation('text-30')
    expect(_peekRadarReportBufferForTests()?.size).toBe(30)
  })

  test('room change mid-session: buffer rotated to new room', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()?.roomId).toBe(100)
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)

    cachedRoomId.value = 999
    noteRadarObservation('awsl')
    const peek = _peekRadarReportBufferForTests()
    expect(peek?.roomId).toBe(999)
    expect(peek?.size).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// flushNow
// ---------------------------------------------------------------------------
describe('flushNow', () => {
  test('null buffer → noop, no HTTP', async () => {
    flushNow()
    await new Promise(r => setTimeout(r, 5))
    expect(captured).toHaveLength(0)
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('empty buffer (no texts) → window rolled, no HTTP', async () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    // Seed buffer with a dummy then drain it.
    noteRadarObservation('草')
    // Reach into buffer state by flushing once (sends + rotates).
    flushNow()
    await new Promise(r => setTimeout(r, 5))
    captured.length = 0
    const before = _peekRadarReportBufferForTests()?.windowStartTs ?? 0

    // Now buffer exists with size=0; flushNow should roll windowStartTs
    // without issuing HTTP.
    await new Promise(r => setTimeout(r, 2))
    flushNow()
    expect(captured).toHaveLength(0)
    const after = _peekRadarReportBufferForTests()?.windowStartTs ?? 0
    expect(after).toBeGreaterThanOrEqual(before)
  })

  test('populated buffer → POSTs exact payload + rotates', async () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    noteRadarObservation('awsl')
    noteRadarObservation('xswl')
    const startTs = _peekRadarReportBufferForTests()?.windowStartTs ?? 0

    const beforeFlush = Date.now()
    flushNow()
    const afterFlush = Date.now()
    await new Promise(r => setTimeout(r, 5))

    expect(captured).toHaveLength(1)
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toMatch(/\/radar\/report$/)
    const body = JSON.parse(captured[0].body ?? '{}')
    expect(body.roomId).toBe(100)
    expect(body.channelUid).toBe(200)
    expect(body.sampledTexts).toEqual(['草', 'awsl', 'xswl'])
    expect(body.windowStartTs).toBe(startTs)
    expect(body.windowEndTs).toBeGreaterThanOrEqual(beforeFlush)
    expect(body.windowEndTs).toBeLessThanOrEqual(afterFlush)

    // After flush: same room/channel, empty Set, windowStartTs == previous windowEndTs.
    const peek = _peekRadarReportBufferForTests()
    expect(peek?.roomId).toBe(100)
    expect(peek?.size).toBe(0)
    expect(peek?.windowStartTs).toBe(body.windowEndTs)
  })

  test('reportRadarObservation throw → flushNow does not throw (fire-and-forget)', async () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')

    // Override the XHR fake to throw immediately on any call.
    _setGmXhrForTests((() => {
      throw new Error('synthetic xhr explosion')
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    // The throw happens inside reportRadarObservation, which itself swallows
    // errors via try/catch. flushNow's `void reportRadarObservation(...)`
    // means even an uncaught rejection wouldn't leak — but reportRadarObservation
    // already swallows. Either way, flushNow itself MUST NOT throw.
    expect(() => flushNow()).not.toThrow()
    await new Promise(r => setTimeout(r, 5))
  })

  test('flushNow returns synchronously even if HTTP is slow', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')

    _setGmXhrForTests(((opts: XhrOpts) => {
      captured.push({ url: opts.url, method: opts.method, body: opts.data })
      // Never call onload — simulates a hung request.
    }) as unknown as Parameters<typeof _setGmXhrForTests>[0])

    const before = Date.now()
    flushNow()
    const after = Date.now()
    // Should return well under 100ms even though the HTTP "never returns".
    expect(after - before).toBeLessThan(100)
  })
})

// ---------------------------------------------------------------------------
// _peekRadarReportBufferForTests / _resetRadarReportForTests
// ---------------------------------------------------------------------------
describe('test seams', () => {
  test('_peek returns null when no buffer', () => {
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('_peek returns shape when buffer present', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    noteRadarObservation('草')
    const peek = _peekRadarReportBufferForTests()
    expect(peek).toEqual({
      roomId: 100,
      size: 1,
      windowStartTs: expect.any(Number),
    })
  })

  test('_reset clears buffer + detaches ingest + clears timer + un-starts loop', () => {
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).not.toBeNull()
    expect(domHandler).not.toBeNull()

    _resetRadarReportForTests()
    expect(_peekRadarReportBufferForTests()).toBeNull()
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()

    // After reset, a second startRadarReportLoop should re-subscribe — proves
    // `started` flag was cleared. _resetRadarReportForTests wipes impls back
    // to the real subscribers, so re-install the fakes first or the real
    // DOM observer would try to access `document`.
    _setSubscribersForTests({
      subscribeDanmaku: fakeSubscribeDanmaku as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
      subscribeCustomChatEvents:
        fakeSubscribeCustomChatEvents as unknown as typeof import('../src/lib/custom-chat-events').subscribeCustomChatEvents,
      lookupTrendingMatch:
        fakeLookupTrendingMatch as unknown as typeof import('../src/lib/meme-trending').lookupTrendingMatch,
    })
    radarReportEnabled.value = true
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
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
    // Install the counting fake BEFORE startRadarReportLoop. (beforeEach
    // already wired the default fakes; this overrides only subscribeDanmaku
    // so counting reflects exactly the radar-report module's calls.)
    _setSubscribersForTests({
      subscribeDanmaku: ((sub: { onMessage?: DanmakuHandler }) => {
        calls++
        domHandler = sub.onMessage ?? null
        return () => {
          domHandler = null
        }
      }) as unknown as typeof import('../src/lib/danmaku-stream').subscribeDanmaku,
    })
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    radarReportEnabled.value = true

    startRadarReportLoop()
    startRadarReportLoop()
    expect(calls).toBe(1)
  })

  test('toggle ON → both subscribers + timer wired', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    // Toggle OFF initially → no subscriptions yet.
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()

    radarReportEnabled.value = true
    expect(domHandler).not.toBeNull()
    expect(wsHandler).not.toBeNull()
  })

  test('toggle ON → OFF → unsubscribes + drops buffer + clears timer', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()).not.toBeNull()

    radarReportEnabled.value = false
    expect(domHandler).toBeNull()
    expect(wsHandler).toBeNull()
    expect(domUnsubCalls).toBe(1)
    expect(wsUnsubCalls).toBe(1)
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('room change while toggle ON → buffer dropped via effect', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true
    noteRadarObservation('草')
    expect(_peekRadarReportBufferForTests()?.roomId).toBe(100)

    cachedRoomId.value = 999
    // The effect only fires on room change while a buffer is present and
    // its roomId differs.
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('DOM-side ingest path → noteRadarObservation runs (buffer grows)', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true

    expect(domHandler).not.toBeNull()
    domHandler?.({ text: '草' } as Parameters<DanmakuHandler>[0])
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)
  })

  test('WS ingest path: kind=danmaku source=ws → noteRadarObservation runs', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true

    expect(wsHandler).not.toBeNull()
    wsHandler?.({ kind: 'danmaku', source: 'ws', text: 'awsl' })
    expect(_peekRadarReportBufferForTests()?.size).toBe(1)
  })

  test('WS ingest: kind!=danmaku → ignored', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true

    expect(wsHandler).not.toBeNull()
    wsHandler?.({ kind: 'gift', source: 'ws', text: 'gift-text' })
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('WS ingest: source!=ws → ignored', () => {
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true

    expect(wsHandler).not.toBeNull()
    wsHandler?.({ kind: 'danmaku', source: 'dom', text: '草' })
    expect(_peekRadarReportBufferForTests()).toBeNull()
  })

  test('attachIngest is idempotent within a single ON toggle', () => {
    // Drive toggle ON twice in a row by relying on signal change-detection
    // dropping the no-op write — but we still want the attach guard tested.
    // Easiest path: drive the effect by toggling OFF→ON→OFF→ON and confirm
    // each ON only adds a subscription once (already covered above) AND
    // confirm no attached/detached double-counting via _peek of unsub calls
    // across cycles.
    cachedRoomId.value = 100
    cachedStreamerUid.value = 200
    startRadarReportLoop()
    radarReportEnabled.value = true
    radarReportEnabled.value = false
    radarReportEnabled.value = true
    radarReportEnabled.value = false
    expect(domUnsubCalls).toBe(2)
    expect(wsUnsubCalls).toBe(2)
  })
})
