import { describe, expect, test } from 'bun:test'

import { calculateVirtualRange } from '../src/lib/custom-chat-virtualizer'

describe('custom chat virtualizer', () => {
  test('calculates overscanned visible range', () => {
    const range = calculateVirtualRange({
      itemCount: 10,
      scrollTop: 120,
      viewportHeight: 100,
      overscan: 1,
      rowHeight: () => 50,
    })

    expect(range).toEqual({
      start: 1,
      end: 6,
      top: 50,
      bottom: 300,
      total: 500,
    })
  })

  test('handles variable row heights with binary-search range lookup', () => {
    const heights = [40, 80, 30, 120, 50]
    const range = calculateVirtualRange({
      itemCount: heights.length,
      scrollTop: 85,
      viewportHeight: 90,
      overscan: 1,
      rowHeight: index => heights[index] ?? 0,
    })

    expect(range).toEqual({
      start: 0,
      end: 5,
      top: 0,
      bottom: 320,
      total: 320,
    })
  })
})
