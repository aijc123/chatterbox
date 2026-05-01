import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { autoBlendEnabled, customChatEnabled, msgSendInterval } = await import('../src/lib/store')

describe('store re-export compatibility', () => {
  test('keeps existing store imports available', () => {
    expect(typeof msgSendInterval.value).toBe('number')
    expect(typeof customChatEnabled.value).toBe('boolean')
    expect(typeof autoBlendEnabled.value).toBe('boolean')
  })
})
