/**
 * Unit coverage for `fetch-hijack-helpers.ts`. The helpers themselves
 * are pure (predicate + JSON mutator) plus two thin DOM operations
 * (banner inject / remove) that are easy to drive under happy-dom.
 *
 * The orchestrator in `fetch-hijack.ts` is NOT imported here — it
 * patches `Response.prototype` at module load and would pollute every
 * other test isolate per docs/coverage-policy.md.
 */

import { Window } from 'happy-dom'

const happyWindow = new Window()
// happy-dom's selector parser constructs `this.window.SyntaxError` when it
// rejects a selector — including, defensively, on some valid ones. The
// constructor isn't on the synthesized Window by default, so without this
// assignment any querySelectorAll call would `TypeError` instead of behaving
// like a real DOM. (See tests/custom-chat-avatar-dom.test.ts for the same
// shim.)
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  Element: happyWindow.Element,
  Node: happyWindow.Node,
  window: happyWindow,
})

import { beforeEach, describe, expect, test } from 'bun:test'

import {
  ACC_RELATION_PATTERN,
  applyTransforms,
  GET_INFO_BY_USER_PATTERN,
  type HijackOpts,
  injectSpaceBlockBanner,
  removeSpaceBlockBanner,
  SPACE_BLOCK_BANNER_ID,
  shouldHijackUrl,
} from '../src/lib/fetch-hijack-helpers'

const LIVE_URL = `https://api.live.bilibili.com${GET_INFO_BY_USER_PATTERN}?room_id=1`
const SPACE_URL = `https://api.bilibili.com${ACC_RELATION_PATTERN}?mid=1`
const OTHER_URL = 'https://api.bilibili.com/x/web-interface/nav'

const ALL_ON: HijackOpts = { unlockForbidLive: true, unlockSpaceBlock: true }
const ALL_OFF: HijackOpts = { unlockForbidLive: false, unlockSpaceBlock: false }
const LIVE_ONLY: HijackOpts = { unlockForbidLive: true, unlockSpaceBlock: false }
const SPACE_ONLY: HijackOpts = { unlockForbidLive: false, unlockSpaceBlock: true }

describe('shouldHijackUrl', () => {
  test('matches live-room URL only when unlockForbidLive is enabled', () => {
    expect(shouldHijackUrl(LIVE_URL, LIVE_ONLY)).toBe(true)
    expect(shouldHijackUrl(LIVE_URL, SPACE_ONLY)).toBe(false)
    expect(shouldHijackUrl(LIVE_URL, ALL_OFF)).toBe(false)
    expect(shouldHijackUrl(LIVE_URL, ALL_ON)).toBe(true)
  })

  test('matches space-relation URL only when unlockSpaceBlock is enabled', () => {
    expect(shouldHijackUrl(SPACE_URL, SPACE_ONLY)).toBe(true)
    expect(shouldHijackUrl(SPACE_URL, LIVE_ONLY)).toBe(false)
    expect(shouldHijackUrl(SPACE_URL, ALL_OFF)).toBe(false)
    expect(shouldHijackUrl(SPACE_URL, ALL_ON)).toBe(true)
  })

  test('non-matching URL returns false regardless of flags', () => {
    expect(shouldHijackUrl(OTHER_URL, ALL_ON)).toBe(false)
    expect(shouldHijackUrl(OTHER_URL, ALL_OFF)).toBe(false)
  })

  test('empty URL returns false', () => {
    expect(shouldHijackUrl('', ALL_ON)).toBe(false)
  })
})

describe('applyTransforms — live branch', () => {
  test('mutates is_forbid:true → false and clears forbid_text', () => {
    const data = { data: { forbid_live: { is_forbid: true, forbid_text: '该直播间已被拉黑' } } }
    const result = applyTransforms(LIVE_URL, data, ALL_ON)
    expect(result).toEqual({ kind: 'live', wasBlocking: true })
    expect(data.data.forbid_live.is_forbid).toBe(false)
    expect(data.data.forbid_live.forbid_text).toBe('')
  })

  test('idempotent: re-running on already-cleared state reports no prior block', () => {
    const data = { data: { forbid_live: { is_forbid: false, forbid_text: '' } } }
    const result = applyTransforms(LIVE_URL, data, ALL_ON)
    expect(result).toEqual({ kind: 'live', wasBlocking: false })
    expect(data.data.forbid_live.is_forbid).toBe(false)
    expect(data.data.forbid_live.forbid_text).toBe('')
  })

  test('missing forbid_live: returns kind:live wasBlocking:false without throwing', () => {
    const data = { data: { something_else: 1 } }
    expect(() => applyTransforms(LIVE_URL, data, ALL_ON)).not.toThrow()
    expect(applyTransforms(LIVE_URL, data, ALL_ON)).toEqual({ kind: 'live', wasBlocking: false })
  })

  test('feature off: returns kind:null and does not mutate', () => {
    const data = { data: { forbid_live: { is_forbid: true, forbid_text: 'blocked' } } }
    const result = applyTransforms(LIVE_URL, data, SPACE_ONLY)
    expect(result).toEqual({ kind: null })
    expect(data.data.forbid_live.is_forbid).toBe(true)
    expect(data.data.forbid_live.forbid_text).toBe('blocked')
  })
})

