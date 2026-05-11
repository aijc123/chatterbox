/**
 * Coverage for the room-keyed meme-source registry (`src/lib/meme-sources.ts`).
 *
 * The module owns three concerns we test independently:
 *   - `validateMemeSource`: input sanitization for arbitrary user-supplied JSON.
 *     Must NEVER throw; only returns a normalized record or `null`.
 *   - `registerMemeSource` / `unregisterMemeSource` / `clearUserMemeSources`:
 *     mutation surface for the user-supplied map, with "user > built-in" lookup
 *     precedence.
 *   - `getMemeSourceForRoom` / `hasMemeSourceForRoom`: lookup precedence semantics.
 *
 * Built-in entries (the 灰泽满直播间 default) must be untouched by
 * `clear()` — that's the contract the GM-signal sync relies on.
 *
 * Pure module, no GM-store needed beyond the global `setup.ts` stub.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  _resetMemeSourceRegistryForTests,
  clearUserMemeSources,
  DEFAULT_MEME_SOURCES,
  getMemeSourceForRoom,
  hasMemeSourceForRoom,
  type MemeSource,
  registerMemeSource,
  unregisterMemeSource,
  validateMemeSource,
} from '../src/lib/meme-sources'

const SAMPLE_BUILTIN_ROOM_ID = 1713546334 // 灰泽满直播间

beforeEach(() => {
  _resetMemeSourceRegistryForTests()
})

afterEach(() => {
  _resetMemeSourceRegistryForTests()
})

describe('DEFAULT_MEME_SOURCES contract', () => {
  test('ships with the 灰泽满直播间 built-in source', () => {
    const builtin = DEFAULT_MEME_SOURCES[String(SAMPLE_BUILTIN_ROOM_ID)]
    expect(builtin).toBeDefined()
    expect(builtin?.roomId).toBe(SAMPLE_BUILTIN_ROOM_ID)
    expect(builtin?.name).toBe('灰泽满烂梗库')
    expect(builtin?.listEndpoint.startsWith('https://')).toBe(true)
  })

  test('built-in has the smart-driver keywordToTag mapping (heuristic seed)', () => {
    // Lock this so a refactor that drops the keyword→tag table doesn't
    // silently regress the Smart Auto-Drive heuristic.
    const builtin = DEFAULT_MEME_SOURCES[String(SAMPLE_BUILTIN_ROOM_ID)]
    expect(builtin?.keywordToTag).toBeDefined()
    expect(Object.keys(builtin?.keywordToTag ?? {}).length).toBeGreaterThan(5)
  })

  test('built-in pauseKeywords includes the "够了/别刷了" anchors', () => {
    const builtin = DEFAULT_MEME_SOURCES[String(SAMPLE_BUILTIN_ROOM_ID)]
    expect(builtin?.pauseKeywords).toContain('够了')
    expect(builtin?.pauseKeywords).toContain('别刷了')
  })
})

describe('validateMemeSource — top-level shape', () => {
  test('rejects non-object inputs (string, number, null, undefined, boolean, array)', () => {
    expect(validateMemeSource(null)).toBeNull()
    expect(validateMemeSource(undefined)).toBeNull()
    expect(validateMemeSource('a string')).toBeNull()
    expect(validateMemeSource(42)).toBeNull()
    expect(validateMemeSource(true)).toBeNull()
    // Arrays are typeof 'object' but the function only accepts plain records
    // for the top-level shape — current implementation tolerates arrays as
    // objects (no isArray guard), so we just check it returns null for
    // missing required fields.
    expect(validateMemeSource(['foo'])).toBeNull()
  })

  test('rejects roomId that is not a positive integer', () => {
    const base = { name: 'x', listEndpoint: 'https://example.com/a' }
    expect(validateMemeSource({ ...base })).toBeNull() // missing
    expect(validateMemeSource({ ...base, roomId: 0 })).toBeNull()
    expect(validateMemeSource({ ...base, roomId: -1 })).toBeNull()
    expect(validateMemeSource({ ...base, roomId: 1.5 })).toBeNull()
    expect(validateMemeSource({ ...base, roomId: '123' })).toBeNull()
    expect(validateMemeSource({ ...base, roomId: Number.NaN })).toBeNull()
  })

  test('rejects empty/whitespace/missing name', () => {
    const base = { roomId: 100, listEndpoint: 'https://example.com/a' }
    expect(validateMemeSource({ ...base })).toBeNull()
    expect(validateMemeSource({ ...base, name: '' })).toBeNull()
    expect(validateMemeSource({ ...base, name: '   ' })).toBeNull()
    expect(validateMemeSource({ ...base, name: 7 })).toBeNull()
  })

  test('truncates name to NAME_MAX_LEN (64) characters', () => {
    const out = validateMemeSource({
      roomId: 100,
      name: 'a'.repeat(200),
      listEndpoint: 'https://example.com/a',
    })
    expect(out?.name.length).toBe(64)
  })

  test('rejects missing/non-https listEndpoint (security gate)', () => {
    expect(
      validateMemeSource({
        roomId: 100,
        name: 'x',
      })
    ).toBeNull()
    expect(
      validateMemeSource({
        roomId: 100,
        name: 'x',
        listEndpoint: 'http://evil.example.com',
      })
    ).toBeNull()
    expect(
      validateMemeSource({
        roomId: 100,
        name: 'x',
        listEndpoint: 'javascript:alert(1)',
      })
    ).toBeNull()
    expect(
      validateMemeSource({
        roomId: 100,
        name: 'x',
        listEndpoint: 'not a url',
      })
    ).toBeNull()
  })

  test('rejects http URL except for localhost / 127.0.0.1 / ::1 (loopback exemption)', () => {
    const mk = (url: string) => validateMemeSource({ roomId: 1, name: 'n', listEndpoint: url })

    expect(mk('http://localhost:8787/api')).not.toBeNull()
    expect(mk('http://127.0.0.1/api')).not.toBeNull()
    expect(mk('http://[::1]/api')).not.toBeNull()
    expect(mk('http://example.com/api')).toBeNull()
    expect(mk('http://192.168.1.1/api')).toBeNull()
  })

  test('rejects listEndpoint longer than URL_MAX_LEN (500)', () => {
    const longUrl = `https://example.com/${'a'.repeat(500)}`
    expect(
      validateMemeSource({
        roomId: 1,
        name: 'n',
        listEndpoint: longUrl,
      })
    ).toBeNull()
  })

  test('accepts minimal canonical input and returns normalized output', () => {
    const out = validateMemeSource({
      roomId: 9999,
      name: '  test name  ',
      listEndpoint: 'https://example.com/api/memes',
    })
    expect(out).toEqual({
      roomId: 9999,
      name: 'test name', // trimmed
      listEndpoint: 'https://example.com/api/memes',
    })
  })
})

describe('validateMemeSource — optional fields', () => {
  test('keeps a valid randomEndpoint / submitPage, drops invalid ones silently', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      randomEndpoint: 'https://example.com/random',
      submitPage: 'http://evil.example/submit', // invalid (not https/localhost) → dropped
    })
    expect(out?.randomEndpoint).toBe('https://example.com/random')
    expect(out?.submitPage).toBeUndefined()
  })

  test('null/undefined randomEndpoint and submitPage are simply absent in output', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      randomEndpoint: null,
      submitPage: undefined,
    })
    expect(out?.randomEndpoint).toBeUndefined()
    expect(out?.submitPage).toBeUndefined()
  })

  test('defaultTags: keeps strings, trims, caps at TAG_MAX_LEN, hard-caps at TAGS_MAX_COUNT=32', () => {
    const tagsIn = Array.from({ length: 50 }, (_, i) => `  tag${i}  `)
    tagsIn.push('a'.repeat(200)) // > TAG_MAX_LEN → dropped
    tagsIn.push('') // empty → dropped
    tagsIn.push('   ') // whitespace → dropped
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      defaultTags: tagsIn,
    })
    expect(out?.defaultTags?.length).toBe(32) // capped
    expect(out?.defaultTags?.[0]).toBe('tag0') // trimmed
  })

  test('defaultTags: non-array input is silently dropped, not an error', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      defaultTags: 'not-an-array',
    })
    expect(out?.defaultTags).toBeUndefined()
  })

  test('defaultTags: array of only invalid entries → undefined (not empty array)', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      defaultTags: ['', '   ', 7, null, 'x'.repeat(100)],
    })
    expect(out?.defaultTags).toBeUndefined()
  })

  test('pauseKeywords: capped at PAUSE_MAX_COUNT=64', () => {
    const pauseIn = Array.from({ length: 100 }, (_, i) => `p${i}`)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      pauseKeywords: pauseIn,
    })
    expect(out?.pauseKeywords?.length).toBe(64)
  })

  test('keywordToTag: keeps {string -> string} entries, drops invalid keys/values', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      keywordToTag: {
        '冲|上|GO': 'cheer',
        '': 'empty-key-dropped',
        ['x'.repeat(300)]: 'too-long-key-dropped',
        validKey: '   ', // empty after trim → dropped
        anotherKey: 7 as unknown as string, // non-string value
        ok: 'ok-tag',
      },
    })
    expect(out?.keywordToTag?.['冲|上|GO']).toBe('cheer')
    expect(out?.keywordToTag?.ok).toBe('ok-tag')
    expect(out?.keywordToTag?.['']).toBeUndefined()
    expect(out?.keywordToTag?.validKey).toBeUndefined()
    expect(out?.keywordToTag?.anotherKey).toBeUndefined()
  })

  test('keywordToTag: array (not plain object) is silently rejected', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      keywordToTag: [['x', 'y']] as unknown as Record<string, string>,
    })
    expect(out?.keywordToTag).toBeUndefined()
  })

  test('keywordToTag with only invalid entries yields undefined (omitted)', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/list',
      keywordToTag: { '': 'a', x: 7 as unknown as string },
    })
    expect(out?.keywordToTag).toBeUndefined()
  })

  test('NEVER throws even on cyclic / hostile input', () => {
    // Sanity: validateMemeSource is the boundary between "untrusted GM storage"
    // and "module-internal map" — a single throw here would break panel
    // boot. Use a self-referential object and an object whose values blow up
    // on toString to be safe.
    const cyclic: Record<string, unknown> = {
      roomId: 1,
      name: 'x',
      listEndpoint: 'https://example.com/a',
    }
    cyclic.self = cyclic
    expect(() => validateMemeSource(cyclic)).not.toThrow()

    const hostileToString = {
      roomId: 1,
      name: {
        toString() {
          throw new Error('boom')
        },
      },
      listEndpoint: 'https://example.com/a',
    }
    expect(() => validateMemeSource(hostileToString)).not.toThrow()
  })
})

describe('registerMemeSource / lookup', () => {
  test('registerMemeSource returns true on valid input, false on invalid', () => {
    expect(
      registerMemeSource({ roomId: 1, name: 'x', listEndpoint: 'https://example.com/list' })
    ).toBe(true)
    expect(registerMemeSource({ roomId: 0, name: 'x' })).toBe(false)
    expect(registerMemeSource('not an object')).toBe(false)
  })

  test('getMemeSourceForRoom finds a freshly-registered user source', () => {
    registerMemeSource({ roomId: 42, name: 'r42', listEndpoint: 'https://example.com/l' })
    const found = getMemeSourceForRoom(42)
    expect(found).not.toBeNull()
    expect(found?.name).toBe('r42')
  })

  test('user-supplied source for a built-in roomId overrides the built-in', () => {
    // Critical contract: same roomId from `userMemeSources` GM wins.
    const before = getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)
    expect(before?.name).toBe('灰泽满烂梗库')

    registerMemeSource({
      roomId: SAMPLE_BUILTIN_ROOM_ID,
      name: 'CUSTOM OVERRIDE',
      listEndpoint: 'https://example.com/override',
    })
    const after = getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)
    expect(after?.name).toBe('CUSTOM OVERRIDE')
    expect(after?.listEndpoint).toBe('https://example.com/override')
  })

  test('re-registering the same roomId replaces the prior user entry', () => {
    registerMemeSource({ roomId: 5, name: 'first', listEndpoint: 'https://a.example.com/' })
    registerMemeSource({ roomId: 5, name: 'second', listEndpoint: 'https://b.example.com/' })
    expect(getMemeSourceForRoom(5)?.name).toBe('second')
  })

  test('getMemeSourceForRoom returns null for null / undefined / unknown room', () => {
    expect(getMemeSourceForRoom(null)).toBeNull()
    expect(getMemeSourceForRoom(undefined)).toBeNull()
    expect(getMemeSourceForRoom(123456789)).toBeNull()
  })

  test('hasMemeSourceForRoom mirrors getMemeSourceForRoom non-null', () => {
    expect(hasMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)).toBe(true)
    expect(hasMemeSourceForRoom(987654321)).toBe(false)
    expect(hasMemeSourceForRoom(null)).toBe(false)
    expect(hasMemeSourceForRoom(undefined)).toBe(false)
  })
})

describe('unregisterMemeSource / clearUserMemeSources', () => {
  test('unregister returns true if the user entry existed; otherwise false', () => {
    registerMemeSource({ roomId: 7, name: 'temp', listEndpoint: 'https://example.com/' })
    expect(unregisterMemeSource(7)).toBe(true)
    expect(unregisterMemeSource(7)).toBe(false)
  })

  test('unregister does NOT affect built-in entries (cannot delete bundled defaults)', () => {
    // The function only operates on `userSources`. Lock this — otherwise a
    // user with a hand-rolled `userMemeSources` entry could wipe the 灰泽满
    // default by mistake.
    const result = unregisterMemeSource(SAMPLE_BUILTIN_ROOM_ID)
    expect(result).toBe(false)
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)).not.toBeNull()
  })

  test('unregister removes the override so the built-in is visible again', () => {
    registerMemeSource({
      roomId: SAMPLE_BUILTIN_ROOM_ID,
      name: 'override',
      listEndpoint: 'https://example.com/o',
    })
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)?.name).toBe('override')
    expect(unregisterMemeSource(SAMPLE_BUILTIN_ROOM_ID)).toBe(true)
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)?.name).toBe('灰泽满烂梗库')
  })

  test('clearUserMemeSources wipes only user entries; built-ins survive', () => {
    registerMemeSource({ roomId: 10, name: 'a', listEndpoint: 'https://a.example.com/' })
    registerMemeSource({ roomId: 20, name: 'b', listEndpoint: 'https://b.example.com/' })
    expect(getMemeSourceForRoom(10)).not.toBeNull()
    expect(getMemeSourceForRoom(20)).not.toBeNull()

    clearUserMemeSources()

    expect(getMemeSourceForRoom(10)).toBeNull()
    expect(getMemeSourceForRoom(20)).toBeNull()
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)).not.toBeNull()
  })
})

describe('lookup precedence — integration', () => {
  test('full round trip: register override → lookup user → clear → lookup builtin', () => {
    const override: MemeSource = {
      roomId: SAMPLE_BUILTIN_ROOM_ID,
      name: 'my-version',
      listEndpoint: 'https://example.com/me/list',
    }
    expect(registerMemeSource(override)).toBe(true)
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)?.name).toBe('my-version')

    clearUserMemeSources()
    expect(getMemeSourceForRoom(SAMPLE_BUILTIN_ROOM_ID)?.name).toBe('灰泽满烂梗库')
  })

  test('rejected registrations leave the registry unchanged (no partial state)', () => {
    expect(registerMemeSource({ roomId: -1, name: 'x', listEndpoint: 'https://example.com/' })).toBe(false)
    expect(getMemeSourceForRoom(-1)).toBeNull()
  })
})
