#!/usr/bin/env bun
/**
 * Soak test for the long-running data structures in the userscript.
 *
 * Why this exists: unit tests run for milliseconds. The audit found multiple
 * "memory leak after N hours" bugs (fetch-cache had no max-entries cap;
 * meme-contributor `times[]` and `nominationTimestamps[]` grew without
 * bound; shadow-learn observation list eviction was silently dropping the
 * wrong items). Coverage didn't catch any of them — they're invisible to a
 * test that runs for 10 ms.
 *
 * This script drives synthetic high-volume traffic through each bounded
 * data structure for SOAK_DURATION_MS, then asserts the structure stayed
 * within its declared cap.
 *
 * Run:
 *   bun run soak:cache                  # default 30 s × ~30 000 events/struct
 *   SOAK_DURATION_MS=300000 bun run soak:cache   # 5 min
 *
 * Exit code 1 when any structure breached its cap; CI uses this to fail.
 *
 * Add new soak targets by appending to `targets` below — each is a
 * self-contained `{ name, cap, drive }` triple.
 */

import { performance } from 'node:perf_hooks'

const DURATION_MS = Number.parseInt(process.env.SOAK_DURATION_MS ?? '30000', 10)
const EVENT_INTERVAL_MS = Number.parseInt(process.env.SOAK_EVENT_INTERVAL_MS ?? '1', 10)

// We import target modules here. The userscript modules touch `window` /
// `document` at top-level for some files, so we wire a minimal happy-dom
// stand-in if missing. soak runs against the *pure* logic of caches /
// queues, not anything DOM-dependent.
if (typeof globalThis.window === 'undefined') {
  // happy-dom is already in devDependencies for the regular test suite.
  const { Window } = await import('happy-dom')
  const win = new Window({ url: 'https://live.bilibili.com/12345' })
  // @ts-expect-error — wiring just-enough globals for the modules under test.
  globalThis.window = win
  // @ts-expect-error
  globalThis.document = win.document
  // @ts-expect-error
  globalThis.location = win.location
}

// Stub the GM_* APIs so gm-signal can boot without throwing.
const gmStore = new Map()
// @ts-expect-error
globalThis.GM_getValue = (key, def) => (gmStore.has(key) ? gmStore.get(key) : def)
// @ts-expect-error
globalThis.GM_setValue = (key, val) => gmStore.set(key, val)
// @ts-expect-error
globalThis.GM_deleteValue = key => gmStore.delete(key)

// ---------------------------------------------------------------------------
// Soak targets
// ---------------------------------------------------------------------------

const { FetchCache } = await import('../src/lib/fetch-cache.ts')

/**
 * Each target reports back: { name, breached: boolean, observed, cap }.
 * `drive(deadline)` runs synthetic events until performance.now() >= deadline,
 * then returns the largest observed size of the structure.
 */
const targets = [
  {
    name: 'FetchCache (default 128 entries)',
    cap: 128,
    async drive(deadline) {
      const cache = new FetchCache()
      let i = 0
      let maxSize = 0
      while (performance.now() < deadline) {
        // Distinct keys force eviction; otherwise the existing key just
        // refreshes its TTL and we don't exercise the cap.
        const key = `soak-key-${i++}`
        await cache.get({
          key,
          ttlMs: 60_000,
          fetcher: async () => ({ payload: i }),
        })
        if (cache._sizeForTests > maxSize) maxSize = cache._sizeForTests
        if (i % 5000 === 0) await sleep(0) // yield occasionally
      }
      return { observed: maxSize, eventsProcessed: i }
    },
  },
  {
    name: 'FetchCache TTL purge (entries with 0 ms TTL must not pile up)',
    cap: 128,
    async drive(deadline) {
      const cache = new FetchCache({ maxEntries: 64 })
      let i = 0
      let maxSize = 0
      while (performance.now() < deadline) {
        const key = `ttl-key-${i++}`
        await cache.get({
          key,
          ttlMs: 0, // every entry is "stale" on next get → forces eviction
          fetcher: async () => ({ payload: i }),
        })
        if (cache._sizeForTests > maxSize) maxSize = cache._sizeForTests
        if (i % 5000 === 0) await sleep(0)
      }
      return { observed: maxSize, eventsProcessed: i }
    },
  },
]

// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function fmtMem() {
  const m = process.memoryUsage()
  return `rss=${(m.rss / 1024 / 1024).toFixed(1)}MB heap=${(m.heapUsed / 1024 / 1024).toFixed(1)}MB`
}

async function main() {
  console.log(`[soak] duration=${DURATION_MS}ms event_interval=${EVENT_INTERVAL_MS}ms`)
  console.log(`[soak] starting memory: ${fmtMem()}`)

  let anyBreached = false
  for (const t of targets) {
    const start = performance.now()
    const deadline = start + DURATION_MS
    const memBefore = process.memoryUsage().heapUsed
    const { observed, eventsProcessed } = await t.drive(deadline)
    const memAfter = process.memoryUsage().heapUsed
    const elapsed = performance.now() - start
    const breached = observed > t.cap
    if (breached) anyBreached = true

    const heapGrowthMB = (memAfter - memBefore) / 1024 / 1024
    console.log(
      [
        `[soak] ${breached ? '❌' : '✅'} ${t.name}`,
        `cap=${t.cap}`,
        `observed_max=${observed}`,
        `events=${eventsProcessed}`,
        `elapsed_ms=${elapsed.toFixed(0)}`,
        `heap_growth=${heapGrowthMB.toFixed(2)}MB`,
      ].join(' ')
    )
  }

  console.log(`[soak] ending memory: ${fmtMem()}`)
  if (anyBreached) {
    console.error('[soak] ❌ at least one structure breached its declared cap.')
    process.exit(1)
  }
  console.log('[soak] ✅ all structures stayed within bounds.')
}

await main()
