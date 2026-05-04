/**
 * Shared GM-storage stub for unit tests.
 *
 * Background: bun's `mock.module` is process-wide, not file-scoped — once any
 * test file replaces `'$'` with a stateful mock (Map-backed GM_getValue /
 * GM_setValue), every other test file that runs later in the same worker
 * gets that same Map. Identical mock factories duplicated across files made
 * this worse: each file's local `gmStore = new Map()` would be the one
 * attached, depending on file load order.
 *
 * The two patterns that DO work:
 *   1. Use this helper. Each test file imports `installGmStoreMock` and
 *      calls it once at the top of the file. The helper installs the mock
 *      and returns a `reset()` you can call from `beforeEach`. The Map
 *      lives in this module's scope, so the `'$'` mock object identity
 *      stays stable across files even if multiple files install it.
 *   2. Don't mock internal project modules at all (per
 *      `feedback_bun_test_mocks.md`). Use DI hooks like
 *      `_setGmXhrForTests` instead — see `src/lib/gm-fetch.ts`.
 *
 * For tests that genuinely need to mock OTHER internal modules (api.ts,
 * wbi.ts, etc.), always spread the real exports first and only override
 * what's needed:
 *
 *   const realFoo = await import('../src/lib/foo')
 *   mock.module('../src/lib/foo', () => ({
 *     ...realFoo,
 *     someExport: testStub,
 *   }))
 *
 * Without `...realFoo`, downstream tests that imported `foo` for a different
 * named export will see "Export named '...' not found in module 'foo'".
 */

import { mock } from 'bun:test'

const gmStore = new Map<string, unknown>()

let installed = false

/**
 * Installs the shared `'$'` mock with a Map-backed GM storage that all
 * GM_getValue / GM_setValue / GM_deleteValue calls flow through. Idempotent
 * — calling it twice in the same process is a no-op.
 *
 * Returns:
 *   - `store`: the underlying Map (use directly when you want to seed
 *     specific values before module load: `store.set('foo', 5)` then
 *     `await import(...)`).
 *   - `reset()`: clears the Map. Wire into `beforeEach` to keep tests
 *     isolated within a file.
 */
export function installGmStoreMock(): { store: Map<string, unknown>; reset: () => void } {
  if (!installed) {
    installed = true
    mock.module('$', () => ({
      GM_addStyle: () => {},
      GM_deleteValue: (key: string) => {
        gmStore.delete(key)
      },
      GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
      GM_info: { script: { version: 'test' } },
      GM_setValue: (key: string, value: unknown) => {
        gmStore.set(key, value)
      },
      GM_xmlhttpRequest: () => {},
      unsafeWindow: globalThis,
    }))
  }
  return {
    store: gmStore,
    reset: () => {
      gmStore.clear()
    },
  }
}
