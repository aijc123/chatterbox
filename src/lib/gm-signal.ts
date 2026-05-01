import { effect, type Signal, signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'

const registry = new Map<string, Signal<unknown>>()

/**
 * Creates a signal whose value is read from and persisted to GM storage
 * under the given key. The signal is registered so that applyImportedSettings
 * can update it in-memory without requiring a page refresh.
 */
export function gmSignal<T>(key: string, defaultValue: T) {
  const s = signal<T>(GM_getValue(key, defaultValue))
  registry.set(key, s as Signal<unknown>)
  effect(() => GM_setValue(key, s.value))
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
