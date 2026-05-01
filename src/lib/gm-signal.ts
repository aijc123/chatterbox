import { effect, type Signal, signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'

const registry = new Map<string, Signal<unknown>>()
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>()
const lastPersistedValues = new Map<string, unknown>()
const GM_PERSIST_DEBOUNCE_MS = 150

function flushSignalValue(key: string, value: unknown): void {
  pendingWrites.delete(key)
  GM_setValue(key, value)
  lastPersistedValues.set(key, value)
}

function schedulePersist(key: string, value: unknown): void {
  const previousTimer = pendingWrites.get(key)
  if (previousTimer) clearTimeout(previousTimer)
  pendingWrites.set(
    key,
    setTimeout(() => {
      flushSignalValue(key, value)
    }, GM_PERSIST_DEBOUNCE_MS)
  )
}

function flushPendingWrites(): void {
  for (const [key, timer] of pendingWrites) {
    clearTimeout(timer)
    const current = registry.get(key)
    if (current) flushSignalValue(key, current.value)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushPendingWrites)
}

/**
 * Creates a signal whose value is read from and persisted to GM storage
 * under the given key. The signal is registered so that applyImportedSettings
 * can update it in-memory without requiring a page refresh.
 */
export function gmSignal<T>(key: string, defaultValue: T) {
  const initialValue = GM_getValue(key, defaultValue)
  const s = signal<T>(initialValue)
  registry.set(key, s as Signal<unknown>)
  lastPersistedValues.set(key, initialValue)
  let isFirstRun = true
  effect(() => {
    const nextValue = s.value
    if (isFirstRun) {
      isFirstRun = false
      return
    }
    if (Object.is(lastPersistedValues.get(key), nextValue)) return
    schedulePersist(key, nextValue)
  })
  return s
}

/**
 * Applies a record of imported settings to both GM storage and the live
 * in-memory signals, so changes take effect immediately without a page refresh.
 * Keys not present in the registry are silently ignored.
 */
export function applyImportedSettings(data: Record<string, unknown>): void {
  for (const [key, val] of Object.entries(data)) {
    const s = registry.get(key)
    if (s) (s as Signal<unknown>).value = val
  }
}
