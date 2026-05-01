import { mock } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

if (!('XMLHttpRequest' in globalThis)) {
  class TestXMLHttpRequest {
    responseText = ''

    addEventListener(): void {}

    open(): void {}

    send(): void {}
  }

  ;(globalThis as typeof globalThis & { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest
}
