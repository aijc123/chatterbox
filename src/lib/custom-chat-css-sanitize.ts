/**
 * Sanitizer for the user-supplied Chatterbox Chat custom CSS string.
 *
 * Goals (in priority order):
 *  1. Block `@import` rules — these can fetch arbitrary remote URLs and
 *     bypass the script's @connect allowlist (a corrupted backup or a
 *     malicious "theme preset" could otherwise smuggle network calls).
 *  2. Block `url(javascript:...)`, `url(data:text/html,...)`, and similar
 *     hostile URL schemes inside `url(...)` — even though browsers no longer
 *     execute most of these, defense-in-depth is cheap.
 *  3. Block `expression(` (legacy IE attack surface) and `behavior:` (old IE).
 *  4. Cap total length so a botched backup or accidental megabyte-paste
 *     can't bloat the GM storage record or force a full stylesheet reparse.
 *
 * Returned shape lets callers surface dropped-content warnings — settings UI
 * can show "已自动剔除 N 条 @import / 不安全的 url() 引用" and avoid silent
 * data loss.
 */

/** Hard upper bound on stored / injected CSS length. */
export const CUSTOM_CHAT_CSS_MAX_LENGTH = 256 * 1024

export interface SanitizeResult {
  css: string
  /** The CSS exceeded `CUSTOM_CHAT_CSS_MAX_LENGTH` and was truncated. */
  truncated: boolean
  /** Number of `@import` directives that were stripped. */
  removedImports: number
  /** Number of disallowed `url(...)` references that were neutralized. */
  removedUrlSchemes: number
  /** Number of `expression(...)` / `behavior:` legacy IE hooks that were stripped. */
  removedLegacyHooks: number
}

const IMPORT_RE = /@import[^;]*;?/gi
const URL_SCHEME_RE =
  /url\(\s*(["']?)\s*(javascript:|vbscript:|data:text\/html|data:application\/javascript|data:text\/javascript)[^)]*\)/gi
const EXPRESSION_RE = /expression\s*\([^)]*\)/gi
const BEHAVIOR_RE = /behavior\s*:[^;]*;?/gi

/**
 * Returns a sanitized copy of `input` plus a small report of what was removed.
 * Always returns a string ≤ `CUSTOM_CHAT_CSS_MAX_LENGTH`. Empty input yields
 * `{ css: '', truncated: false, removedImports: 0, ... }`.
 */
export function sanitizeCustomChatCss(input: string): SanitizeResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { css: '', truncated: false, removedImports: 0, removedUrlSchemes: 0, removedLegacyHooks: 0 }
  }

  let truncated = false
  let css = input
  if (css.length > CUSTOM_CHAT_CSS_MAX_LENGTH) {
    css = css.slice(0, CUSTOM_CHAT_CSS_MAX_LENGTH)
    truncated = true
  }

  let removedImports = 0
  css = css.replace(IMPORT_RE, () => {
    removedImports++
    return ''
  })

  let removedUrlSchemes = 0
  css = css.replace(URL_SCHEME_RE, () => {
    removedUrlSchemes++
    return 'url("about:blank")'
  })

  let removedLegacyHooks = 0
  css = css.replace(EXPRESSION_RE, () => {
    removedLegacyHooks++
    return ''
  })
  css = css.replace(BEHAVIOR_RE, () => {
    removedLegacyHooks++
    return ''
  })

  return { css, truncated, removedImports, removedUrlSchemes, removedLegacyHooks }
}
