/**
 * DOM-level tests for the avatar perf path:
 *   - createAvatar (cache-hit / cache-miss / no-url / error branches)
 *   - bootstrapPrewarmFromNative (selector + cap + dispatch)
 *   - ensureAvatarPreconnect (idempotency + correct hosts)
 *
 * These exercise real DOM behavior via happy-dom rather than hand-rolled
 * stubs, so the listener cleanup pattern (addRootEventListener / AbortSignal)
 * and the property semantics of HTMLImageElement are honored.
 */

import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  Event: happyWindow.Event,
  HTMLElement: happyWindow.HTMLElement,
  HTMLImageElement: happyWindow.HTMLImageElement,
  window: happyWindow,
})

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { CustomChatEvent } from '../src/lib/custom-chat-events'

import { bootstrapPrewarmFromNative, createAvatar, ensureAvatarPreconnect } from '../src/lib/custom-chat-dom'

// Track Image() constructions globally so we can assert that
// bootstrapPrewarmFromNative actually fires prewarm for each scraped URL.
interface StubImage {
  src: string
  decoding: string
  decodeCalls: number
}
const imageConstructions: StubImage[] = []

// happy-dom provides a working HTMLImageElement, but we still need to
// observe `new Image()` from prewarmAvatar. We replace the global Image
// constructor with our recording stub. happy-dom's document still uses
// its own internal HTMLImageElement for `document.createElement('img')`.
const happyDomImage = (globalThis as { Image: typeof Image }).Image

class RecordingImage implements StubImage {
  src = ''
  decoding = ''
  referrerPolicy = ''
  decodeCalls = 0

  constructor() {
    imageConstructions.push(this)
  }

  decode(): Promise<void> {
    this.decodeCalls++
    return Promise.resolve()
  }
}

beforeEach(() => {
  imageConstructions.length = 0
  ;(globalThis as { Image: unknown }).Image = RecordingImage
  // Reset document head/body between tests so preconnect / prewarm scrapes
  // don't bleed into each other.
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

afterEach(() => {
  ;(globalThis as { Image: unknown }).Image = happyDomImage
})

// ─── createAvatar ────────────────────────────────────────────────────────────

function event(over: Partial<CustomChatEvent> = {}): CustomChatEvent {
  return {
    id: 'evt',
    kind: 'danmaku',
    text: 'hi',
    uname: 'alice',
    uid: '42',
    time: '11:19',
    isReply: false,
    source: 'ws',
    badges: [],
    ...over,
  }
}

describe('createAvatar', () => {
  test('renders fallback wrap with initial when no avatar URL is resolvable', () => {
    const wrap = createAvatar(event({ uid: null, avatarUrl: undefined, uname: 'Zoe' }))

    expect(wrap.tagName).toBe('DIV')
    expect(wrap.classList.contains('lc-chat-avatar')).toBe(true)
    expect(wrap.classList.contains('lc-chat-avatar-fallback')).toBe(true)
    expect(wrap.textContent).toBe('Z')
    expect(wrap.querySelector('img')).toBeNull()
  })

  test('appends an <img> child with sync decoding when avatar URL exists', () => {
    const wrap = createAvatar(event({ avatarUrl: 'https://workers.vrp.moe/bilibili/avatar/42?size=96' }))
    const img = wrap.querySelector('img')

    expect(img).not.toBeNull()
    expect(img?.classList.contains('lc-chat-avatar-img')).toBe(true)
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img?.decoding).toBe('sync')
    expect(img?.src).toBe('https://workers.vrp.moe/bilibili/avatar/42?size=96')
    // Wrap still carries the initial as a fallback under the img.
    expect(wrap.textContent?.startsWith('A')).toBe(true)
  })

  test('falls back to UID-derived URL when message.avatarUrl is absent', () => {
    const wrap = createAvatar(event({ avatarUrl: undefined, uid: '999' }))
    const img = wrap.querySelector('img')

    expect(img?.src).toBe('https://workers.vrp.moe/bilibili/avatar/999?size=96')
  })

  test('marks data-loaded BEFORE mount when the image is already cached', () => {
    // Force every <img> the function constructs to report itself as
    // already-loaded, mimicking a browser cache hit produced by prewarm.
    const completeDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete')
    const widthDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')
    const heightDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight')
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true })
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 96 })
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', { configurable: true, get: () => 96 })

    try {
      const wrap = createAvatar(event({ avatarUrl: 'https://example.test/cache-hit?size=96' }))
      const img = wrap.querySelector('img')
      // The data-loaded flag must be set on the element BEFORE it is mounted
      // into the document — that's what suppresses the fade-in transition
      // for cache-hit avatars (per CSS Transitions spec).
      expect(img?.dataset.loaded).toBe('1')
    } finally {
      if (completeDesc) Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDesc)
      if (widthDesc) Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', widthDesc)
      if (heightDesc) Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', heightDesc)
    }
  })

  test('does NOT mark data-loaded when the image has not yet loaded', () => {
    const wrap = createAvatar(event({ avatarUrl: 'https://example.test/cache-miss?size=96' }))
    const img = wrap.querySelector('img')

    // happy-dom's HTMLImageElement reports complete=false until a load event
    // is dispatched, so this exercises the cache-miss branch naturally.
    expect(img?.dataset.loaded).toBeUndefined()
  })

  test('sets data-loaded when load event fires for the cache-miss branch', async () => {
    const wrap = createAvatar(event({ avatarUrl: 'https://example.test/cache-miss-2?size=96' }))
    const img = wrap.querySelector('img')
    if (!(img instanceof HTMLImageElement)) throw new Error('Expected createAvatar to render an img')

    // Without the listener, data-loaded stays unset.
    expect(img.dataset.loaded).toBeUndefined()

    img.dispatchEvent(new Event('load'))

    expect(img.getAttribute('data-loaded')).toBe('1')
  })

  test('removes the img on error so the fallback initial stays visible', () => {
    const wrap = createAvatar(event({ avatarUrl: 'https://example.test/will-404?size=96' }))
    const img = wrap.querySelector('img')
    if (!(img instanceof HTMLImageElement)) throw new Error('Expected createAvatar to render an img')

    img.dispatchEvent(new Event('error'))

    expect(wrap.querySelector('img')).toBeNull()
    // Wrap still carries fallback class and initial.
    expect(wrap.classList.contains('lc-chat-avatar-fallback')).toBe(true)
    expect(wrap.textContent).toBe('A')
  })
})

