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
  formatUnavailableEmoticonReject,
  getEmoticonLockMeta,
  getEmoticonLockReason,
  isEmoticonUnique,
  isLockedEmoticon,
  isUnavailableEmoticon,
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

describe('isUnavailableEmoticon (cross-room emote ID guard)', () => {
  beforeEach(() => {
    // Same shape of in-room cache as the main describe — including one valid
    // unique that looks like a unique ID (`room_<thisRoom>_<id>`) so we can
    // verify the in-room IDs aren't false-positived.
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'this-room',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '',
            descript: 'in-room emote',
            url: '',
            emoticon_unique: 'room_111_22',
            emoticon_id: 22,
            perm: 1,
          },
        ],
      },
    ]
  })

  test('rejects ID-shaped strings not present in current room cache', () => {
    // Cross-room (other streamer's room): clear hit.
    expect(isUnavailableEmoticon('room_999_88')).toBe(true)
    // Site-wide official we don't have: also a hit.
    expect(isUnavailableEmoticon('official_55')).toBe(true)
    // Charge-tier emote from another room: hit.
    expect(isUnavailableEmoticon('upower_222_77')).toBe(true)
  })

  test('passes through ID-shaped strings that ARE in the current room cache', () => {
    // The same string is registered → must NOT be classified as unavailable
    // (it's a legitimate in-room emote, the normal emoticon-send path handles it).
    expect(isUnavailableEmoticon('room_111_22')).toBe(false)
  })

  test('passes through plain text and CJK chat that does not match the ID pattern', () => {
    expect(isUnavailableEmoticon('666')).toBe(false)
    expect(isUnavailableEmoticon('上车')).toBe(false)
    expect(isUnavailableEmoticon('hello world')).toBe(false)
    // Almost ID-shaped but missing the underscore-digit suffix.
    expect(isUnavailableEmoticon('room')).toBe(false)
    expect(isUnavailableEmoticon('room_')).toBe(false)
    // Has digits but no leading lowercase letters.
    expect(isUnavailableEmoticon('123_456')).toBe(false)
    // Capitalised — pattern requires lowercase only (B站 IDs are lowercase).
    expect(isUnavailableEmoticon('Room_111_22')).toBe(false)
  })

  test('returns false (fail-open) when emoticon cache is empty (still loading)', () => {
    // The "still loading" window: we cannot distinguish unavailable from
    // not-yet-loaded, so let traffic through rather than false-reject
    // legitimate room emotes during the brief startup gap.
    cachedEmoticonPackages.value = []
    expect(isUnavailableEmoticon('room_999_88')).toBe(false)
    expect(isUnavailableEmoticon('room_111_22')).toBe(false)
  })

  test('handles multi-segment IDs (`a_1_2_3` shape) the regex anchors on', () => {
    // Pattern `^[a-z]+(_\d+)+$` — multiple `_<digits>` segments are valid.
    expect(isUnavailableEmoticon('upower_111_22_33')).toBe(true)
  })

  test('does not match when the suffix has letters mixed in', () => {
    // `_22a` breaks the `_\d+` group → doesn't look like an ID at all.
    expect(isUnavailableEmoticon('room_22a_33')).toBe(false)
  })
})

describe('formatUnavailableEmoticonReject', () => {
  test('produces the 🚫 prefix and includes the call-site label and msg', () => {
    const line = formatUnavailableEmoticonReject('room_999_88', '自动跟车(表情)')
    expect(line.startsWith('🚫')).toBe(true)
    expect(line).toContain('自动跟车(表情)')
    expect(line).toContain('room_999_88')
    expect(line).toContain('已阻止发送')
  })

  test('label is interpolated as-is (allows callers to embed indices, modes, etc.)', () => {
    const line = formatUnavailableEmoticonReject('official_55', '自动表情 [2/3]')
    expect(line).toContain('自动表情 [2/3]')
  })
})
