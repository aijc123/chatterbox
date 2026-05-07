/**
 * Unit tests for the ShadowBypassChip's pure helpers.
 *
 * Hook-using rendering of the component itself can't run in bun-test (no real
 * DOM / preact render context), so the visibility predicate and viewport
 * placement math are factored out as pure functions and exercised here.
 */

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

const { SHADOW_CHIP_RECENT_WINDOW_MS, computeChipPlacement, findComposerAnchor, obsKey, pickActiveObservation } =
  await import('../src/components/shadow-bypass-chip')

describe('pickActiveObservation', () => {
  const now = 1_000_000

  test('returns null when no observations', () => {
    expect(pickActiveObservation([], new Set(), now)).toBeNull()
  })

  test('returns null when observation has empty candidates', () => {
    const result = pickActiveObservation([{ text: 'hi', ts: now, candidates: [] }], new Set(), now)
    expect(result).toBeNull()
  })

  test('returns null when observation is older than the window', () => {
    const result = pickActiveObservation(
      [
        {
          text: 'old',
          ts: now - SHADOW_CHIP_RECENT_WINDOW_MS - 1,
          candidates: [{ strategy: 'kou', label: '口', text: 'o口l口d' }],
        },
      ],
      new Set(),
      now
    )
    expect(result).toBeNull()
  })

  test('returns the only fresh observation', () => {
    const result = pickActiveObservation(
      [
        {
          text: '习近平',
          roomId: 12345,
          ts: now,
          candidates: [{ strategy: 'kou', label: '口', text: '习口近口平' }],
        },
      ],
      new Set(),
      now
    )
    expect(result?.text).toBe('习近平')
  })

  test('picks the most recent fresh observation when several qualify', () => {
    const result = pickActiveObservation(
      [
        {
          text: 'older',
          ts: now - 5_000,
          candidates: [{ strategy: 'kou', label: '口', text: 'x' }],
        },
        {
          text: 'newer',
          ts: now,
          candidates: [{ strategy: 'kou', label: '口', text: 'y' }],
        },
      ],
      new Set(),
      now
    )
    expect(result?.text).toBe('newer')
  })

  test('skips dismissed observations', () => {
    const result = pickActiveObservation(
      [
        {
          text: 'dismissed',
          roomId: 1,
          ts: now,
          candidates: [{ strategy: 'kou', label: '口', text: 'x' }],
        },
        {
          text: 'visible',
          roomId: 1,
          ts: now - 10,
          candidates: [{ strategy: 'kou', label: '口', text: 'y' }],
        },
      ],
      new Set([obsKey('dismissed', 1)]),
      now
    )
    expect(result?.text).toBe('visible')
  })

  test('uses (text, roomId) tuple for dismissal — same text in another room is unaffected', () => {
    const dismissed = new Set([obsKey('foo', 1)])
    const result = pickActiveObservation(
      [{ text: 'foo', roomId: 2, ts: now, candidates: [{ strategy: 'kou', label: '口', text: 'x' }] }],
      dismissed,
      now
    )
    expect(result?.text).toBe('foo')
    expect(result?.roomId).toBe(2)
  })
})

describe('computeChipPlacement', () => {
  const viewport = { innerWidth: 1280, innerHeight: 720 }

  test('places chip ABOVE the anchor when there is room', () => {
    const anchor = { top: 600, bottom: 640, left: 20, width: 200 }
    const placement = computeChipPlacement(anchor, viewport, 3)
    // chip ends at anchor.top - gap (chip_gap=6); top = 600 - 6 - estimatedHeight
    expect(placement.top).toBeLessThan(anchor.top)
  })

  test('falls back BELOW the anchor when there is not enough room above', () => {
    const anchor = { top: 30, bottom: 70, left: 20, width: 200 }
    const placement = computeChipPlacement(anchor, viewport, 4)
    // Above would push top<8; falls below.
    expect(placement.top).toBeGreaterThanOrEqual(anchor.bottom)
  })

  test('clamps width to CHIP_MAX_WIDTH=420 even when anchor is wider', () => {
    const anchor = { top: 600, bottom: 640, left: 20, width: 800 }
    const placement = computeChipPlacement(anchor, viewport, 3)
    expect(placement.width).toBe(420)
  })

  test('floors width at 260px even when anchor is narrower', () => {
    const anchor = { top: 600, bottom: 640, left: 20, width: 100 }
    const placement = computeChipPlacement(anchor, viewport, 3)
    expect(placement.width).toBe(260)
  })

  test('shifts left so the chip never escapes off the right edge', () => {
    const anchor = { top: 600, bottom: 640, left: 1100, width: 200 }
    const placement = computeChipPlacement(anchor, viewport, 3)
    expect(placement.left + placement.width).toBeLessThanOrEqual(viewport.innerWidth - 8)
  })

  test('clamps top to keep chip on screen when viewport is short', () => {
    const shortViewport = { innerWidth: 1280, innerHeight: 200 }
    const anchor = { top: 100, bottom: 140, left: 20, width: 200 }
    const placement = computeChipPlacement(anchor, shortViewport, 5)
    expect(placement.top).toBeGreaterThanOrEqual(8)
    expect(placement.top).toBeLessThan(shortViewport.innerHeight)
  })
})

