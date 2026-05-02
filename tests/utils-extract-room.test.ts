// Regression tests for the C2 audit fix: `extractRoomNumber` previously
// returned the first numeric path segment for ANY URL, so non-room paths like
// /p/eden/area-tags/12345 were treated as room 12345.

import { describe, expect, test } from 'bun:test'

import { extractRoomNumber } from '../src/lib/utils'

describe('extractRoomNumber', () => {
  test('parses canonical live room URLs', () => {
    expect(extractRoomNumber('https://live.bilibili.com/12345')).toBe('12345')
    expect(extractRoomNumber('https://live.bilibili.com/12345/')).toBe('12345')
    expect(extractRoomNumber('https://live.bilibili.com/12345?broadcast_type=0')).toBe('12345')
    expect(extractRoomNumber('https://live.bilibili.com/12345#anchor')).toBe('12345')
  })

  test('parses /blanc and /h5 popout shapes', () => {
    expect(extractRoomNumber('https://live.bilibili.com/blanc/12345')).toBe('12345')
    expect(extractRoomNumber('https://live.bilibili.com/h5/12345')).toBe('12345')
  })

  test('rejects non-room paths that contain numeric segments', () => {
    expect(extractRoomNumber('https://live.bilibili.com/p/eden/area-tags/12345')).toBeUndefined()
    expect(extractRoomNumber('https://live.bilibili.com/p/eden/area-tags/12345/')).toBeUndefined()
    expect(extractRoomNumber('https://live.bilibili.com/some/12345/extra')).toBeUndefined()
  })

  test('rejects non-live hosts', () => {
    expect(extractRoomNumber('https://www.bilibili.com/12345')).toBeUndefined()
    expect(extractRoomNumber('https://space.bilibili.com/12345')).toBeUndefined()
    expect(extractRoomNumber('https://attacker.example.com/12345')).toBeUndefined()
  })

  test('rejects roots and non-numeric paths', () => {
    expect(extractRoomNumber('https://live.bilibili.com/')).toBeUndefined()
    expect(extractRoomNumber('https://live.bilibili.com/notanumber')).toBeUndefined()
    expect(extractRoomNumber('https://live.bilibili.com/blanc/')).toBeUndefined()
  })
})
