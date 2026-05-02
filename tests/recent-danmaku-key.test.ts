// Regression test for the M-fix: `recentDanmaku` previously keyed on
// `${uid}:${text}` which collided for inputs whose uid or text contained `:`.
// E.g. uid="1", text="2:hi" produced the same key as uid="1:2", text="hi".
// The fix uses `\x00` as the separator (cannot appear in either field).

import { describe, expect, mock, test } from 'bun:test'

const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_setValue: () => {},
  GM_info: { script: { version: 'test' } },
  unsafeWindow: globalThis,
}))

const { recentKey, parseAuthUid, computeReconnectDelay } = await import('../src/lib/live-ws-source')

describe('computeReconnectDelay (H-logic: jitter + cap)', () => {
  test('grows linearly with attempt count', () => {
    const a = computeReconnectDelay(0, () => 0)
    const b = computeReconnectDelay(1, () => 0)
    const c = computeReconnectDelay(5, () => 0)
    expect(a).toBe(3000)
    expect(b).toBe(5000)
    expect(c).toBe(13000)
  })

  test('caps the base at 30s', () => {
    expect(computeReconnectDelay(100, () => 0)).toBe(30_000)
    expect(computeReconnectDelay(1000, () => 0)).toBe(30_000)
  })

  test('adds jitter up to 25% of the base', () => {
    expect(computeReconnectDelay(0, () => 0)).toBe(3000)
    // random() = 0.999 → jitter ≈ floor(0.999 * 3000 * 0.25) = 749
    expect(computeReconnectDelay(0, () => 0.999)).toBe(3749)
  })

  test('different attempts with the same random produce different delays', () => {
    const x = computeReconnectDelay(2, () => 0.5)
    const y = computeReconnectDelay(3, () => 0.5)
    expect(y).toBeGreaterThan(x)
  })
})

describe('parseAuthUid (C1: precision-safe Bilibili LiveWS uid parsing)', () => {
  test('returns 0 for missing cookie', () => {
    expect(parseAuthUid(undefined)).toBe(0)
    expect(parseAuthUid(null)).toBe(0)
    expect(parseAuthUid('')).toBe(0)
  })

  test('parses normal Bilibili uids', () => {
    expect(parseAuthUid('12345678')).toBe(12345678)
    expect(parseAuthUid('1')).toBe(1)
  })

  test('falls back to anonymous on non-numeric input', () => {
    expect(parseAuthUid('not-a-number')).toBe(0)
    expect(parseAuthUid('NaN')).toBe(0)
    expect(parseAuthUid('1.5')).toBe(0)
  })

  test('falls back to anonymous on negative or out-of-range values', () => {
    expect(parseAuthUid('-1')).toBe(0)
    // Beyond Number.MAX_SAFE_INTEGER → fall back rather than send a
    // precision-lost number.
    expect(parseAuthUid('9007199254740993')).toBe(0)
  })
})

describe('recentKey collision-resistance', () => {
  test('uid and text with `:` characters produce distinct keys', () => {
    const a = recentKey('2:hi', '1')
    const b = recentKey('hi', '1:2')
    expect(a).not.toBe(b)
  })

  test('null uid does not collide with the literal string "null"', () => {
    const a = recentKey('hi', null)
    const b = recentKey('hi', 'null')
    expect(a).not.toBe(b)
  })

  test('different texts always produce different keys for the same uid', () => {
    const a = recentKey('hello', '42')
    const b = recentKey('world', '42')
    expect(a).not.toBe(b)
  })

  test('separator is the NUL character that Bilibili strips from chat text', () => {
    const k = recentKey('hi', '42')
    expect(k.includes('\x00')).toBe(true)
  })
})
