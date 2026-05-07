import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { clearRecentCustomChatDanmakuHistory, emitCustomChatEvent, prewarmAvatar } from '../src/lib/custom-chat-events'

// `prewarmAvatar` constructs `new Image()` and calls `img.decode()`. In the
// bun test environment there's no DOM, so we install a minimal Image stub
// that records constructions and lets us assert observable behavior.

interface StubImage {
  src: string
  decoding: string
  referrerPolicy: string
  decodeCalls: number
  decodeRejected: boolean
}

const constructions: StubImage[] = []

class TestImage implements StubImage {
  src = ''
  decoding = ''
  referrerPolicy = ''
  decodeCalls = 0
  decodeRejected = false

  constructor() {
    constructions.push(this)
  }

  decode(): Promise<void> {
    this.decodeCalls++
    // Simulate the real-world failure mode (image not yet decodable, or
    // detached) so we exercise the .catch() guard inside prewarmAvatar.
    return Promise.reject(new Error('test: decode rejected')).catch(err => {
      this.decodeRejected = true
      throw err
    })
  }
}

const realImage = (globalThis as { Image?: typeof Image }).Image

beforeEach(() => {
  constructions.length = 0
  ;(globalThis as { Image: unknown }).Image = TestImage
})

afterEach(() => {
  if (realImage) (globalThis as { Image: unknown }).Image = realImage
  else delete (globalThis as { Image?: unknown }).Image
  clearRecentCustomChatDanmakuHistory()
})

describe('prewarmAvatar', () => {
  test('fires one Image() per unique URL with the correct hints', () => {
    prewarmAvatar('https://example.test/avatar/unique-1?size=96')

    expect(constructions).toHaveLength(1)
    const img = constructions[0]
    expect(img.src).toBe('https://example.test/avatar/unique-1?size=96')
    expect(img.referrerPolicy).toBe('no-referrer')
    expect(img.decoding).toBe('async')
    expect(img.decodeCalls).toBe(1)
  })

  test('dedupes repeated calls for the same URL', () => {
    const url = 'https://example.test/avatar/unique-2?size=96'
    prewarmAvatar(url)
    prewarmAvatar(url)
    prewarmAvatar(url)

    expect(constructions).toHaveLength(1)
  })

  test('is a no-op for undefined / empty inputs', () => {
    prewarmAvatar(undefined) // skipcq: JS-W1042
    prewarmAvatar('')

    expect(constructions).toHaveLength(0)
  })

  test('swallows decode rejection so failures do not surface to callers', async () => {
    prewarmAvatar('https://example.test/avatar/unique-3?size=96')

    // Give the swallowed rejection a microtask to settle. If the .catch()
    // guard inside prewarmAvatar were missing, this would surface as an
    // unhandled rejection and fail the test.
    await Promise.resolve()
    await Promise.resolve()

    expect(constructions[0].decodeCalls).toBe(1)
  })
})

describe('emitCustomChatEvent → prewarmAvatar integration', () => {
  test('an event with avatarUrl triggers prewarm before handlers fire', () => {
    emitCustomChatEvent({
      id: 'ws-prewarm-1',
      kind: 'danmaku',
      text: 'hi',
      uname: 'alice',
      uid: '42',
      time: '11:19',
      isReply: false,
      source: 'ws',
      badges: [],
      avatarUrl: 'https://example.test/avatar/integration-1?size=96',
    })

    expect(constructions).toHaveLength(1)
    expect(constructions[0].src).toBe('https://example.test/avatar/integration-1?size=96')
  })

  test('an event without avatarUrl is silent', () => {
    emitCustomChatEvent({
      id: 'ws-prewarm-2',
      kind: 'danmaku',
      text: 'hi',
      uname: 'alice',
      uid: '42',
      time: '11:19',
      isReply: false,
      source: 'ws',
      badges: [],
    })

    expect(constructions).toHaveLength(0)
  })

  test('two events sharing a UID and avatarUrl only fetch once', () => {
    const url = 'https://example.test/avatar/integration-3?size=96'
    for (let i = 0; i < 3; i++) {
      emitCustomChatEvent({
        id: `ws-prewarm-3-${i}`,
        kind: 'danmaku',
        text: `msg ${i}`,
        uname: 'alice',
        uid: '42',
        time: '11:19',
        isReply: false,
        source: 'ws',
        badges: [],
        avatarUrl: url,
      })
    }

    expect(constructions).toHaveLength(1)
  })
})

describe('prewarmAvatar cap & FIFO eviction', () => {
  // The implementation caps the dedupe set at PREWARM_AVATAR_CAP (2000) and
  // evicts the oldest entry when the cap would be exceeded. We can verify
  // both invariants without exposing the constant by overflowing it and
  // checking that an evicted URL re-fetches while a recent one does not.

  test('does not grow unbounded and evicts FIFO when full', () => {
    // Use a unique prefix so this test is independent of the rest.
    const prefix = 'https://example.test/avatar/cap/'
    const cap = 2000

    // Fill the cap.
    for (let i = 0; i < cap; i++) prewarmAvatar(`${prefix}${i}`)
    expect(constructions).toHaveLength(cap)

    // Re-prewarming any of the same URLs is deduped.
    prewarmAvatar(`${prefix}0`)
    prewarmAvatar(`${prefix}${cap - 1}`)
    expect(constructions).toHaveLength(cap)

    // Pushing one MORE unique URL evicts the oldest (`${prefix}0`).
    prewarmAvatar(`${prefix}overflow`)
    expect(constructions).toHaveLength(cap + 1)

    // The evicted oldest URL is now considered "fresh" again — re-prewarming
    // it constructs a new Image. (This is the FIFO contract.)
    prewarmAvatar(`${prefix}0`)
    expect(constructions).toHaveLength(cap + 2)
    expect(constructions[constructions.length - 1].src).toBe(`${prefix}0`)

    // A URL still inside the cap window is still deduped.
    prewarmAvatar(`${prefix}${cap - 1}`)
    expect(constructions).toHaveLength(cap + 2)
  })
})
