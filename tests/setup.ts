import { mock } from 'bun:test'

// Default `'$'` mock for tests that don't need stateful GM storage. The
// `GM_getValue` shim returns the caller-supplied default; writes are
// discarded. Tests that need a real Map-backed store (e.g. backup-import
// validators, gm-signal lifecycle) should use `tests/_gm-store.ts`'s
// `installGmStoreMock()` instead — that helper installs an idempotent,
// stateful mock and exposes `reset()` for `beforeEach`.
//
// CROSS-FILE NOTE: bun's `mock.module` is process-wide, not file-scoped.
// Once any test file replaces `'$'` with a stateful mock, every test file
// that runs LATER in the same worker gets that same mock object. The two
// safe paths:
//   1. Use `installGmStoreMock()` (which only installs once, idempotent).
//   2. When mocking other internal modules (e.g. `../src/lib/api`),
//      ALWAYS spread the real module first:
//          const realFoo = await import('../src/lib/foo')
//          mock.module('../src/lib/foo', () => ({ ...realFoo, override }))
//      Otherwise downstream files that import a different named export
//      from the same module will fail with "Export named ... not found".
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
