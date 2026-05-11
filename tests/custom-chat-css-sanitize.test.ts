/**
 * Defends `sanitizeCustomChatCss` against the four attack/footgun vectors the
 * QA audit (A4) called out:
 *   1. `@import url('https://evil')` — bypasses the script's @connect
 *      allowlist and exfiltrates IP/UA to a third party.
 *   2. `url(javascript:alert(1))` and similar hostile URL schemes — older
 *      engines have executed these; defense in depth is cheap.
 *   3. Legacy `expression(...)` and `behavior:` IE attack surface — kept
 *      because old userscript managers sometimes embed legacy WebView shims.
 *   4. Megabyte-scale paste from a corrupted backup — would otherwise sit in
 *      GM storage and force a full stylesheet recompute on every signal tick.
 *
 * Pure function, no DOM needed.
 */

import { describe, expect, test } from 'bun:test'

import { CUSTOM_CHAT_CSS_MAX_LENGTH, sanitizeCustomChatCss } from '../src/lib/custom-chat-css-sanitize'

describe('sanitizeCustomChatCss', () => {
  test('returns the input untouched when it has no hostile content', () => {
    const input = '.lc-chat-message { color: red; background: rgba(0,0,0,.5); }'
    const r = sanitizeCustomChatCss(input)
    expect(r.css).toBe(input)
    expect(r.truncated).toBe(false)
    expect(r.removedImports).toBe(0)
    expect(r.removedUrlSchemes).toBe(0)
    expect(r.removedLegacyHooks).toBe(0)
  })

  test('strips @import directives and reports the count', () => {
    const input = `@import url('https://evil.example/leak.css');\nbody { color: red; }\n@import "https://example.com";`
    const r = sanitizeCustomChatCss(input)
    expect(r.removedImports).toBe(2)
    expect(r.css).not.toContain('@import')
    expect(r.css).toContain('color: red')
  })

  test('neutralizes url(javascript:...) but keeps the rest of the rule intact', () => {
    const input = `.x { background: url("javascript:alert(1)"); color: red; }`
    const r = sanitizeCustomChatCss(input)
    expect(r.removedUrlSchemes).toBe(1)
    expect(r.css).not.toContain('javascript:')
    expect(r.css).toContain('about:blank')
    expect(r.css).toContain('color: red')
  })

  test('neutralizes vbscript: and data:text/html schemes inside url()', () => {
    const input = [
      `.a { background: url(vbscript:msgbox); }`,
      `.b { background: url("data:text/html,<script>alert(1)</script>"); }`,
    ].join('\n')
    const r = sanitizeCustomChatCss(input)
    expect(r.removedUrlSchemes).toBe(2)
    expect(r.css).not.toContain('vbscript:')
    expect(r.css).not.toContain('data:text/html')
  })

  test('keeps benign url() like images and fonts intact', () => {
    const input = `.x { background: url('https://i0.hdslb.com/foo.png'); }`
    const r = sanitizeCustomChatCss(input)
    expect(r.removedUrlSchemes).toBe(0)
    expect(r.css).toBe(input)
  })

  test('strips expression(...) and behavior: legacy IE hooks', () => {
    const input = `.x { width: expression(alert(1)); behavior: url(htc.htc); }`
    const r = sanitizeCustomChatCss(input)
    expect(r.removedLegacyHooks).toBe(2)
    expect(r.css).not.toContain('expression(')
    expect(r.css).not.toContain('behavior:')
  })

  test('truncates input over CUSTOM_CHAT_CSS_MAX_LENGTH and reports it', () => {
    const huge = 'a'.repeat(CUSTOM_CHAT_CSS_MAX_LENGTH + 1000)
    const r = sanitizeCustomChatCss(huge)
    expect(r.truncated).toBe(true)
    expect(r.css.length).toBeLessThanOrEqual(CUSTOM_CHAT_CSS_MAX_LENGTH)
  })

  test('handles empty / non-string inputs without throwing', () => {
    expect(sanitizeCustomChatCss('').css).toBe('')
    // Cast to bypass the type signature — we want to confirm runtime safety
    // because the CSS string can come from a corrupted GM storage value.
    expect(sanitizeCustomChatCss(undefined as unknown as string).css).toBe('')
    expect(sanitizeCustomChatCss(null as unknown as string).css).toBe('')
  })

  test('chained attack: @import + javascript: url + huge — all guards fire together', () => {
    const css = [
      `@import url('https://evil');`,
      `.x { background: url("javascript:alert(1)"); }`,
      'a'.repeat(CUSTOM_CHAT_CSS_MAX_LENGTH),
    ].join('\n')
    const r = sanitizeCustomChatCss(css)
    expect(r.truncated).toBe(true)
    // After truncation, the @import and javascript: should both be gone if
    // they fell within the truncated window. They're at the very start, so
    // they survive truncation — and the strip rules then fire on them.
    expect(r.removedImports).toBeGreaterThanOrEqual(1)
    expect(r.css).not.toContain('@import')
    expect(r.css).not.toContain('javascript:')
  })

  // ---------------------------------------------------------------------------
  // Mutation-test targeted: pin the exact removed-substring contents so a
  // mutant that lets the replacer return "Stryker was here!" or skips the
  // regex with a flipped guard gets caught.
  // ---------------------------------------------------------------------------

  test('replacer returns EMPTY string, not a sentinel (@import)', () => {
    // Mutant: the `return ''` in the @import replacer changes to a non-empty
    // sentinel. The input rule is `@import 'x';` (10 chars). Sanitized
    // length must drop by at least that count.
    const before = `@import 'x';`
    const r = sanitizeCustomChatCss(before)
    expect(r.css).toBe('') // entire input was an @import; nothing remains
    expect(r.css.length).toBe(0)
  })

  test('replacer returns EMPTY string, not a sentinel (expression)', () => {
    // No nested parens — the [^)]* class stops at the first `)`, so
    // `expression(alert(1))` would leave a stray `)` behind. With a flat
    // expression we can pin the exact post-replace string.
    const before = `.x { width: expression(noNesting); color: red; }`
    const r = sanitizeCustomChatCss(before)
    expect(r.css).toBe('.x { width: ; color: red; }')
  })

  test('replacer returns EMPTY string, not a sentinel (behavior)', () => {
    const before = `.x { behavior: url(htc.htc); }`
    const r = sanitizeCustomChatCss(before)
    expect(r.css).toBe('.x {  }')
  })

  test('truncated boundary: input at exactly MAX_LENGTH is NOT truncated (kills `>` → `>=`)', () => {
    const exact = 'a'.repeat(CUSTOM_CHAT_CSS_MAX_LENGTH)
    const r = sanitizeCustomChatCss(exact)
    expect(r.truncated).toBe(false)
    expect(r.css.length).toBe(CUSTOM_CHAT_CSS_MAX_LENGTH)
  })

  test('truncated boundary: input at MAX_LENGTH+1 IS truncated', () => {
    const over = 'a'.repeat(CUSTOM_CHAT_CSS_MAX_LENGTH + 1)
    const r = sanitizeCustomChatCss(over)
    expect(r.truncated).toBe(true)
    expect(r.css.length).toBe(CUSTOM_CHAT_CSS_MAX_LENGTH)
  })

  test('initial-empty result has truncated=FALSE (kills BooleanLiteral mutant on the early-return)', () => {
    // The early-return shape is { css: '', truncated: false, ... }. If
    // `truncated` were mutated to `true`, callers might surface a misleading
    // "truncated content" warning even for an intentionally-empty input.
    expect(sanitizeCustomChatCss('').truncated).toBe(false)
    expect(sanitizeCustomChatCss(undefined as unknown as string).truncated).toBe(false)
    expect(sanitizeCustomChatCss(null as unknown as string).truncated).toBe(false)
  })

  test('@import regex matches BOTH with-semicolon and without-semicolon endings', () => {
    // Two @import rules: one terminated, one ending at EOF without ';'.
    // Mutant variants that drop the `;?` would only strip ONE; assertion
    // forces both to be removed.
    const css = `@import 'a.css';\n@import 'b.css'`
    const r = sanitizeCustomChatCss(css)
    expect(r.removedImports).toBe(2)
    expect(r.css).not.toContain('@import')
  })

  test('@import [^;]* class matches arbitrary content including quotes/parens (kills `[^;]` → `[;]`)', () => {
    // Mutant that flips `[^;]*` → `[;]*` would only strip @import that
    // contains semicolons as content (impossible). Assert that an @import
    // with diverse content (single quotes, parens, spaces) is fully removed.
    const css = `@import url('https://evil.example/a.css?x=1');\nbody{}`
    const r = sanitizeCustomChatCss(css)
    expect(r.removedImports).toBe(1)
    expect(r.css).toContain('body{}')
  })

  test('expression regex needs \\s* (whitespace ok), not \\S* (any non-ws)', () => {
    // Mutant `expression\s*\(...\)` → `expression\S*\(...\)` would only
    // match if there were a non-ws between `expression` and `(`. The real
    // CSS often has `expression(`. Assert the no-whitespace form is
    // stripped (and the WITH-whitespace form too).
    expect(sanitizeCustomChatCss('.x { x: expression(alert(1)); }').removedLegacyHooks).toBe(1)
    expect(sanitizeCustomChatCss('.x { x: expression (alert(1)); }').removedLegacyHooks).toBe(1)
  })

  test('behavior regex needs \\s* before `:` (kills `\\s` → `\\S`)', () => {
    // Mutant `behavior\s*:` → `behavior\S*:` would only match if a
    // non-whitespace lived between `behavior` and `:`. Real CSS may have
    // 0 or 1 whitespace.
    expect(sanitizeCustomChatCss('.x { behavior:url(a); }').removedLegacyHooks).toBe(1)
    expect(sanitizeCustomChatCss('.x { behavior :url(a); }').removedLegacyHooks).toBe(1)
  })

  test('behavior regex [^;]* allows everything-but-semicolon as value', () => {
    // Mutant `[^;]` → `[;]` would fail to strip non-semicolon content.
    // Real values like `url(file.htc)` have neither semicolons internally.
    expect(sanitizeCustomChatCss('.x { behavior: url(file.htc); }').removedLegacyHooks).toBe(1)
    expect(sanitizeCustomChatCss('.x { behavior: foo bar baz; }').removedLegacyHooks).toBe(1)
  })

  test('url() scheme regex must require WHITESPACE inside `url(` argument area, then NON-ws scheme', () => {
    // Mutant `url\(\s*` → `url\(\S*` would change "url(" with optional
    // whitespace-then-quote to "url(" with non-ws-then-quote. Match for
    // benign `url( "javascript:..." )` (with leading whitespace) should
    // still neutralize.
    expect(
      sanitizeCustomChatCss('.x { background: url( "javascript:alert(1)" ); }').removedUrlSchemes
    ).toBe(1)
    expect(sanitizeCustomChatCss('.x { background: url("javascript:alert(1)"); }').removedUrlSchemes).toBe(1)
  })

  test('input type guard: non-string returns empty result (kills `||` → `&&`-ish flip)', () => {
    // `typeof input !== 'string' || input.length === 0` → false mutant
    // would let non-string input slip through and crash on `.length` or
    // `.replace`. Confirms safety.
    expect(() => sanitizeCustomChatCss(undefined as unknown as string)).not.toThrow()
    expect(() => sanitizeCustomChatCss(null as unknown as string)).not.toThrow()
    expect(() => sanitizeCustomChatCss(42 as unknown as string)).not.toThrow()
    expect(() => sanitizeCustomChatCss({} as unknown as string)).not.toThrow()
    expect(sanitizeCustomChatCss(42 as unknown as string).css).toBe('')
  })
})
