// Regression tests for the H-sec audit fix: the Guard Room sync endpoint is
// user-typed and previously normalized only with `trim().replace(/\/+$/, '')`,
// so a typo or attacker-controlled value would exfiltrate the watchlist + sync
// key over plaintext or to a non-http(s) destination.

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { normalizeGuardRoomEndpoint } = await import('../src/lib/guard-room-sync')

describe('normalizeGuardRoomEndpoint', () => {
  test('accepts https endpoints and strips trailing slashes', () => {
    expect(normalizeGuardRoomEndpoint('https://bilibili-guard-room.vercel.app')).toBe(
      'https://bilibili-guard-room.vercel.app'
    )
    expect(normalizeGuardRoomEndpoint('https://bilibili-guard-room.vercel.app/')).toBe(
      'https://bilibili-guard-room.vercel.app'
    )
    expect(normalizeGuardRoomEndpoint('  https://bilibili-guard-room.vercel.app///  ')).toBe(
      'https://bilibili-guard-room.vercel.app'
    )
  })

  test('accepts http only for loopback hosts', () => {
    expect(normalizeGuardRoomEndpoint('http://localhost:3000')).toBe('http://localhost:3000')
    expect(normalizeGuardRoomEndpoint('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080')
    expect(normalizeGuardRoomEndpoint('http://[::1]:8080')).toBe('http://[::1]:8080')
  })

  test('rejects http for non-loopback hosts (would expose sync key + watchlist)', () => {
    expect(normalizeGuardRoomEndpoint('http://attacker.example.com')).toBe('')
    expect(normalizeGuardRoomEndpoint('http://bilibili-guard-room.vercel.app')).toBe('')
  })

  test('rejects non-http(s) schemes', () => {
    expect(normalizeGuardRoomEndpoint('javascript:alert(1)')).toBe('')
    expect(normalizeGuardRoomEndpoint('file:///etc/passwd')).toBe('')
    expect(normalizeGuardRoomEndpoint('data:text/plain,leak')).toBe('')
    expect(normalizeGuardRoomEndpoint('ws://example.com')).toBe('')
  })

  test('rejects unparseable input', () => {
    expect(normalizeGuardRoomEndpoint('')).toBe('')
    expect(normalizeGuardRoomEndpoint('   ')).toBe('')
    expect(normalizeGuardRoomEndpoint('not a url')).toBe('')
    expect(normalizeGuardRoomEndpoint('//missing-scheme.example.com')).toBe('')
  })
})
