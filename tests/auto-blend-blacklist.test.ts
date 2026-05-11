import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}

// auto-blend imports API/WBI modules that patch XMLHttpRequest at module load.
// The blacklist helper itself is pure, but the test environment still needs
// this browser stub for the import graph.
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

const { autoBlendMessageBlacklist, autoBlendUserBlacklist } = await import('../src/lib/store')
const { isAutoBlendBlacklistedText, isAutoBlendBlacklistedUid } = await import('../src/lib/auto-blend-blacklist')

describe('auto-blend blacklist', () => {
  beforeEach(() => {
    autoBlendUserBlacklist.value = { '1001': 'blocked-user' }
  })

  test('matches blacklisted uids only', () => {
    expect(isAutoBlendBlacklistedUid('1001')).toBe(true)
    expect(isAutoBlendBlacklistedUid('1002')).toBe(false)
    expect(isAutoBlendBlacklistedUid(null)).toBe(false)
  })

  test("returns false for empty-string uid (locks the `uid !== ''` short-circuit)", () => {
    // Without the `uid !== ''` clause, `'' in {'': true}` could pass — and
    // worse, `'' in {}` happens to be false but `'' in {someKey: …}` is also
    // false, so this branch is only observable when blacklist actually has
    // an empty-string key.
    autoBlendUserBlacklist.value = { '': 'sentinel', '1001': 'blocked-user' }
    expect(isAutoBlendBlacklistedUid('')).toBe(false)
    // Sanity: the '1001' entry still matches under the same blacklist.
    expect(isAutoBlendBlacklistedUid('1001')).toBe(true)
  })

  test('all three conditions are AND-ed (locks `&&` against `||` mutation)', () => {
    autoBlendUserBlacklist.value = { '1001': 'blocked' }
    // null uid + uid not in map → null path
    expect(isAutoBlendBlacklistedUid(null)).toBe(false)
    // empty uid + uid not in map → '' path
    expect(isAutoBlendBlacklistedUid('')).toBe(false)
    // non-null non-empty uid not in map → 'in' check fails
    expect(isAutoBlendBlacklistedUid('9999')).toBe(false)
    // all three pass
    expect(isAutoBlendBlacklistedUid('1001')).toBe(true)
  })
})

describe('isAutoBlendBlacklistedText', () => {
  beforeEach(() => {
    autoBlendMessageBlacklist.value = { '666': true, '+1': true, 哈哈哈: true }
  })

  test('matches user-blacklisted text exactly', () => {
    expect(isAutoBlendBlacklistedText('666')).toBe(true)
    expect(isAutoBlendBlacklistedText('+1')).toBe(true)
    expect(isAutoBlendBlacklistedText('哈哈哈')).toBe(true)
  })

  test('does not match unrelated text', () => {
    expect(isAutoBlendBlacklistedText('上车')).toBe(false)
    expect(isAutoBlendBlacklistedText('66')).toBe(false) // partial — must be exact
    expect(isAutoBlendBlacklistedText('6666')).toBe(false)
    expect(isAutoBlendBlacklistedText('6 6 6')).toBe(false)
  })

  test('returns false for empty string (recordDanmaku already trims to nothing)', () => {
    expect(isAutoBlendBlacklistedText('')).toBe(false)
  })

  // Critical regression case: the upstream port (16972c7) specifically fixed
  // `in` → `Object.hasOwn` for this reason — `in` walks the prototype chain
  // so any text matching an Object.prototype property name (`toString`,
  // `constructor`, `valueOf`, `hasOwnProperty`, ...) would silently get
  // filtered as if blacklisted, even when the user's blacklist is empty.
  test('does NOT false-match Object.prototype property names when blacklist is empty', () => {
    autoBlendMessageBlacklist.value = {}
    for (const key of [
      'toString',
      'constructor',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      '__proto__',
    ]) {
      expect(isAutoBlendBlacklistedText(key)).toBe(false)
    }
  })

  test('does NOT false-match Object.prototype property names even when blacklist has unrelated entries', () => {
    autoBlendMessageBlacklist.value = { '666': true }
    expect(isAutoBlendBlacklistedText('toString')).toBe(false)
    expect(isAutoBlendBlacklistedText('constructor')).toBe(false)
  })

  test('DOES match a Object.prototype name if user explicitly added it (edge case)', () => {
    // The fix is "don't false-match", not "block the user from blacklisting
    // these strings if they really want to". A user who genuinely never
    // wants "toString" in their auto-blend should still be able to.
    autoBlendMessageBlacklist.value = { toString: true }
    expect(isAutoBlendBlacklistedText('toString')).toBe(true)
  })

  test('case-sensitive: B站 chat is case-sensitive so the helper is too', () => {
    autoBlendMessageBlacklist.value = { Hello: true }
    expect(isAutoBlendBlacklistedText('Hello')).toBe(true)
    expect(isAutoBlendBlacklistedText('hello')).toBe(false)
    expect(isAutoBlendBlacklistedText('HELLO')).toBe(false)
  })
})
