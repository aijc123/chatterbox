import { describe, expect, test } from 'bun:test'

import { parsePositiveRoomId, shouldIncludeSbhzmSource } from '../server/src/lib/room-sources'

describe('server room-sources helpers', () => {
  test('parsePositiveRoomId accepts positive numeric room ids', () => {
    expect(parsePositiveRoomId('1713546334')).toBe(1713546334)
  })

  test('parsePositiveRoomId rejects missing or non-positive room ids', () => {
    expect(parsePositiveRoomId(null)).toBeNull()
    expect(parsePositiveRoomId('not-a-room')).toBeNull()
    expect(parsePositiveRoomId('0')).toBeNull()
    expect(parsePositiveRoomId('-1')).toBeNull()
  })

  test('shouldIncludeSbhzmSource gates the default all-source view by room', () => {
    expect(shouldIncludeSbhzmSource('all', 1713546334)).toBe(true)
    expect(shouldIncludeSbhzmSource('all', 12345)).toBe(false)
    expect(shouldIncludeSbhzmSource('all', null)).toBe(false)
  })

  test('shouldIncludeSbhzmSource allows explicit SBHZM source debugging', () => {
    expect(shouldIncludeSbhzmSource('sbhzm', 12345)).toBe(true)
    expect(shouldIncludeSbhzmSource('sbhzm', null)).toBe(true)
  })

  test('shouldIncludeSbhzmSource rejects unrelated source filters', () => {
    expect(shouldIncludeSbhzmSource('laplace', 1713546334)).toBe(false)
    expect(shouldIncludeSbhzmSource('cb', 1713546334)).toBe(false)
  })
})
