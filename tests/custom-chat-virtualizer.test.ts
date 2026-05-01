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
})
