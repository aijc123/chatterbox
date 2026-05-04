/**
 * Defends the hardened `toNumber` helper in api.ts (audit A6).
 *
 * `toNumber` is module-private (used by `parseMedalRow` etc.) so it can't be
 * imported and called directly. We instead verify by structural inspection
 * that the source enforces:
 *   1. Number.isFinite — rejects `Infinity` (the original implementation
 *      accepted it after `typeof === 'number'`).
 *   2. Number.isInteger — rejects fractional values that JSON.parse may
 *      produce from "1.5" or "1e3" upstream.
 *   3. <= Number.MAX_SAFE_INTEGER — rejects IDs large enough to lose
 *      precision when round-tripped through JS numbers.
 *   4. >= 0 — rejects negative values explicitly so a callsite that forgets
 *      to add `> 0` still gets a safe answer.
 *
 * The fallback site `directId` (line ~133) is locked in to use `toNumber`
 * instead of bare `Number()` so it inherits the same bounds.
 *
 * This is a contract test, not a behavior test — but the contract is what
 * matters: the audit's concern was that future callers could accept unsafe
 * values, so we lock the helper's hardness in place.
 */

import { describe, expect, test } from 'bun:test'

const SRC_PATH = `${import.meta.dir}/../src/lib/api.ts`

describe('api.ts toNumber hardening (audit A6)', () => {
  test('toNumber rejects non-finite, non-integer, and oversize values', async () => {
    const src = await Bun.file(SRC_PATH).text()
    expect(src).toContain('Number.isFinite(n)')
    expect(src).toContain('Number.isInteger(n)')
    expect(src).toContain('Number.MAX_SAFE_INTEGER')
    expect(src).toMatch(/n\s*<\s*0/)
  })

  test('directId fallback in ensureRoomId uses toNumber, not bare Number()', async () => {
    const src = await Bun.file(SRC_PATH).text()
    // Pre-fix: `const directId = Number(shortUid)` accepted Infinity and >MAX_SAFE_INTEGER.
    // Post-fix: `const directId = toNumber(shortUid)` inherits the hardening.
    expect(src).toContain('const directId = toNumber(shortUid)')
    expect(src).not.toMatch(/const\s+directId\s*=\s*Number\(/)
  })
})
