/**
 * Coverage for the SBHZM freshness probe (Phase D.1).
 *
 *  - probe is gated on cbBackendEnabled
 *  - probe is gated on having a memeSource (room has SBHZM endpoint)
 *  - probe respects 30-minute throttle per listEndpoint
 *  - probe calls fetchSbhzmFirstPage and pipes result to mirrorToCbBackend
 *  - empty result (upstream returned nothing) does not call mirror
 *  - per-endpoint throttle: room A's probe doesn't block room B's probe
 *  - second mount within throttle window → no fetch even on success path
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { MemeSource } from '../src/lib/meme-sources'

let firstPageItems: unknown[] = []
let firstPageThrows: Error | null = null
let firstPageCalls = 0

let mirrorCalls: Array<{ items: unknown[]; source: string }> = []
let mirrorThrows: Error | null = null

mock.module('../src/lib/sbhzm-client', () => ({
  fetchSbhzmFirstPage: async () => {
    firstPageCalls++
    if (firstPageThrows) throw firstPageThrows
    return firstPageItems
  },
}))

mock.module('../src/lib/cb-backend-client', () => ({
  mirrorToCbBackend: async (items: unknown[], source: string) => {
    if (mirrorThrows) throw mirrorThrows
    mirrorCalls.push({ items, source })
  },
}))

mock.module('../src/lib/log', () => ({
  appendLog: () => {},
  appendLogQuiet: () => {},
  notifyUser: () => {},
}))

const { maybeProbeSbhzmFreshness, _resetSbhzmProbeStateForTests } = await import('../src/lib/sbhzm-freshness-probe')
const { cbBackendEnabled } = await import('../src/lib/store-meme')

const sourceA: MemeSource = {
  roomIds: [123],
  name: 'room-A',
  listEndpoint: 'https://example.com/api/memes/A',
  randomEndpoint: undefined,
  keywordToTag: {},
  liveStreamerName: 'A-streamer',
  liveStreamerUid: 1,
} as unknown as MemeSource

const sourceB: MemeSource = {
  roomIds: [456],
  name: 'room-B',
  listEndpoint: 'https://example.com/api/memes/B',
  randomEndpoint: undefined,
  keywordToTag: {},
  liveStreamerName: 'B-streamer',
  liveStreamerUid: 2,
} as unknown as MemeSource

beforeEach(() => {
  _resetSbhzmProbeStateForTests()
  firstPageItems = []
  firstPageThrows = null
  firstPageCalls = 0
  mirrorCalls = []
  mirrorThrows = null
  cbBackendEnabled.value = true
})

afterEach(() => {
  cbBackendEnabled.value = false
})

describe('maybeProbeSbhzmFreshness — gates', () => {
  test('source = null → skipped_no_source, no fetch', async () => {
    const r = await maybeProbeSbhzmFreshness(null)
    expect(r.outcome).toBe('skipped_no_source')
    expect(firstPageCalls).toBe(0)
    expect(mirrorCalls).toHaveLength(0)
  })

  test('cbBackendEnabled = false → skipped_disabled, no fetch', async () => {
    cbBackendEnabled.value = false
    const r = await maybeProbeSbhzmFreshness(sourceA)
    expect(r.outcome).toBe('skipped_disabled')
    expect(firstPageCalls).toBe(0)
    expect(mirrorCalls).toHaveLength(0)
  })

  test('forceEnabled overrides the cbBackendEnabled gate', async () => {
    cbBackendEnabled.value = false
    firstPageItems = [{ id: -1, content: 'x' }]
    const r = await maybeProbeSbhzmFreshness(sourceA, { forceEnabled: true })
    expect(r.outcome).toBe('probed')
    expect(firstPageCalls).toBe(1)
  })
})

describe('maybeProbeSbhzmFreshness — happy path', () => {
  test('first call probes + mirrors items', async () => {
    firstPageItems = [
      { id: -1, content: 'a' },
      { id: -2, content: 'b' },
    ]
    const r = await maybeProbeSbhzmFreshness(sourceA)
    expect(r.outcome).toBe('probed')
    expect(r.itemsFetched).toBe(2)
    expect(firstPageCalls).toBe(1)
    expect(mirrorCalls).toHaveLength(1)
    expect(mirrorCalls[0]?.source).toBe('sbhzm')
    expect(mirrorCalls[0]?.items).toHaveLength(2)
  })

  test('empty upstream result → probed but mirror NOT called', async () => {
    firstPageItems = []
    const r = await maybeProbeSbhzmFreshness(sourceA)
    expect(r.outcome).toBe('probed')
    expect(r.itemsFetched).toBe(0)
    expect(mirrorCalls).toHaveLength(0)
  })

  test('fetch throws → outcome still probed, no mirror, no crash', async () => {
    firstPageThrows = new Error('network')
    const r = await maybeProbeSbhzmFreshness(sourceA)
    expect(r.outcome).toBe('probed')
    expect(r.itemsFetched).toBe(0)
    expect(mirrorCalls).toHaveLength(0)
  })

  test('mirror throws → does not propagate (background task should never crash UI)', async () => {
    firstPageItems = [{ id: -1, content: 'x' }]
    mirrorThrows = new Error('429 rate limited')
    const r = await maybeProbeSbhzmFreshness(sourceA)
    expect(r.outcome).toBe('probed') // throws inside mirror are swallowed
  })
})

describe('maybeProbeSbhzmFreshness — throttle', () => {
  test('second call within 30min → skipped_throttled, no second fetch', async () => {
    firstPageItems = [{ id: -1, content: 'x' }]
    await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 })
    expect(firstPageCalls).toBe(1)

    const r = await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 + 10 * 60 * 1000 }) // 10 min later
    expect(r.outcome).toBe('skipped_throttled')
    expect(firstPageCalls).toBe(1) // unchanged
  })

  test('after 30 min the throttle window opens and we probe again', async () => {
    firstPageItems = [{ id: -1, content: 'x' }]
    await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 })

    const r = await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 + 31 * 60 * 1000 })
    expect(r.outcome).toBe('probed')
    expect(firstPageCalls).toBe(2)
  })

  test('throttle is per-listEndpoint: room A and room B probes are independent', async () => {
    firstPageItems = [{ id: -1, content: 'x' }]
    await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 })
    expect(firstPageCalls).toBe(1)

    const r = await maybeProbeSbhzmFreshness(sourceB, { now: 10_000_000_000 + 60_000 }) // same minute
    expect(r.outcome).toBe('probed') // different endpoint → not throttled
    expect(firstPageCalls).toBe(2)
  })

  test('failed fetch still consumes the throttle slot (no retry storm)', async () => {
    firstPageThrows = new Error('boom')
    await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 })

    firstPageThrows = null
    firstPageItems = [{ id: -1, content: 'now-works' }]
    const r = await maybeProbeSbhzmFreshness(sourceA, { now: 10_000_000_000 + 5 * 60 * 1000 })
    expect(r.outcome).toBe('skipped_throttled')
    expect(firstPageCalls).toBe(1) // no retry within window
  })
})
