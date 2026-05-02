import { describe, expect, test } from 'bun:test'

import {
  ANCHOR_OFFSET,
  computePos,
  PICKER_GAP,
  PICKER_H,
  PICKER_W,
  type PickerRect,
} from '../src/lib/emote-picker-position'

// Realistic Bilibili Live right-rail viewport — chat panel sits in the right
// half of a 1920-wide window. The composer is anchored near the bottom.
const VW = 1920
const VH = 1080

function rect(left: number, top: number, width = 28, height = 28): PickerRect {
  return { left, top, right: left + width, bottom: top + height }
}

describe('emote picker positioning (computePos)', () => {
  test('returns a safe corner fallback when the anchor is missing', () => {
    expect(computePos(null, VW, VH)).toEqual({ bottom: PICKER_GAP, right: PICKER_GAP })
  })

  test('opens above the anchor when there is enough headroom', () => {
    // Anchor at bottom of viewport, well below PICKER_H.
    const pos = computePos(rect(1700, 1000), VW, VH)
    expect(pos.bottom).toBeGreaterThan(0)
    expect(pos.top).toBeUndefined()
    // bottom = vh - rect.top + ANCHOR_OFFSET = 1080 - 1000 + 4 = 84
    expect(pos.bottom).toBe(VH - 1000 + ANCHOR_OFFSET)
  })

  test('flips to below the anchor when there is not enough headroom above', () => {
    // Anchor at top of viewport — picker would overflow upward.
    const pos = computePos(rect(1700, 50), VW, VH)
    expect(pos.bottom).toBeUndefined()
    expect(pos.top).toBe(50 + 28 + ANCHOR_OFFSET)
  })

  test('uses bottom-anchor exactly at the headroom threshold', () => {
    // rect.top === PICKER_H + PICKER_GAP — boundary uses >= so this fits above.
    const pos = computePos(rect(1700, PICKER_H + PICKER_GAP), VW, VH)
    expect(pos.bottom).toBeDefined()
    expect(pos.top).toBeUndefined()
  })

  test('falls back to top-anchor one pixel below the headroom threshold', () => {
    const pos = computePos(rect(1700, PICKER_H + PICKER_GAP - 1), VW, VH)
    expect(pos.top).toBeDefined()
    expect(pos.bottom).toBeUndefined()
  })

  test('right-aligns the picker under a button that has room to its left', () => {
    // Anchor's right edge well past PICKER_W from the viewport left.
    const pos = computePos(rect(1700, 1000), VW, VH)
    expect(pos.right).toBe(VW - 1728)
    expect(pos.left).toBeUndefined()
  })

  test('flips to left-align when the anchor sits too close to the left edge', () => {
    // Anchor near left → right-aligning would push the popup off-screen.
    const pos = computePos(rect(40, 1000), VW, VH)
    expect(pos.right).toBeUndefined()
    expect(pos.left).toBe(40)
  })

  test('uses right-align exactly at the horizontal threshold', () => {
    // rect.right === PICKER_W + PICKER_GAP — boundary uses >= so right wins.
    const pos = computePos(rect(PICKER_W + PICKER_GAP - 28, 1000, 28, 28), VW, VH)
    expect(pos.right).toBeDefined()
    expect(pos.left).toBeUndefined()
  })

  test('clamps right offset to PICKER_GAP when the anchor extends past the viewport', () => {
    // Anchor's right edge past viewport right (e.g. zoom / scroll edge case).
    const pos = computePos(rect(VW - 10, 1000), VW, VH)
    expect(pos.right ?? -1).toBeGreaterThanOrEqual(PICKER_GAP)
  })

  test('clamps left offset to PICKER_GAP when the anchor sits past the left edge', () => {
    // Anchor's left edge slightly negative (overflow scrolled).
    const pos = computePos(rect(-5, 1000), VW, VH)
    expect(pos.left ?? -1).toBeGreaterThanOrEqual(PICKER_GAP)
  })

  test('top + bottom never coexist; left + right never coexist', () => {
    const cases: PickerRect[] = [rect(40, 50), rect(40, 1000), rect(1700, 50), rect(1700, 1000)]
    for (const r of cases) {
      const pos = computePos(r, VW, VH)
      expect(pos.top !== undefined && pos.bottom !== undefined).toBe(false)
      expect(pos.left !== undefined && pos.right !== undefined).toBe(false)
      expect(pos.top !== undefined || pos.bottom !== undefined).toBe(true)
      expect(pos.left !== undefined || pos.right !== undefined).toBe(true)
    }
  })

  test('exposed dimensions match the picker component constants', () => {
    expect(PICKER_W).toBe(320)
    expect(PICKER_H).toBe(360)
    expect(PICKER_GAP).toBeGreaterThan(0)
    expect(ANCHOR_OFFSET).toBeGreaterThan(0)
  })
})
