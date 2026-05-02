import { effect, type Signal, signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'

const registry = new Map<string, Signal<unknown>>()
// Optional per-signal validators used by `applyImportedSettings` to reject
// imported values that don't match the in-memory shape. Without this guard, a
// malicious or malformed backup could silently corrupt runtime state (e.g.
// `msgSendInterval = "5"` -> `interval * 1000` = NaN).
const validators = new Map<string, (val: unknown) => boolean>()
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>()
const lastPersistedValues = new Map<string, unknown>()
const GM_PERSIST_DEBOUNCE_MS = 150

export type GmSignalOptions<T> = {
  /** Returns true when `val` is a valid replacement for this signal. */
  validate?: (val: unknown) => val is T
}

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

/**
 * Force-persist any signal writes that are still inside the debounce window.
 * Wired up to `beforeunload`/`pagehide`/`visibilitychange=hidden` so a tab
 * closing or backgrounding doesn't drop the user's most recent settings
 * change. Exported for unit tests.
 */
export function flushPendingWrites(): void {
  for (const [key, timer] of pendingWrites) {
    clearTimeout(timer)
    const current = registry.get(key)
    if (current) flushSignalValue(key, current.value)
  }
}

if (typeof window !== 'undefined') {
  // `beforeunload` is unreliable on mobile browsers and back-forward cache; use
  // `pagehide` and `visibilitychange` to flush whenever the page is being
  // backgrounded or torn down.
  window.addEventListener('beforeunload', flushPendingWrites)
  window.addEventListener('pagehide', flushPendingWrites)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingWrites()
    })
  }
}

/**
 * Creates a signal whose value is read from and persisted to GM storage
 * under the given key. The signal is registered so that applyImportedSettings
 * can update it in-memory without requiring a page refresh.
 */
export function gmSignal<T>(key: string, defaultValue: T, options?: GmSignalOptions<T>) {
  const initialValue = GM_getValue(key, defaultValue)
  const s = signal<T>(initialValue)
  registry.set(key, s as Signal<unknown>)
  lastPersistedValues.set(key, initialValue)
  if (options?.validate) validators.set(key, options.validate)
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
 * Returns true if the value passes the registered validator for this key, or
 * if no validator is registered (back-compat for keys that haven't been
 * annotated yet — they fall back to a coarse typeof check against the live
 * signal value).
 */
export function isValidImportedValue(key: string, val: unknown): boolean {
  const validator = validators.get(key)
  if (validator) return validator(val)
  const s = registry.get(key)
  if (!s) return false
  const current = s.value
  if (val === null || current === null) return val === null && current === null
  if (Array.isArray(current)) return Array.isArray(val)
  return typeof val === typeof current
}

/**
 * Applies a record of imported settings to both GM storage and the live
 * in-memory signals, so changes take effect immediately without a page refresh.
 * Keys not present in the registry, or whose value fails validation, are
 * silently ignored. Returns the count of keys actually applied.
 */
export function applyImportedSettings(data: Record<string, unknown>): number {
  let applied = 0
  for (const [key, val] of Object.entries(data)) {
    const s = registry.get(key)
    if (!s) continue
    if (!isValidImportedValue(key, val)) continue
    ;(s as Signal<unknown>).value = val
    applied++
  }
  return applied
}
