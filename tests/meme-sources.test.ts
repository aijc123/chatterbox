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

  // Mutation-test fortification: pin every literal in the 灰泽满直播间
  // entry. Stryker mutates each StringLiteral, ArrayDeclaration, and
  // ObjectLiteral inside DEFAULT_MEME_SOURCES; the shallow assertions above
  // only catch a handful. This single `toEqual` kills ~28 StringLiteral
  // mutants in one go without bloating the suite.
  test('built-in 灰泽满直播间 entry matches the exact spec (kills constant-data mutants)', () => {
    const builtin = DEFAULT_MEME_SOURCES[String(SAMPLE_BUILTIN_ROOM_ID)]
    expect(builtin).toEqual({
      roomId: 1713546334,
      name: '灰泽满烂梗库',
      listEndpoint: 'https://sbhzm.cn/api/public/memes',
      randomEndpoint: 'https://sbhzm.cn/api/public/memes/random',
      defaultTags: ['满弟', '喷绿冻', '老弥'],
      keywordToTag: {
        '冲耳朵|耳朵痛|实习医生|医生|住院|医院': '满弟',
        '绿冻|绿茬|喷.*绿|路人.*骂': '喷绿冻',
        '困|睡|累|休息|床|被子|起床': '老弥',
        '可爱|心动|心疼|爱.*(?:灰|满)|宝贝|乖': '爱灰泽满',
        '傻逼|讨厌|喷.*(?:灰|满)|骂.*(?:灰|满)|烦死|滚': '喷灰泽满',
        '茶|奶茶|龙井|绿茶': '茶',
        '富|有钱|sc|大哥|舰长|豪|订阅': '富',
        '原话|刚.*说|刚才.*说|你.*说.*过': '原话',
        '黄桃|罐头': '黄桃',
        '丈育|文盲|不识字': '丈育',
        'hololive|holo|宝钟|姫|崎波': 'hololive',
        'nijisanji|彩虹社|niji|社团': 'nijisanji',
        '东野圭吾|侦探|推理|嫌疑人': '东野圭吾',
        '同事|公司|周报|加班|上班': '同事',
        '满爸|爸爸|父亲': '满爸',
        '群魔乱舞|聚众|互喷|对骂': '群魔乱舞',
      },
      pauseKeywords: ['歇歇', '够了', '别刷了', '刷够了', '烦', '不要刷', '停一下'],
      submitPage: 'https://sbhzm.cn/submit',
    })
  })

  test('DEFAULT_MEME_SOURCES has exactly one entry (locks ObjectLiteral mutation)', () => {
    // If somebody adds a second built-in, this test will helpfully scream so
    // they can update the audit comments + this lock.
    expect(Object.keys(DEFAULT_MEME_SOURCES).sort()).toEqual(['1713546334'])
  })
})

// Length-cap boundary fortification. The constants URL_MAX_LEN (500),
// NAME_MAX_LEN (64), TAG_MAX_LEN (64), TAGS_MAX_COUNT (32), PAUSE_MAX_COUNT
// (64), KEYWORD_PATTERN_MAX_LEN (256), KEYWORD_MAP_MAX_ENTRIES (256) are
// all targets of EqualityOperator / ArithmeticOperator mutations. The
// existing tests cover them with generous overshoot (200 chars vs 64, 100
// pauses vs 64) which doesn't pin the exact boundary. Below are the strict
// `=` / `+1` cases.
describe('validateMemeSource — exact length-cap boundaries', () => {
  test('listEndpoint accepts a URL exactly 500 chars long (locks `> 500` not `>= 500`)', () => {
    // URL = 'https://example.com/' (20) + 480 chars = 500 total.
    const url = `https://example.com/${'a'.repeat(480)}`
    expect(url.length).toBe(500)
    expect(validateMemeSource({ roomId: 1, name: 'n', listEndpoint: url })?.listEndpoint).toBe(url)
  })

  test('listEndpoint rejects 501 chars (locks `> 500` not `>= 501`)', () => {
    const url = `https://example.com/${'a'.repeat(481)}`
    expect(url.length).toBe(501)
    expect(validateMemeSource({ roomId: 1, name: 'n', listEndpoint: url })).toBeNull()
  })

  test('name accepts up to 64 chars verbatim; longer is sliced to exactly 64', () => {
    const out64 = validateMemeSource({
      roomId: 1,
      name: 'a'.repeat(64),
      listEndpoint: 'https://example.com/',
    })
    expect(out64?.name.length).toBe(64)
    const out65 = validateMemeSource({
      roomId: 1,
      name: 'a'.repeat(65),
      listEndpoint: 'https://example.com/',
    })
    expect(out65?.name.length).toBe(64) // sliced
  })

  test('defaultTags: tag of length exactly 64 is accepted (locks `> TAG_MAX_LEN`)', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      defaultTags: ['a'.repeat(64), 'a'.repeat(65)],
    })
    expect(out?.defaultTags).toEqual(['a'.repeat(64)])
  })

  test('defaultTags: exactly 32 tags kept verbatim (locks `>= TAGS_MAX_COUNT`)', () => {
    const tagsIn = Array.from({ length: 32 }, (_, i) => `tag${i}`)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      defaultTags: tagsIn,
    })
    expect(out?.defaultTags?.length).toBe(32)
    expect(out?.defaultTags?.[31]).toBe('tag31')
  })

  test('pauseKeywords: exactly 64 entries kept verbatim', () => {
    const pauseIn = Array.from({ length: 64 }, (_, i) => `p${i}`)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      pauseKeywords: pauseIn,
    })
    expect(out?.pauseKeywords?.length).toBe(64)
  })

  test('keywordToTag: pattern key exactly 256 chars accepted (locks `> 256`)', () => {
    const longKey = 'a'.repeat(256)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      keywordToTag: { [longKey]: 'tag' },
    })
    expect(out?.keywordToTag?.[longKey]).toBe('tag')
  })

  test('keywordToTag: pattern key 257 chars rejected', () => {
    const tooLong = 'a'.repeat(257)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      keywordToTag: { [tooLong]: 'tag' },
    })
    expect(out?.keywordToTag).toBeUndefined()
  })

  test('keywordToTag: tag value of exactly 64 chars accepted', () => {
    const tag64 = 'a'.repeat(64)
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'https://example.com/',
      keywordToTag: { k: tag64 },
    })
    expect(out?.keywordToTag?.k).toBe(tag64)
  })
})

describe('validateMemeSource — http loopback variants', () => {
  // The `host.startsWith('[') && host.endsWith(']')` strip handles IPv6
  // bracket notation; mutations on the `&&` and the bracket literals
  // survive without coverage of the bracket-strip path.
  test('http://[::1]:port/path also accepted (locks bracket-strip logic)', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'http://[::1]:8787/api',
    })
    expect(out?.listEndpoint).toBe('http://[::1]:8787/api')
  })

  test('http://[2001:db8::1]/ — non-loopback IPv6 is rejected', () => {
    // Bracket-strip works, but the host doesn't match localhost/127.0.0.1/::1.
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'http://[2001:db8::1]/api',
    })
    expect(out).toBeNull()
  })

  test('"ws://localhost/api" is rejected — only http: / https: protocols are accepted', () => {
    const out = validateMemeSource({
      roomId: 1,
      name: 'n',
      listEndpoint: 'ws://localhost/api',
    })
    expect(out).toBeNull()
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
    expect(registerMemeSource({ roomId: 1, name: 'x', listEndpoint: 'https://example.com/list' })).toBe(true)
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
