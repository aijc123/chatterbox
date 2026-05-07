// Coverage for the pure helpers in `src/lib/utils.ts`. `extractRoomNumber` is
// tested in tests/utils-extract-room.test.ts. This file targets the remaining
// helpers so utils.ts moves from ~22% line coverage to ~100%:
//
//   - getGraphemes                  (used everywhere length math runs)
//   - trimText                      (chunking for danmaku char limit)
//   - stripTrailingPunctuation      (STT polish)
//   - splitTextSmart                (STT smart split)
//   - addRandomCharacter            (anti-bot evasion injection)
//   - formatDanmakuError            (Bilibili error code → human text)
//   - processMessages               (top-level danmaku splitter)
//
// All seven are pure (deterministic except `addRandomCharacter`, which we
// stub `Math.random` for). No DOM, no GM_*, no DI hooks needed.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  addRandomCharacter,
  formatDanmakuError,
  getGraphemes,
  processMessages,
  splitTextSmart,
  stripTrailingPunctuation,
  trimText,
} from '../src/lib/utils'

const SOFT_HYPHEN = '­'

describe('getGraphemes', () => {
  test('returns [] on empty input', () => {
    expect(getGraphemes('')).toEqual([])
  })

  test('splits ASCII into one grapheme per character', () => {
    expect(getGraphemes('abc')).toEqual(['a', 'b', 'c'])
  })

  test('splits CJK into one grapheme per character', () => {
    expect(getGraphemes('你好世界')).toEqual(['你', '好', '世', '界'])
  })

  test('keeps a ZWJ family emoji as a single grapheme', () => {
    // 👨‍👩‍👧 = man + ZWJ + woman + ZWJ + girl
    const family = '👨‍👩‍👧'
    const out = getGraphemes(family)
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(family)
  })

  test('keeps a flag emoji (regional indicator pair) as a single grapheme', () => {
    const flag = '🇨🇳' // CN
    const out = getGraphemes(flag)
    expect(out).toHaveLength(1)
    expect(out[0]).toBe(flag)
  })
})

