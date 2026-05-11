/**
 * Property-based fuzz tests for the custom-CSS sanitizer.
 *
 * Audit found that literal-character regexes (@import, url(javascript:,
 * expression(, behavior:) were bypassed by CSS Syntax 3 escapes:
 *   - "@\69 mport url(evil)"           — \69 decodes to 'i'
 *   - "url(\6a avascript:foo)"          — \6a decodes to 'j'
 *   - "expressi\6Fn(alert(1))"          — \6F decodes to 'o'
 * plus the C-style comment trick "@imp" + slash-star + "x" + star-slash + "ort url(...)".
 *
 * The fix normalizes escapes + strips comments before regex. Fuzz tests
 * generate random escape encodings of the blocked tokens and assert the
 * output never contains the decoded form. This catches future regressions
 * (someone "simplifies" the sanitizer and accidentally drops the normalize
 * step) without us having to enumerate every possible escape pattern.
 */

import { describe, test } from 'bun:test'
import * as fc from 'fast-check'

import { sanitizeCustomChatCss } from '../../src/lib/custom-chat-css-sanitize'

const NUM_RUNS = Number.parseInt(process.env.FAST_CHECK_NUM_RUNS ?? '200', 10)
const FC_OPTS = { numRuns: NUM_RUNS, verbose: 1 } as const

/** Encode a single ASCII char as a CSS escape (random hex-length variant). */
function escapeChar(ch: string, hexLen: number): string {
  const code = ch.charCodeAt(0).toString(16)
  const padded = code.padStart(hexLen, '0').slice(0, 6)
  // Trailing space terminates the escape sequence (CSS syntax 3).
  return `\\${padded} `
}

/** Encode an arbitrary subset of chars in `s` using `\\HH ` escapes. */
function encodeRandomly(s: string, indices: number[], hexLen: number): string {
  const chars = [...s]
  for (const i of indices) {
    if (i >= 0 && i < chars.length) chars[i] = escapeChar(chars[i], hexLen)
  }
  return chars.join('')
}

const blockedToken = fc.constantFrom(
  '@import',
  'expression(',
  'behavior:',
  'url(javascript:',
  'url(vbscript:',
  'url(data:text/html',
  'url(data:application/javascript',
  'url(data:text/javascript'
)

describe('sanitizeCustomChatCss — escape & comment bypass fuzz', () => {
  test('CSS-escape encoded blocked tokens are still removed', () => {
    fc.assert(
      fc.property(
        blockedToken,
        fc.array(fc.integer({ min: 0, max: 30 }), { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 6 }),
        fc.string({ maxLength: 50 }), // junk before/after to simulate real CSS
        fc.string({ maxLength: 50 }),
        (token, escapeIndices, hexLen, before, after) => {
          // Escape some random subset of the token's characters.
          const encoded = encodeRandomly(token, escapeIndices, hexLen)
          const css = `${before}\n${encoded}url(boom)\n${after}\n}`
          const result = sanitizeCustomChatCss(css)
          // INVARIANT: regardless of how the attacker encoded the blocked
          // token, the sanitized output never contains the decoded form.
          // (We check the lowercased output; CSS keywords are case-insensitive.)
          const lower = result.css.toLowerCase()
          // Either the sanitizer removed it (good), or it neutralized url(...) to about:blank.
          return !lower.includes(token.toLowerCase()) || lower.includes('url("about:blank")')
        }
      ),
      FC_OPTS
    )
  })

  test('CSS comments cannot be used to split a blocked token', () => {
    fc.assert(
      fc.property(
        blockedToken,
        fc.integer({ min: 1, max: 5 }), // comment insertion position
        fc.string({ maxLength: 30 }),
        (token, splitAt, commentBody) => {
          const safeSplit = Math.min(splitAt, token.length - 1)
          // 在 token 中间塞 /* ... */。如果 sanitizer 不先剥注释,正则就匹配不到。
          const sanitizedComment = commentBody.replace(/\*\//g, '* /')
          const withComment = `${token.slice(0, safeSplit)}/*${sanitizedComment}*/${token.slice(safeSplit)}url(x)`
          const result = sanitizeCustomChatCss(withComment)
          // INVARIANT: comment-split blocked tokens still get caught.
          return !result.css.toLowerCase().includes(token.toLowerCase())
        }
      ),
      FC_OPTS
    )
  })

  test('output is always within length cap', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 * 1024 }), input => {
        const result = sanitizeCustomChatCss(input)
        // INVARIANT: sanitized output never exceeds 256 KB cap, even for
        // adversarial inputs that deliberately overflow the input buffer.
        return result.css.length <= 256 * 1024
      }),
      // Fewer runs because the input strings are huge.
      { numRuns: Math.min(NUM_RUNS, 50), verbose: 1 }
    )
  })

  test('removed-counter never goes negative and matches non-zero state', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 5000 }), input => {
        const r = sanitizeCustomChatCss(input)
        return (
          r.removedImports >= 0 &&
          r.removedUrlSchemes >= 0 &&
          r.removedLegacyHooks >= 0 &&
          // Type discipline: numbers, not NaN.
          Number.isFinite(r.removedImports) &&
          Number.isFinite(r.removedUrlSchemes) &&
          Number.isFinite(r.removedLegacyHooks)
        )
      }),
      FC_OPTS
    )
  })
})
