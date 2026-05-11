/**
 * Tests for `prepareChatButton` and `normalizeWheelDelta` — small UI primitives
 * used by Chatterbox Chat. Pure (no module side effects), so we hit them
 * directly without any GM-store or DOM scaffolding.
 *
 * `normalizeWheelDelta` is the higher-stakes one: it converts a raw `WheelEvent`
 * into a clamped pixel delta the virtualizer uses to advance scroll position.
 * The mode-aware multipliers exist because Firefox emits `deltaMode === LINE`
 * while Chrome usually emits PIXEL; without normalization a single Firefox
 * notch would scroll past the end of a chat window.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { normalizeWheelDelta, prepareChatButton } from '../src/lib/custom-chat-interaction'

// ---------------------------------------------------------------------------
// happy-dom is preinstalled per package.json; under bun's test runner the
// global DOM ctor is sometimes missing. Provide a minimal stand-in that
// captures the same surface area we touch in `prepareChatButton`.
// ---------------------------------------------------------------------------

type MinimalButton = {
  type: string
  title: string
  attrs: Record<string, string>
  setAttribute: (name: string, value: string) => void
}

function makeButton(): MinimalButton {
  const attrs: Record<string, string> = {}
  return {
    type: '',
    title: '',
    attrs,
    setAttribute(name, value) {
      attrs[name] = value
    },
  }
}

describe('prepareChatButton', () => {
  test('sets type="button" so the surrounding <form> never auto-submits', () => {
    // Regression-worthy: leaving this off causes the parent shell's form to
    // post when the user hits Enter while the button is focused — would
    // navigate away from Bilibili Live.
    const btn = makeButton()
    prepareChatButton(btn as unknown as HTMLButtonElement, '复制')
    expect(btn.type).toBe('button')
  })

  test('sets both .title (tooltip) and aria-label (screen reader) to the same text', () => {
    const btn = makeButton()
    prepareChatButton(btn as unknown as HTMLButtonElement, '截图保存')
    expect(btn.title).toBe('截图保存')
    expect(btn.attrs['aria-label']).toBe('截图保存')
  })

  test('handles empty title without crashing (still emits aria-label="")', () => {
    const btn = makeButton()
    prepareChatButton(btn as unknown as HTMLButtonElement, '')
    expect(btn.title).toBe('')
    expect(btn.attrs['aria-label']).toBe('')
    expect(btn.type).toBe('button')
  })

  test('does not pollute other DOM attributes', () => {
    const btn = makeButton()
    prepareChatButton(btn as unknown as HTMLButtonElement, 'X')
    expect(Object.keys(btn.attrs)).toEqual(['aria-label'])
  })

  test('replaces a pre-existing title cleanly (idempotent for re-renders)', () => {
    const btn = makeButton()
    btn.title = 'old-title'
    btn.setAttribute('aria-label', 'old-aria')
    prepareChatButton(btn as unknown as HTMLButtonElement, 'new')
    expect(btn.title).toBe('new')
    expect(btn.attrs['aria-label']).toBe('new')
  })
})

// ---------------------------------------------------------------------------
// normalizeWheelDelta — we ensure the `WheelEvent` constants exist on the
// global so the function's `WheelEvent.DOM_DELTA_LINE` reads don't NaN out.
// ---------------------------------------------------------------------------

const RealWheelEvent = (globalThis as { WheelEvent?: typeof WheelEvent }).WheelEvent
const NEED_WHEELEVENT_SHIM = !RealWheelEvent

class WheelEventShim {
  static readonly DOM_DELTA_PIXEL = 0
  static readonly DOM_DELTA_LINE = 1
  static readonly DOM_DELTA_PAGE = 2
}

beforeAll(() => {
  if (NEED_WHEELEVENT_SHIM) {
    ;(globalThis as { WheelEvent?: unknown }).WheelEvent = WheelEventShim
  }
})

afterAll(() => {
  if (NEED_WHEELEVENT_SHIM) {
    ;(globalThis as { WheelEvent?: unknown }).WheelEvent = RealWheelEvent
  }
})

function makeWheelEvent(deltaY: number, deltaMode: number): WheelEvent {
  return { deltaY, deltaMode } as unknown as WheelEvent
}

describe('normalizeWheelDelta', () => {
  test('PIXEL mode passes deltaY through (clamped to ±140)', () => {
    expect(normalizeWheelDelta(makeWheelEvent(50, WheelEventShim.DOM_DELTA_PIXEL))).toBe(50)
    expect(normalizeWheelDelta(makeWheelEvent(-30, WheelEventShim.DOM_DELTA_PIXEL))).toBe(-30)
  })

  test('LINE mode multiplies by 18 (Firefox-style notches)', () => {
    // 3 lines * 18 = 54 — well under the 140 clamp.
    expect(normalizeWheelDelta(makeWheelEvent(3, WheelEventShim.DOM_DELTA_LINE))).toBe(54)
    expect(normalizeWheelDelta(makeWheelEvent(-2, WheelEventShim.DOM_DELTA_LINE))).toBe(-36)
  })

  test('PAGE mode multiplies by 180, hits the clamp', () => {
    // 1 page * 180 = 180 → clamped to 140.
    expect(normalizeWheelDelta(makeWheelEvent(1, WheelEventShim.DOM_DELTA_PAGE))).toBe(140)
    expect(normalizeWheelDelta(makeWheelEvent(-1, WheelEventShim.DOM_DELTA_PAGE))).toBe(-140)
  })

  test('clamps abnormally large pixel deltas to ±140', () => {
    // Some touchpads emit >1000 deltaY when the user flings hard. Without
    // clamping, the virtualizer scrolls past the end of the chat history.
    expect(normalizeWheelDelta(makeWheelEvent(9999, WheelEventShim.DOM_DELTA_PIXEL))).toBe(140)
    expect(normalizeWheelDelta(makeWheelEvent(-9999, WheelEventShim.DOM_DELTA_PIXEL))).toBe(-140)
  })

  test('returns 0 when deltaY is exactly 0 (no-op events still arrive on some hardware)', () => {
    expect(normalizeWheelDelta(makeWheelEvent(0, WheelEventShim.DOM_DELTA_PIXEL))).toBe(0)
  })

  test('returns 0 when deltaY is NaN (broken event from an extension)', () => {
    // The function guards with `Number.isFinite` before returning the value;
    // this prevents downstream RAF math from breaking once a single bad event
    // gets in.
    expect(normalizeWheelDelta(makeWheelEvent(Number.NaN, WheelEventShim.DOM_DELTA_PIXEL))).toBe(0)
  })

  test('returns 0 when deltaY is Infinity', () => {
    expect(normalizeWheelDelta(makeWheelEvent(Number.POSITIVE_INFINITY, WheelEventShim.DOM_DELTA_PIXEL))).toBe(0)
    expect(normalizeWheelDelta(makeWheelEvent(Number.NEGATIVE_INFINITY, WheelEventShim.DOM_DELTA_PIXEL))).toBe(0)
  })

  test('unknown deltaMode (forward-compat) falls through to the PIXEL multiplier=1', () => {
    // The function is implemented as ternary chain: LINE → 18, PAGE → 180,
    // else 1. So a future DOM4 mode value would behave like PIXEL.
    expect(normalizeWheelDelta(makeWheelEvent(50, 99))).toBe(50)
  })

  test('symmetry: f(-x) === -f(x) for representable inputs (no off-by-one in clamp)', () => {
    for (const dy of [1, 10, 50, 139, 140, 141, 1000]) {
      const pos = normalizeWheelDelta(makeWheelEvent(dy, WheelEventShim.DOM_DELTA_PIXEL))
      const neg = normalizeWheelDelta(makeWheelEvent(-dy, WheelEventShim.DOM_DELTA_PIXEL))
      expect(pos).toBe(-neg)
    }
  })

  test('boundary: exactly ±140 px is passed through unmodified', () => {
    expect(normalizeWheelDelta(makeWheelEvent(140, WheelEventShim.DOM_DELTA_PIXEL))).toBe(140)
    expect(normalizeWheelDelta(makeWheelEvent(-140, WheelEventShim.DOM_DELTA_PIXEL))).toBe(-140)
  })
})