describe('trimText', () => {
  test('empty string returns [empty]', () => {
    expect(trimText('', 10)).toEqual([''])
  })

  test('text shorter than maxLength returns the original wrapped in array', () => {
    expect(trimText('短', 10)).toEqual(['短'])
    expect(trimText('hello', 5)).toEqual(['hello']) // exactly == maxLength
  })

  test('splits long ASCII into fixed-size chunks', () => {
    const out = trimText('abcdefghij', 3)
    expect(out).toEqual(['abc', 'def', 'ghi', 'j'])
  })

  test('splits CJK by grapheme, not bytes', () => {
    const out = trimText('一二三四五六七', 3)
    expect(out).toEqual(['一二三', '四五六', '七'])
  })

  test('does NOT break a multi-codepoint emoji across chunks', () => {
    const family = '👨‍👩‍👧'
    // 4 graphemes total, maxLength 3 → first chunk has 3 graphemes
    // including the family emoji; second has the leftover.
    const out = trimText(`a${family}bc`, 3)
    expect(out.join('')).toBe(`a${family}bc`)
    // The family emoji must appear intact in exactly one chunk.
    const intact = out.filter(p => p.includes(family))
    expect(intact).toHaveLength(1)
  })

  test('handles maxLength of 1', () => {
    expect(trimText('abc', 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('stripTrailingPunctuation', () => {
  test('returns empty input unchanged', () => {
    expect(stripTrailingPunctuation('')).toBe('')
  })

  test('preserves text without trailing punctuation', () => {
    expect(stripTrailingPunctuation('hello world')).toBe('hello world')
    expect(stripTrailingPunctuation('你好世界')).toBe('你好世界')
  })

  test('strips western trailing punctuation', () => {
    expect(stripTrailingPunctuation('hello.')).toBe('hello')
    expect(stripTrailingPunctuation('hello?')).toBe('hello')
    expect(stripTrailingPunctuation('hello!')).toBe('hello')
    expect(stripTrailingPunctuation('hello,')).toBe('hello')
    expect(stripTrailingPunctuation('hello;')).toBe('hello')
    expect(stripTrailingPunctuation('hello:')).toBe('hello')
  })

  test('strips Chinese trailing punctuation', () => {
    expect(stripTrailingPunctuation('你好。')).toBe('你好')
    expect(stripTrailingPunctuation('你好，')).toBe('你好')
    expect(stripTrailingPunctuation('你好、')).toBe('你好')
    expect(stripTrailingPunctuation('你好！')).toBe('你好')
    expect(stripTrailingPunctuation('你好？')).toBe('你好')
    expect(stripTrailingPunctuation('你好；')).toBe('你好')
    expect(stripTrailingPunctuation('你好：')).toBe('你好')
    expect(stripTrailingPunctuation('你好…')).toBe('你好')
  })

  test('strips multiple consecutive trailing punctuation', () => {
    expect(stripTrailingPunctuation('hello!!!')).toBe('hello')
    expect(stripTrailingPunctuation('what?!')).toBe('what')
    expect(stripTrailingPunctuation('done。。。')).toBe('done')
  })

  test('preserves punctuation inside the string', () => {
    expect(stripTrailingPunctuation('a.b.c')).toBe('a.b.c')
    expect(stripTrailingPunctuation('a.b.c.')).toBe('a.b.c')
  })
})

describe('splitTextSmart', () => {
  test('empty input returns [empty]', () => {
    expect(splitTextSmart('', 10)).toEqual([''])
  })

  test('maxLen <= 0 short-circuits to [text]', () => {
    expect(splitTextSmart('hello', 0)).toEqual(['hello'])
    expect(splitTextSmart('hello', -1)).toEqual(['hello'])
  })

  test('text shorter than maxLen returns single chunk', () => {
    expect(splitTextSmart('短', 10)).toEqual(['短'])
    expect(splitTextSmart('hello', 5)).toEqual(['hello'])
  })

  test('cuts at sentence-ending punctuation closest to maxLen', () => {
    // maxLen 8, "你好。世界很大。再见呀" (12 graphemes). The algo searches backwards
    // from windowEnd-1=7 within `lookback` graphemes and takes the FIRST hit
    // — i.e. the punctuation closest to maxLen. So it cuts after index 7's
    // "。" (the second period), not after index 2's.
    const out = splitTextSmart('你好。世界很大。再见呀', 8)
    expect(out[0]).toBe('你好。世界很大。')
    expect(out[1]).toBe('再见呀')
  })

  test('falls back to clause punctuation when no sentence-ending punct in window', () => {
    // maxLen 10, "你好世界，再见朋友们大家好" (13 graphemes). No 。/！/？ in the first
    // 10 graphemes, but a "，" is at index 4 → cut after it. Default lookback
    // for maxLen=10 is max(4, floor(10/3)=3) = 4 → minBreak=6, so j scans
    // 9..6 — no punct. lookback isn't enough. Use a wider lookback to hit
    // the comma at index 4.
    const out = splitTextSmart('你好世界，再见朋友们大家好', 10, { lookback: 8 })
    expect(out[0]).toBe('你好世界，')
  })

  test('falls back to whitespace cut for English with no punctuation', () => {
    // 4 + 1 + 5 = 10 graphemes "abcd hello world12" — maxLen 10, the space
    // between "hello" and "world12" is the only whitespace in lookback.
    const out = splitTextSmart('abcd hello world12', 10)
    // Whitespace at the cut is consumed: neither chunk begins or ends with it.
    expect(out[0].endsWith(' ')).toBe(false)
    expect(out[1].startsWith(' ')).toBe(false)
    // All content (minus the consumed space) is preserved.
    expect(out.join('')).toBe('abcd helloworld12')
  })

  test('hard-cuts at maxLen when no break point exists', () => {
    // Pure CJK, no punctuation, no whitespace — must hard-cut at maxLen=4.
    const out = splitTextSmart('一二三四五六七八九十', 4)
    expect(out[0]).toBe('一二三四')
    expect(out[0]).toHaveLength(4)
  })

  test('skips leading whitespace at the start of each chunk', () => {
    // After cutting at "Hello," the next chunk should NOT begin with the
    // following space.
    const out = splitTextSmart('Hello, world! Foo bar baz qux.', 12)
    for (const chunk of out) {
      expect(chunk.startsWith(' ')).toBe(false)
    }
  })

  test('rebalances tiny tail by transferring graphemes from the previous chunk', () => {
    // Without rebalance: "一二三四" + "五" (tail length 1).
    // With minTail=3: tail must be >= 3, so transfer 2 from previous.
    // Result: "一二" + "三四五" (tail length 3, prev shrunk to 2).
    const out = splitTextSmart('一二三四五', 4, { lookback: 1, minTail: 3 })
    expect(out).toHaveLength(2)
    expect(out[1].length).toBeGreaterThanOrEqual(3)
    // Concat must equal original text.
    expect(out.join('')).toBe('一二三四五')
  })

  test('rebalance never grows a chunk past maxLen', () => {
    // minTail huge but capped at maxLen by implementation.
    const out = splitTextSmart('abcdefghij', 4, { minTail: 100 })
    for (const chunk of out) {
      expect(chunk.length).toBeLessThanOrEqual(4)
    }
  })

  test('respects custom lookback for sentence-cut search', () => {
    // lookback=1 means the cut search only inspects the LAST grapheme of
    // each window. With maxLen=5 and text "你好。世界你好世界", the "。" is at
    // index 2 — outside lookback=1 from windowEnd=5 → should hard-cut.
    const out = splitTextSmart('你好。世界你好世界', 5, { lookback: 1, minTail: 1 })
    expect(out[0]).toBe('你好。世界')
  })

  test('preserves all original content (concat round-trip ignoring consumed whitespace)', () => {
    const samples = [
      'a'.repeat(100),
      '一'.repeat(50),
      'Hello, world! How are you doing today, friend?',
      '你好。世界。你好。世界。',
    ]
    for (const text of samples) {
      const out = splitTextSmart(text, 10)
      // Length should be preserved within +/- (number of consumed whitespace
      // boundaries). For the all-CJK / all-ASCII / period samples there's no
      // intra-text whitespace, so output must concat back exactly.
      if (!/\s/.test(text)) {
        expect(out.join('')).toBe(text)
      }
    }
  })
})

describe('addRandomCharacter', () => {
  let originalRandom: () => number

  beforeEach(() => {
    originalRandom = Math.random
  })

  afterEach(() => {
    Math.random = originalRandom
  })

  test('returns empty input unchanged', () => {
    expect(addRandomCharacter('')).toBe('')
  })

  test('inserts a soft hyphen (U+00AD)', () => {
    Math.random = () => 0.5
    const out = addRandomCharacter('hello')
    expect(out).toContain(SOFT_HYPHEN)
  })

  test('output has exactly one more grapheme than input', () => {
    Math.random = () => 0.5
    const before = getGraphemes('hello').length
    const after = getGraphemes(addRandomCharacter('hello')).length
    expect(after).toBe(before + 1)
  })

  test('inserts at the start when Math.random returns 0', () => {
    Math.random = () => 0
    const out = addRandomCharacter('abc')
    expect(out[0]).toBe(SOFT_HYPHEN)
    expect(out.slice(1)).toBe('abc')
  })

  test('inserts at the end when Math.random returns just under 1', () => {
    // randomIndex = floor(0.999 * (3+1)) = 3 → end of "abc"
    Math.random = () => 0.999
    const out = addRandomCharacter('abc')
    expect(out).toBe(`abc${SOFT_HYPHEN}`)
  })

  test('respects grapheme boundaries (does not split a ZWJ emoji)', () => {
    Math.random = () => 0.5
    const family = '👨‍👩‍👧'
    const out = addRandomCharacter(family)
    // The family emoji must still appear intact in the result.
    expect(out).toContain(family)
    // Output length is exactly one soft hyphen longer than the input.
    expect(out.length).toBe(family.length + 1)
  })
})

describe('formatDanmakuError', () => {
  test('undefined error → "未知错误"', () => {
    expect(formatDanmakuError(undefined)).toBe('未知错误') // skipcq: JS-W1042
  })

  test('empty string → "未知错误"', () => {
    expect(formatDanmakuError('')).toBe('未知错误')
  })

  test('exact "f" → global block message', () => {
    expect(formatDanmakuError('f')).toBe('f - 包含全局屏蔽词')
  })

  test('exact "k" → room block message', () => {
    expect(formatDanmakuError('k')).toBe('k - 包含房间屏蔽词')
  })

  test('error containing "f" → treated as global', () => {
    expect(formatDanmakuError('error: f')).toBe('f - 包含全局屏蔽词')
  })

  test('error containing "k" but NOT "f" → treated as room', () => {
    expect(formatDanmakuError('reason: k')).toBe('k - 包含房间屏蔽词')
  })

  test('"f" wins over "k" when both present (checked first)', () => {
    expect(formatDanmakuError('fk')).toBe('f - 包含全局屏蔽词')
    expect(formatDanmakuError('kf')).toBe('f - 包含全局屏蔽词')
  })

  test('error without f or k passes through unchanged', () => {
    expect(formatDanmakuError('rate-limited')).toBe('rate-limited')
    expect(formatDanmakuError('-101')).toBe('-101')
  })
})

describe('processMessages', () => {
  test('empty input → []', () => {
    expect(processMessages('', 20)).toEqual([])
  })

  test('whitespace-only input → []', () => {
    expect(processMessages('   ', 20)).toEqual([])
    expect(processMessages('\n\n\n', 20)).toEqual([])
    expect(processMessages('  \t  \n  ', 20)).toEqual([])
  })

  test('single short line returns [line]', () => {
    expect(processMessages('hello', 20)).toEqual(['hello'])
  })

  test('multi-line input splits per line', () => {
    expect(processMessages('a\nb\nc', 20)).toEqual(['a', 'b', 'c'])
  })

  test('long line is chunked by maxLength (graphemes)', () => {
    const out = processMessages('一二三四五六七八九十', 4)
    expect(out).toEqual(['一二三四', '五六七八', '九十'])
  })

  test('blank lines in the middle are filtered out', () => {
    expect(processMessages('a\n\nb\n   \nc', 20)).toEqual(['a', 'b', 'c'])
  })

  test('addRandomChar=true injects a soft hyphen into each non-empty line', () => {
    const originalRandom = Math.random
    try {
      Math.random = () => 0.5
      const out = processMessages('abc\ndef', 20, true)
      // Each chunk gained exactly one soft hyphen.
      expect(out.every(line => line.includes(SOFT_HYPHEN))).toBe(true)
      expect(out).toHaveLength(2)
    } finally {
      Math.random = originalRandom
    }
  })

  test('addRandomChar=true does NOT add a hyphen to whitespace-only lines (filtered before/after)', () => {
    const originalRandom = Math.random
    try {
      Math.random = () => 0
      const out = processMessages('hello\n   \nworld', 20, true)
      // Whitespace-only line dropped entirely; the two real lines each got a hyphen.
      expect(out).toHaveLength(2)
      expect(out[0]).toBe(`${SOFT_HYPHEN}hello`)
      expect(out[1]).toBe(`${SOFT_HYPHEN}world`)
    } finally {
      Math.random = originalRandom
    }
  })

  test('long line + multi-line + chunking interact correctly', () => {
    // First line "一二三四五" → 5 graphemes, maxLen=3 → chunks "一二三" + "四五".
    // Second line "abc" → fits → "abc".
    const out = processMessages('一二三四五\nabc', 3)
    expect(out).toEqual(['一二三', '四五', 'abc'])
  })
})
