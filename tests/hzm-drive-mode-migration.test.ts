import { beforeEach, describe, expect, mock, test } from 'bun:test'

// Mock '$' once at file top so the store-hzm import below resolves cleanly even
// in a shared test process. The migration function itself takes injectable
// get/set, so we don't depend on the live mock state for the assertions.
mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const { HZM_DRIVE_MODE_MIGRATION_KEY, migrateLegacyHzmDriveMode } = await import('../src/lib/store-hzm')

// One-shot migration for legacy `hzmDriveMode='off'`. The old design used
// 'off' as a third mode meaning "stopped"; the new design narrows mode to
// 'heuristic'|'llm' and adds a separate `hzmDriveEnabled` switch. Old
// persisted values must be rewritten so the strict validator accepts them.
describe('migrateLegacyHzmDriveMode', () => {
  let store: Map<string, unknown>
  const io = {
    get: <T>(key: string, defaultValue: T): T => (store.has(key) ? (store.get(key) as T) : defaultValue),
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
  }

  beforeEach(() => {
    store = new Map()
  })

  test("rewrites 'off' to 'heuristic' and sets the migration flag on first run", () => {
    store.set('hzmDriveMode', 'off')

    migrateLegacyHzmDriveMode(io)

    expect(store.get('hzmDriveMode')).toBe('heuristic')
    expect(store.get(HZM_DRIVE_MODE_MIGRATION_KEY)).toBe(true)
  })

  test('leaves a non-legacy mode untouched but still records the migration flag', () => {
    store.set('hzmDriveMode', 'llm')

    migrateLegacyHzmDriveMode(io)

    expect(store.get('hzmDriveMode')).toBe('llm') // unchanged
    expect(store.get(HZM_DRIVE_MODE_MIGRATION_KEY)).toBe(true)
  })

  test('is idempotent — second invocation does not touch a user-changed value', () => {
    store.set('hzmDriveMode', 'off')
    migrateLegacyHzmDriveMode(io) // first run normalizes to 'heuristic'

    // User then deliberately switches back to llm.
    store.set('hzmDriveMode', 'llm')

    migrateLegacyHzmDriveMode(io) // second run must NOT clobber it.

    expect(store.get('hzmDriveMode')).toBe('llm')
  })

  test('handles missing key (fresh install) without writing a mode value', () => {
    // No 'hzmDriveMode' in store → migration sets only the flag.
    migrateLegacyHzmDriveMode(io)

    expect(store.has('hzmDriveMode')).toBe(false)
    expect(store.get(HZM_DRIVE_MODE_MIGRATION_KEY)).toBe(true)
  })
})
