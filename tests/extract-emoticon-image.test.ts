/**
 * Unit tests for `extractEmoticonImage` — the WS-side parser that pulls a
 * sticker URL out of `DANMU_MSG.info[0][13]` whenever the danmaku is a single
 * emoticon (`info[0][12] === 1`). The helper is small but defensive: every
 * branch needs to fall back to `undefined` rather than throw, because the
 * shape of `info` varies between rooms / Bilibili rollouts.
 */

import { describe, expect, test } from 'bun:test'

import { extractEmoticonImage } from '../src/lib/live-ws-source'

function info(meta: unknown[]): unknown[] {
  // Mirror the real DANMU_MSG shape — only meta (info[0]) matters here.
  return [meta, '', [], [], [], '', '', '', '', '', '', '', '', '', '', '']
}

describe('extractEmoticonImage', () => {
  test('returns undefined for non-array info', () => {
    expect(extractEmoticonImage(null, 'x')).toBeUndefined()
    expect(extractEmoticonImage(undefined, 'x')).toBeUndefined()
    expect(extractEmoticonImage('string', 'x')).toBeUndefined()
    expect(extractEmoticonImage({}, 'x')).toBeUndefined()
  })

  test('returns undefined when info[0] is not an array', () => {
    expect(extractEmoticonImage([null, ''], 'x')).toBeUndefined()
    expect(extractEmoticonImage(['not-an-array', ''], 'x')).toBeUndefined()
  })

  test('returns undefined when dm_type is not 1 (regular text danmaku)', () => {
    const meta = Array(16).fill(0)
    meta[12] = 0
    meta[13] = { url: 'https://example.test/x.png' }
    expect(extractEmoticonImage(info(meta), 'hi')).toBeUndefined()
  })

  test('returns undefined when info[0][13] has no url', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = { emoticon_unique: '[wow]' }
    expect(extractEmoticonImage(info(meta), 'hi')).toBeUndefined()
  })

  test('returns undefined when url is empty / non-string', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1

    meta[13] = { url: '' }
    expect(extractEmoticonImage(info(meta), 'hi')).toBeUndefined()

    meta[13] = { url: 42 }
    expect(extractEmoticonImage(info(meta), 'hi')).toBeUndefined()
  })

  test('extracts url plus emoticon_unique-derived alt for a valid sticker', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = {
      url: 'https://i0.hdslb.com/bfs/live/abc.png',
      emoticon_unique: 'room_2434_xyz',
      emoji: '[心]',
      width: 162,
      height: 162,
    }
    expect(extractEmoticonImage(info(meta), 'fallback')).toEqual({
      url: 'https://i0.hdslb.com/bfs/live/abc.png',
      alt: 'room_2434_xyz',
      width: 162,
      height: 162,
    })
  })

  test('falls back to emoji when emoticon_unique is missing', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = { url: 'https://example.test/x.png', emoji: '[心]' }
    expect(extractEmoticonImage(info(meta), 'text-fallback')?.alt).toBe('[心]')
  })

  test('falls back to text when both emoticon_unique and emoji are absent', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = { url: 'https://example.test/x.png' }
    expect(extractEmoticonImage(info(meta), '【sticker】')?.alt).toBe('【sticker】')
  })

  test('falls back to "表情" when emoticon_unique, emoji, and text are all empty', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = { url: 'https://example.test/x.png' }
    expect(extractEmoticonImage(info(meta), '')?.alt).toBe('表情')
  })

  test('drops invalid width / height values (zero, negative, non-number)', () => {
    const meta = Array(16).fill(0)
    meta[12] = 1
    meta[13] = {
      url: 'https://example.test/x.png',
      width: 0,
      height: -10,
    }
    const result = extractEmoticonImage(info(meta), 'x')
    expect(result?.width).toBeUndefined()
    expect(result?.height).toBeUndefined()

    meta[13] = { url: 'https://example.test/x.png', width: '162', height: NaN }
    const result2 = extractEmoticonImage(info(meta), 'x')
    expect(result2?.width).toBeUndefined()
    expect(result2?.height).toBeUndefined()
  })
})
