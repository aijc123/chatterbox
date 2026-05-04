/**
 * Defends the WS payload coercion diagnostics (audit A10).
 *
 * `live-ws-source.ts` calls `asNumber` / `asString` on every B 站 WS
 * payload field. Pre-fix, both helpers silently fell back to 0 / '' on any
 * unexpected shape — when B 站 ships a schema change (e.g. price field
 * becomes string-of-cents instead of number-of-yuan), every event quietly
 * loses the field and users only notice "all gifts show 0 元" days later.
 * Post-fix, surprise shapes increment counters surfaced via
 * `window.__chatterboxLiveWsCoercion` so issue reports include them.
 *
 * Importing live-ws-source directly drags in api.ts and the WS plumbing,
 * which is heavy and conflicts with other tests' `mock.module` calls. We
 * test the contract by structural inspection of the source — same pattern
 * as wbi-diagnostics.
 */

import { describe, expect, test } from 'bun:test'

const SRC_PATH = `${import.meta.dir}/../src/lib/live-ws-source.ts`

describe('liveWsCoercionDiagnostics (audit A10)', () => {
  test('source declares the diagnostic counter object', async () => {
    const src = await Bun.file(SRC_PATH).text()
    expect(src).toContain('liveWsCoercionDiagnostics')
    expect(src).toContain('numberFallbacks')
    expect(src).toContain('stringFallbacks')
  })

  test('asNumber bumps numberFallbacks on surprise non-number, non-null shapes', async () => {
    const src = await Bun.file(SRC_PATH).text()
    expect(src).toMatch(/asNumber[\s\S]*?numberFallbacks\+\+/)
    // null/undefined are explicit "field absent" signals on B 站 — they
    // shouldn't trigger the counter (otherwise it would always be huge and
    // useless for triage).
    expect(src).toMatch(/asNumber[\s\S]*?value !== undefined && value !== null/)
  })

  test('asString bumps stringFallbacks on surprise non-string, non-null shapes', async () => {
    const src = await Bun.file(SRC_PATH).text()
    expect(src).toMatch(/asString[\s\S]*?stringFallbacks\+\+/)
    expect(src).toMatch(/asString[\s\S]*?value !== undefined && value !== null/)
  })

  test('exposes the counter on window for DevTools triage', async () => {
    const src = await Bun.file(SRC_PATH).text()
    expect(src).toContain('__chatterboxLiveWsCoercion')
    expect(src).toContain('typeof window')
  })
})
