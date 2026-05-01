import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { cachedEmoticonPackages } = await import('../src/lib/store')
const { findEmoticon, formatLockedEmoticonReject, isEmoticonUnique, isLockedEmoticon } = await import(
  '../src/lib/emoticon'
)

describe('emoticon helpers', () => {
  beforeEach(() => {
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'test',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '',
            descript: 'ok',
            url: '',
            emoticon_unique: '[ok]',
            emoticon_id: 1,
            perm: 1,
          },
          {
            emoji: '',
            descript: 'locked',
            url: '',
            emoticon_unique: '[locked]',
            emoticon_id: 2,
            perm: 0,
            unlock_show_text: '舰长',
          },
        ],
      },
    ]
  })

  test('distinguishes plain text, known emotes, and locked emotes', () => {
    expect(isEmoticonUnique('hello')).toBe(false)
    expect(findEmoticon('hello')).toBeNull()
    expect(isLockedEmoticon('hello')).toBe(false)

    expect(isEmoticonUnique('[ok]')).toBe(true)
    expect(isLockedEmoticon('[ok]')).toBe(false)

    expect(isEmoticonUnique('[locked]')).toBe(true)
    expect(isLockedEmoticon('[locked]')).toBe(true)
  })

  test('formats locked-emoticon rejection with unlock hint', () => {
    expect(formatLockedEmoticonReject('[locked]', '手动表情')).toContain('需要 舰长')
  })
})
