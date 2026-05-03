import { describe, expect, test } from 'vitest'

import { parsePositiveRoomId, shouldIncludeSbhzmSource } from './room-sources'

describe('parsePositiveRoomId', () => {
  test('returns a positive room id from query text', () => {
    expect(parsePositiveRoomId('1713546334')).toBe(1713546334)
  })

  test('returns null for missing, invalid, zero, or negative room ids', () => {
    expect(parsePositiveRoomId(null)).toBeNull()
    expect(parsePositiveRoomId('not-a-room')).toBeNull()
    expect(parsePositiveRoomId('0')).toBeNull()
    expect(parsePositiveRoomId('-1')).toBeNull()
  })
})

describe('shouldIncludeSbhzmSource', () => {
  test('includes SBHZM in the default view only for the registered room', () => {
    expect(shouldIncludeSbhzmSource('all', 1713546334)).toBe(true)
    expect(shouldIncludeSbhzmSource('all', 12345)).toBe(false)
    expect(shouldIncludeSbhzmSource('all', null)).toBe(false)
  })

  test('keeps explicit source=sbhzm available for source-specific debugging', () => {
    expect(shouldIncludeSbhzmSource('sbhzm', 12345)).toBe(true)
    expect(shouldIncludeSbhzmSource('sbhzm', null)).toBe(true)
  })

  test('does not include SBHZM for other source filters', () => {
    expect(shouldIncludeSbhzmSource('laplace', 1713546334)).toBe(false)
    expect(shouldIncludeSbhzmSource('cb', 1713546334)).toBe(false)
  })
})
