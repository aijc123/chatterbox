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

const { autoBlendUserBlacklist } = await import('../src/lib/store')
const { isAutoBlendBlacklistedUid } = await import('../src/lib/auto-blend-blacklist')

describe('auto-blend blacklist', () => {
  beforeEach(() => {
    autoBlendUserBlacklist.value = { '1001': 'blocked-user' }
  })

  test('matches blacklisted uids only', () => {
    expect(isAutoBlendBlacklistedUid('1001')).toBe(true)
    expect(isAutoBlendBlacklistedUid('1002')).toBe(false)
    expect(isAutoBlendBlacklistedUid(null)).toBe(false)
  })
})
