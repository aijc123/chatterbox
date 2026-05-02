import { mock } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  // No-op stub. Tests that exercise gm-fetch.ts (or transitively load it via
  // sbhzm-client / llm-driver) override this with a real fake implementation.
  GM_xmlhttpRequest: () => {},
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
