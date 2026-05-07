import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { cachedEmoticonPackages } = await import('../src/lib/store')
const {
  findEmoticon,
  formatLockedEmoticonReject,
  getEmoticonLockMeta,
  getEmoticonLockReason,
  isEmoticonUnique,
  isLockedEmoticon,
} = await import('../src/lib/emoticon')

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

  test('getEmoticonLockReason returns "需要 X" when unlock_show_text is set', () => {
    expect(getEmoticonLockReason(findEmoticon('[locked]'))).toBe('需要 舰长')
  })

  test('getEmoticonLockReason falls back to 权限不足 for missing or empty hint', () => {
    expect(getEmoticonLockReason(null)).toBe('权限不足')
    expect(getEmoticonLockReason(undefined)).toBe('权限不足') // skipcq: JS-W1042
    expect(
      getEmoticonLockReason({
        emoji: '',
        descript: '',
        url: '',
        emoticon_unique: '[x]',
        emoticon_id: 99,
        perm: 0,
      })
    ).toBe('权限不足')
    expect(
      getEmoticonLockReason({
        emoji: '',
        descript: '',
        url: '',
        emoticon_unique: '[x]',
        emoticon_id: 99,
        perm: 0,
        // Whitespace-only hint should be treated like a missing hint.
        unlock_show_text: '   ',
      })
    ).toBe('权限不足')
  })

  test('getEmoticonLockReason and formatLockedEmoticonReject share the reason text', () => {
    const emo = findEmoticon('[locked]')
    const reason = getEmoticonLockReason(emo)
    expect(formatLockedEmoticonReject('[locked]', '手动表情')).toContain(reason)
  })
})

describe('getEmoticonLockMeta', () => {
  test('marks an unlocked emote (perm=1) as not locked with empty UI fields', () => {
    const meta = getEmoticonLockMeta({
      emoji: '',
      descript: '',
      url: '',
      emoticon_unique: '[ok]',
      emoticon_id: 1,
      perm: 1,
    })
    expect(meta.isLocked).toBe(false)
    expect(meta.titleSuffix).toBe('')
    // reason/badgeColor/badgeLabel are still computed deterministically so
    // call sites can read them unconditionally — they just don't render.
    expect(meta.reason).toBe('权限不足')
    expect(meta.badgeLabel).toBe('🔒')
  })

  test('treats absent perm (legacy responses) as unlocked', () => {
    const meta = getEmoticonLockMeta({
      emoji: '',
      descript: '',
      url: '',
      emoticon_unique: '[legacy]',
      emoticon_id: 2,
    })
    expect(meta.isLocked).toBe(false)
    expect(meta.titleSuffix).toBe('')
  })

  test('builds a full meta bundle for a locked emote with unlock_show_text', () => {
    const meta = getEmoticonLockMeta({
      emoji: '',
      descript: '',
      url: '',
      emoticon_unique: '[locked]',
      emoticon_id: 3,
      perm: 0,
      unlock_show_text: '舰长',
      unlock_show_color: '#ff6699',
    })
    expect(meta.isLocked).toBe(true)
    expect(meta.lockText).toBe('舰长')
    expect(meta.reason).toBe('需要 舰长')
    expect(meta.badgeColor).toBe('#ff6699')
    expect(meta.badgeLabel).toBe('舰长')
    expect(meta.titleSuffix).toBe('🔒 该表情需要 舰长 才能发送')
  })

  test('falls back to 权限不足 / 🔒 / translucent black when hint and color are missing', () => {
    const meta = getEmoticonLockMeta({
      emoji: '',
      descript: '',
      url: '',
      emoticon_unique: '[bare]',
      emoticon_id: 4,
      perm: 0,
    })
    expect(meta.isLocked).toBe(true)
    expect(meta.lockText).toBe('')
    expect(meta.reason).toBe('权限不足')
    expect(meta.badgeColor).toBe('rgba(0,0,0,0.6)')
    expect(meta.badgeLabel).toBe('🔒')
    expect(meta.titleSuffix).toBe('🔒 该表情已被平台锁定')
  })

  test('treats whitespace-only unlock_show_text as missing', () => {
    const meta = getEmoticonLockMeta({
      emoji: '',
      descript: '',
      url: '',
      emoticon_unique: '[ws]',
      emoticon_id: 5,
      perm: 0,
      unlock_show_text: '   ',
    })
    expect(meta.lockText).toBe('')
    expect(meta.reason).toBe('权限不足')
    expect(meta.badgeLabel).toBe('🔒')
    expect(meta.titleSuffix).toBe('🔒 该表情已被平台锁定')
  })

  test('returns an unlocked-style meta for null / undefined input', () => {
    for (const emo of [null, undefined]) {
      const meta = getEmoticonLockMeta(emo)
      expect(meta.isLocked).toBe(false)
      expect(meta.titleSuffix).toBe('')
      expect(meta.lockText).toBe('')
    }
  })

  test('reason text agrees with getEmoticonLockReason for the same input', () => {
    const emo = findEmoticon('[locked]')
    expect(getEmoticonLockMeta(emo).reason).toBe(getEmoticonLockReason(emo))
  })

  test('reason text agrees with formatLockedEmoticonReject for the same input', () => {
    expect(formatLockedEmoticonReject('[locked]', '手动表情')).toContain(
      getEmoticonLockMeta(findEmoticon('[locked]')).reason
    )
  })
})
