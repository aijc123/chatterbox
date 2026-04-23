import { describe, expect, test } from 'bun:test'

import { formatMilliyuanAmount, formatMilliyuanBadgeAmount } from '../src/lib/custom-chat-pricing'

describe('custom chat pricing helpers', () => {
  test('formats low-price gifts with one decimal place', () => {
    expect(formatMilliyuanAmount(100)).toBe('¥0.1')
    expect(formatMilliyuanAmount(500)).toBe('¥0.5')
    expect(formatMilliyuanAmount(1000)).toBe('¥1')
  })

  test('formats badge values without duplicating the currency symbol', () => {
    expect(formatMilliyuanBadgeAmount(100)).toBe('0.1元')
    expect(formatMilliyuanBadgeAmount(500)).toBe('0.5元')
    expect(formatMilliyuanBadgeAmount(1000)).toBe('1元')
  })
})
