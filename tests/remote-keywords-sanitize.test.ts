// Regression tests for the H-sec audit fix: `fetchRemoteKeywords` previously
// stored whatever the CDN returned, with no schema validation. A compromised
// CDN could inject huge maps or non-string values that propagate into
// `applyReplacements` and outgoing danmaku.

import { describe, expect, test } from 'bun:test'

import {
  REMOTE_KEYWORDS_MAX_GLOBAL,
  REMOTE_KEYWORDS_MAX_PER_ROOM,
  REMOTE_KEYWORDS_MAX_ROOMS,
  REMOTE_KEYWORDS_MAX_VALUE_LEN,
  sanitizeKeywordsRecord,
  sanitizeRemoteKeywords,
} from '../src/lib/remote-keywords-sanitize'

describe('sanitizeKeywordsRecord', () => {
  test('keeps well-formed string entries', () => {
    expect(sanitizeKeywordsRecord({ foo: 'bar', baz: 'qux' }, 100)).toEqual({ foo: 'bar', baz: 'qux' })
  })

  test('drops non-string keys/values silently', () => {
    expect(
      sanitizeKeywordsRecord(
        {
          foo: 'ok',
          bar: 42,
          baz: null,
          qux: { nested: 'no' },
        },
        100
      )
    ).toEqual({ foo: 'ok' })
  })

  test('rejects non-object inputs', () => {
    expect(sanitizeKeywordsRecord(null, 100)).toEqual({})
    expect(sanitizeKeywordsRecord('string', 100)).toEqual({})
    expect(sanitizeKeywordsRecord([['foo', 'bar']], 100)).toEqual({})
  })

  test('caps entries at maxEntries', () => {
    const huge: Record<string, string> = {}
    for (let i = 0; i < 5; i++) huge[`k${i}`] = `v${i}`
    expect(Object.keys(sanitizeKeywordsRecord(huge, 3))).toHaveLength(3)
  })

  test('drops over-long values', () => {
    const oversize = 'x'.repeat(REMOTE_KEYWORDS_MAX_VALUE_LEN + 1)
    expect(sanitizeKeywordsRecord({ ok: 'short', bad: oversize }, 100)).toEqual({ ok: 'short' })
  })

  test('drops empty keys', () => {
    expect(sanitizeKeywordsRecord({ '': 'no-empty-key' }, 100)).toEqual({})
  })

  // Audit A11: a `" "` (whitespace-only) key passed `length > 0` and survived
  // sanitization. `applyReplacements` would then `split(" ")` every outgoing
  // danmaku and rewrite every space, corrupting one row at a time across the
  // whole client. Lock the trim()-based check in.
  test('drops whitespace-only keys (audit A11)', () => {
    expect(sanitizeKeywordsRecord({ ' ': 'attack' }, 100)).toEqual({})
    expect(sanitizeKeywordsRecord({ '\t\n  ': 'attack' }, 100)).toEqual({})
    expect(sanitizeKeywordsRecord({ '   　  ': 'attack' }, 100)).toEqual({})
    // Mixed: whitespace key dropped, real keys kept.
    expect(sanitizeKeywordsRecord({ ' ': 'evil', real: 'safe' }, 100)).toEqual({ real: 'safe' })
  })

  test('keeps keys whose content has surrounding whitespace but a non-empty trimmed value', () => {
    // We strip whitespace-only, not all-whitespace-containing — replacing
    // " hello " with " hi " is a legitimate use case.
    expect(sanitizeKeywordsRecord({ ' hello ': 'world' }, 100)).toEqual({ ' hello ': 'world' })
  })
})

describe('sanitizeRemoteKeywords', () => {
  test('passes through well-formed payloads', () => {
    const input = {
      global: { keywords: { hello: 'world' } },
      rooms: [{ room: '101', keywords: { foo: 'bar' } }],
    }
    expect(sanitizeRemoteKeywords(input)).toEqual({
      global: { keywords: { hello: 'world' } },
      rooms: [{ room: '101', keywords: { foo: 'bar' } }],
    })
  })

  test('returns empty object for non-object inputs', () => {
    expect(sanitizeRemoteKeywords(null)).toEqual({})
    expect(sanitizeRemoteKeywords('attack')).toEqual({})
    expect(sanitizeRemoteKeywords([])).toEqual({})
  })

  test('caps the number of rooms', () => {
    const rooms = Array.from({ length: REMOTE_KEYWORDS_MAX_ROOMS + 50 }, (_, i) => ({
      room: String(i),
      keywords: { foo: 'bar' },
    }))
    const out = sanitizeRemoteKeywords({ rooms })
    expect(out.rooms?.length).toBe(REMOTE_KEYWORDS_MAX_ROOMS)
  })

  test('caps per-room and global rule counts', () => {
    const tooManyGlobal: Record<string, string> = {}
    for (let i = 0; i < REMOTE_KEYWORDS_MAX_GLOBAL + 50; i++) tooManyGlobal[`k${i}`] = `v${i}`
    const tooManyRoom: Record<string, string> = {}
    for (let i = 0; i < REMOTE_KEYWORDS_MAX_PER_ROOM + 50; i++) tooManyRoom[`k${i}`] = `v${i}`

    const out = sanitizeRemoteKeywords({
      global: { keywords: tooManyGlobal },
      rooms: [{ room: '1', keywords: tooManyRoom }],
    })
    expect(Object.keys(out.global?.keywords ?? {})).toHaveLength(REMOTE_KEYWORDS_MAX_GLOBAL)
    expect(Object.keys(out.rooms?.[0]?.keywords ?? {})).toHaveLength(REMOTE_KEYWORDS_MAX_PER_ROOM)
  })

  test('coerces numeric room ids to strings; drops empty room ids', () => {
    const out = sanitizeRemoteKeywords({
      rooms: [
        { room: 101, keywords: { a: 'b' } },
        { room: '', keywords: { x: 'y' } },
        { room: null, keywords: { x: 'y' } },
      ],
    })
    expect(out.rooms).toEqual([{ room: '101', keywords: { a: 'b' } }])
  })

  test('drops malformed room entries silently', () => {
    const out = sanitizeRemoteKeywords({
      rooms: [null, 'not an object', { room: '101', keywords: { foo: 'bar' } }],
    })
    expect(out.rooms).toEqual([{ room: '101', keywords: { foo: 'bar' } }])
  })
})