describe('applyTransforms — space branch', () => {
  test('attribute === 128 → mutated to 0, wasBlocking:true', () => {
    const data = { data: { be_relation: { attribute: 128 } } }
    const result = applyTransforms(SPACE_URL, data, ALL_ON)
    expect(result).toEqual({ kind: 'space', wasBlocking: true })
    expect(data.data.be_relation.attribute).toBe(0)
  })

  test('attribute === 0 → no mutation, wasBlocking:false', () => {
    const data = { data: { be_relation: { attribute: 0 } } }
    const result = applyTransforms(SPACE_URL, data, ALL_ON)
    expect(result).toEqual({ kind: 'space', wasBlocking: false })
    expect(data.data.be_relation.attribute).toBe(0)
  })

  test('attribute is non-128 sentinel → no mutation, wasBlocking:false', () => {
    const data = { data: { be_relation: { attribute: 64 } } }
    const result = applyTransforms(SPACE_URL, data, ALL_ON)
    expect(result).toEqual({ kind: 'space', wasBlocking: false })
    expect(data.data.be_relation.attribute).toBe(64)
  })

  test('missing be_relation → wasBlocking:false, no throw', () => {
    const data = { data: { something_else: 1 } }
    expect(applyTransforms(SPACE_URL, data, ALL_ON)).toEqual({ kind: 'space', wasBlocking: false })
  })

  test('be_relation is a primitive (string) → wasBlocking:false, no throw', () => {
    const data = { data: { be_relation: 'oops' } }
    expect(applyTransforms(SPACE_URL, data, ALL_ON)).toEqual({ kind: 'space', wasBlocking: false })
  })

  test('feature off: returns kind:null and does not mutate', () => {
    const data = { data: { be_relation: { attribute: 128 } } }
    const result = applyTransforms(SPACE_URL, data, LIVE_ONLY)
    expect(result).toEqual({ kind: null })
    expect(data.data.be_relation.attribute).toBe(128)
  })
})

describe('applyTransforms — defensive', () => {
  test.each([
    ['null', null],
    ['undefined', undefined],
    ['number', 42],
    ['string', 'oops'],
    ['boolean', true],
  ])('non-object data (%s) returns kind:null without throwing', (_label, data) => {
    expect(() => applyTransforms(SPACE_URL, data, ALL_ON)).not.toThrow()
    expect(applyTransforms(SPACE_URL, data, ALL_ON)).toEqual({ kind: null })
  })

  test('empty url returns kind:null', () => {
    expect(applyTransforms('', { data: {} }, ALL_ON)).toEqual({ kind: null })
  })

  test('non-matching url with all flags on returns kind:null', () => {
    expect(applyTransforms(OTHER_URL, { data: { forbid_live: { is_forbid: true } } }, ALL_ON)).toEqual({
      kind: null,
    })
  })

  test('cyclic data does not crash the live branch (we touch known fields only)', () => {
    // biome-ignore lint/suspicious/noExplicitAny: building intentional cycle for the test
    const inner: any = { is_forbid: true, forbid_text: 'x' }
    inner.self = inner
    const data = { data: { forbid_live: inner } }
    expect(() => applyTransforms(LIVE_URL, data, ALL_ON)).not.toThrow()
    expect(inner.is_forbid).toBe(false)
    expect(inner.forbid_text).toBe('')
  })
})

describe('injectSpaceBlockBanner / removeSpaceBlockBanner', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  test('injects a banner element with the expected id, content, and styling', () => {
    const header = document.createElement('div')
    header.className = 'header space-header'
    document.body.append(header)

    const banner = injectSpaceBlockBanner(header)

    expect(banner).not.toBeNull()
    expect(banner.id).toBe(SPACE_BLOCK_BANNER_ID)
    expect(banner.textContent).toContain('🔓')
    expect(banner.textContent).toContain('Chatterbox')
    expect(banner.style.cssText).toContain('background')
    expect(banner.style.cssText).toContain('width: 100%')
  })

  test('inserts the banner as a direct sibling AFTER the header', () => {
    const header = document.createElement('div')
    header.className = 'header space-header'
    document.body.append(header)

    injectSpaceBlockBanner(header)

    expect(header.nextElementSibling?.id).toBe(SPACE_BLOCK_BANNER_ID)
  })

  test('idempotent: a second injection returns the existing node and does not duplicate', () => {
    const header = document.createElement('div')
    header.className = 'header space-header'
    document.body.append(header)

    const first = injectSpaceBlockBanner(header)
    const second = injectSpaceBlockBanner(header)

    expect(second).toBe(first)
    expect(document.querySelectorAll(`#${SPACE_BLOCK_BANNER_ID}`).length).toBe(1)
  })

  test('removeSpaceBlockBanner removes a previously-injected element', () => {
    const header = document.createElement('div')
    header.className = 'header space-header'
    document.body.append(header)
    injectSpaceBlockBanner(header)

    expect(document.getElementById(SPACE_BLOCK_BANNER_ID)).not.toBeNull()
    removeSpaceBlockBanner()
    expect(document.getElementById(SPACE_BLOCK_BANNER_ID)).toBeNull()
  })

  test('removeSpaceBlockBanner is safe to call when nothing is present', () => {
    expect(() => removeSpaceBlockBanner()).not.toThrow()
    // And again, twice in a row.
    expect(() => removeSpaceBlockBanner()).not.toThrow()
  })
})