// ─── bootstrapPrewarmFromNative ──────────────────────────────────────────────

describe('bootstrapPrewarmFromNative', () => {
  function nativeChatNode(avatarUrl: string): HTMLElement {
    const el = document.createElement('div')
    el.className = 'chat-item'
    const img = document.createElement('img')
    img.className = 'avatar'
    img.src = avatarUrl
    el.appendChild(img)
    return el
  }

  test('feeds each scraped avatar URL into prewarm exactly once', () => {
    const container = document.createElement('div')
    container.appendChild(nativeChatNode('https://i0.hdslb.com/bfs/face/aaa.jpg'))
    container.appendChild(nativeChatNode('https://i0.hdslb.com/bfs/face/bbb.jpg'))
    container.appendChild(nativeChatNode('https://i0.hdslb.com/bfs/face/ccc.jpg'))

    bootstrapPrewarmFromNative(container)

    const fired = imageConstructions.map(i => i.src).sort()
    expect(fired).toEqual([
      'https://i0.hdslb.com/bfs/face/aaa.jpg',
      'https://i0.hdslb.com/bfs/face/bbb.jpg',
      'https://i0.hdslb.com/bfs/face/ccc.jpg',
    ])
  })

  test('skips chat nodes whose img has no avatar-like class', () => {
    const container = document.createElement('div')
    const node = document.createElement('div')
    node.className = 'chat-item'
    const img = document.createElement('img')
    img.className = 'gift-thumbnail'
    img.src = 'https://i0.hdslb.com/bfs/gift/some.png'
    node.appendChild(img)
    container.appendChild(node)

    bootstrapPrewarmFromNative(container)

    expect(imageConstructions).toHaveLength(0)
  })

  test('caps iteration at MAX_NATIVE_INITIAL_SCAN (80)', () => {
    const container = document.createElement('div')
    for (let i = 0; i < 120; i++) {
      container.appendChild(nativeChatNode(`https://i0.hdslb.com/bfs/face/cap-${i}.jpg`))
    }

    bootstrapPrewarmFromNative(container)

    // The cap is 80; everything beyond that is skipped.
    expect(imageConstructions.length).toBe(80)
  })

  test('is a no-op for an empty container', () => {
    bootstrapPrewarmFromNative(document.createElement('div'))
    expect(imageConstructions).toHaveLength(0)
  })
})

// ─── ensureAvatarPreconnect ──────────────────────────────────────────────────

describe('ensureAvatarPreconnect', () => {
  test('injects preconnect links for both avatar hosts', () => {
    ensureAvatarPreconnect()

    const links = Array.from(document.head.querySelectorAll('link[rel="preconnect"]'))
    const hrefs = links.map(l => l.getAttribute('href')).sort()
    expect(hrefs).toEqual(['https://i0.hdslb.com', 'https://workers.vrp.moe'])
  })

  test('is idempotent — second call does not duplicate the links', () => {
    ensureAvatarPreconnect()
    ensureAvatarPreconnect()
    ensureAvatarPreconnect()

    const links = document.head.querySelectorAll('link[rel="preconnect"]')
    expect(links.length).toBe(2)
  })

  test('uses stable IDs so an existing tag is detected and reused', () => {
    ensureAvatarPreconnect()
    const initial = Array.from(document.head.querySelectorAll('link[rel="preconnect"]')).map(l => l.id)

    ensureAvatarPreconnect()
    const after = Array.from(document.head.querySelectorAll('link[rel="preconnect"]')).map(l => l.id)

    expect(initial).toEqual(after)
    expect(initial.every(id => id.length > 0)).toBe(true)
  })
})