describe('findComposerAnchor', () => {
  type FakeEl = {
    offsetParent: object | null
    getClientRects: () => DOMRect[]
    getBoundingClientRect: () => DOMRect
  }

  const visibleRect: DOMRect = {
    top: 600,
    bottom: 640,
    left: 20,
    right: 220,
    width: 200,
    height: 40,
    x: 20,
    y: 600,
    toJSON: () => ({}),
  }

  function makeVisible(): FakeEl {
    return {
      offsetParent: {},
      getClientRects: () => [{ width: 200, height: 40 } as DOMRect],
      getBoundingClientRect: () => visibleRect,
    }
  }

  function makeHidden(): FakeEl {
    return {
      offsetParent: null,
      getClientRects: () => [],
      getBoundingClientRect: () =>
        ({
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    }
  }

  function fakeDoc(map: Record<string, FakeEl | null>): { querySelector: (sel: string) => FakeEl | null } {
    return {
      querySelector(sel: string) {
        // Map by partial selector match — supports the comma-joined native
        // selector by checking whether ANY listed selector key is contained.
        for (const [k, v] of Object.entries(map)) {
          if (sel.includes(k)) return v
        }
        return null
      },
    }
  }

  test('returns null when no selector matches', () => {
    const doc = fakeDoc({})
    expect(findComposerAnchor(doc as unknown as Document)).toBeNull()
  })

  test("returns 'custom-chat' when the Chatterbox composer is visible", () => {
    const doc = fakeDoc({ '#laplace-custom-chat textarea': makeVisible() })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('custom-chat')
    expect(result?.rect.width).toBe(200)
  })

  test("returns 'native' when only B站 native composer matches", () => {
    const doc = fakeDoc({ '.chat-control-panel-vm textarea': makeVisible() })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('native')
  })

  test("returns 'send-tab' as last fallback", () => {
    const doc = fakeDoc({ '[data-cb-send-tab-textarea]': makeVisible() })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('send-tab')
  })

  test('priority: Chatterbox > native > send-tab when multiple are visible', () => {
    const doc = fakeDoc({
      '#laplace-custom-chat textarea': makeVisible(),
      '.chat-control-panel-vm textarea': makeVisible(),
      '[data-cb-send-tab-textarea]': makeVisible(),
    })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('custom-chat')
  })

  test('falls through to next selector when an earlier match is hidden (display:none)', () => {
    const doc = fakeDoc({
      '#laplace-custom-chat textarea': makeHidden(), // hidden custom chat
      '.chat-control-panel-vm textarea': makeVisible(), // visible native
    })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('native')
  })

  test('rejects elements with zero rect even if offsetParent is non-null', () => {
    const zeroRect: FakeEl = {
      offsetParent: {},
      getClientRects: () => [{ width: 0, height: 0 } as DOMRect],
      getBoundingClientRect: () =>
        ({
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    }
    const doc = fakeDoc({
      '#laplace-custom-chat textarea': zeroRect,
      '[data-cb-send-tab-textarea]': makeVisible(),
    })
    const result = findComposerAnchor(doc as unknown as Document)
    expect(result?.source).toBe('send-tab')
  })
})

describe('obsKey', () => {
  test('uses NUL byte separator so colons in text/roomId never collide', () => {
    const a = obsKey('foo', 1)
    const b = obsKey('foo:1', undefined) // skipcq: JS-W1042
    expect(a).not.toBe(b)
    expect(a.includes('\x00')).toBe(true)
  })

  test('treats undefined roomId as global', () => {
    expect(obsKey('foo', undefined)).toContain('global') // skipcq: JS-W1042
  })
})
