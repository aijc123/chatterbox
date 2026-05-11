/**
 * Property-based fuzz tests for `splitTextSmart` / `trimText` / `processMessages`.
 *
 * Why these exist: the audit found `splitTextSmart('   '.repeat(20), 10)`
 * returned `[]` — empty output for non-empty input. 100 % line coverage, but
 * no existing test fed that input. Fuzz tests assert invariants that hold
 * across every input fast-check generates, so the same class of bug can't
 * sneak back in for a different shape of "weird whitespace".
 *
 * Each property runs FAST_CHECK_NUM_RUNS times (default 100; CI weekly bumps
 * to 10 000) and shrinks any failing case to the minimum reproducer.
 */

import { describe, test } from 'bun:test'
import * as fc from 'fast-check'

import { getGraphemes, processMessages, splitTextSmart, trimText } from '../../src/lib/utils'

const NUM_RUNS = Number.parseInt(process.env.FAST_CHECK_NUM_RUNS ?? '100', 10)
const FC_OPTS = { numRuns: NUM_RUNS, verbose: 1 } as const

describe('splitTextSmart — fuzz invariants', () => {
  test('non-empty input always produces non-empty output array', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 500 }), fc.integer({ min: 1, max: 50 }), (text, maxLen) => {
        const out = splitTextSmart(text, maxLen)
        // INVARIANT: function may not return [] for non-empty input.
        // Audit case: text='   '.repeat(20), maxLen=10 → []
        return Array.isArray(out) && out.length > 0
      }),
      FC_OPTS
    )
  })

  test('every chunk respects maxLen (grapheme count)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 500 }), fc.integer({ min: 1, max: 50 }), (text, maxLen) => {
        const out = splitTextSmart(text, maxLen)
        // INVARIANT: maxLen is a hard upper bound; no chunk may exceed it.
        // tail-rebalance must respect this contract.
        for (const chunk of out) {
          if (getGraphemes(chunk).length > maxLen) return false
        }
        return true
      }),
      FC_OPTS
    )
  })

  test('zero / negative maxLen returns input unchanged in single-element array', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 100 }), fc.integer({ min: -100, max: 0 }), (text, maxLen) => {
        const out = splitTextSmart(text, maxLen)
        // INVARIANT: degenerate maxLen ≤ 0 short-circuits to [text].
        return out.length === 1 && out[0] === text
      }),
      FC_OPTS
    )
  })

  test('CJK + ASCII + emoji round-trip preserves total grapheme count when no whitespace cut', () => {
    // Whitespace cut consumes a space, so this property only holds for inputs
    // without internal whitespace. Use CJK + emoji + ASCII alphanumerics.
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('一', '二', '三', '😀', '🎉', 'a', 'b', '。', '，'), { minLength: 1, maxLength: 60 }),
        fc.integer({ min: 1, max: 20 }),
        (chars, maxLen) => {
          const text = chars.join('')
          const out = splitTextSmart(text, maxLen)
          const totalGraphemes = out.reduce((n, c) => n + getGraphemes(c).length, 0)
          // INVARIANT: no graphemes are silently dropped (other than consumed
          // whitespace, which this input intentionally avoids).
          return totalGraphemes === getGraphemes(text).length
        }
      ),
      FC_OPTS
    )
  })
})

describe('trimText — fuzz invariants', () => {
  test('every chunk respects maxLength (grapheme count)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), fc.integer({ min: 1, max: 30 }), (text, maxLength) => {
        const out = trimText(text, maxLength)
        for (const chunk of out) {
          if (getGraphemes(chunk).length > maxLength) return false
        }
        return true
      }),
      FC_OPTS
    )
  })

  test('round-trip preserves all graphemes (no chunk drops content)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), fc.integer({ min: 1, max: 30 }), (text, maxLength) => {
        const out = trimText(text, maxLength)
        const joined = out.join('')
        return joined === text
      }),
      FC_OPTS
    )
  })
})

describe('processMessages — fuzz invariants', () => {
  test('every output line is non-empty after trim', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), fc.integer({ min: 1, max: 30 }), (text, maxLength) => {
        const out = processMessages(text, maxLength)
        for (const line of out) {
          if (line.trim().length === 0) return false
        }
        return true
      }),
      FC_OPTS
    )
  })

  test('every output line respects maxLength', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), fc.integer({ min: 1, max: 30 }), (text, maxLength) => {
        const out = processMessages(text, maxLength)
        for (const line of out) {
          if (getGraphemes(line).length > maxLength) return false
        }
        return true
      }),
      FC_OPTS
    )
  })
})
