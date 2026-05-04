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
})
