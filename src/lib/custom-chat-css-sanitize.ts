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
  /** Original byte length before truncation/strip, in chars. Surfaced so the
   *  UI can show "已截断 1.2MB → 256KB" instead of only a count of dropped rules. */
  originalLength: number
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
// CSS 注释剥离器:`/* … */` 中间内容不参与规则,但攻击者可以在 `@imp/*x*/ort url(...)`
// 这样的位置塞注释,让逐字符正则失配。同 spec:CSS 注释是单层、非嵌套、跨行。
const COMMENT_RE = /\/\*[\s\S]*?\*\//g

/**
 * Resolve CSS character escapes (`\41` → `A`, `\\` → `\`, `\\@` → `@`) per the
 * CSS Syntax 3 spec. Without this, payloads like `@\69 mport url(evil)` or
 * `expressi\6Fn(...)` would be valid CSS but slip past the literal-character
 * regexes below. Escape syntax: backslash + 1–6 hex digits + optional
 * whitespace, OR backslash + any single non-hex/non-newline char.
 *
 * Note: the *runtime* stylesheet still parses the original escapes correctly;
 * we only un-escape for the purposes of *scanning*, then run the regex on the
 * normalized string. Because we replace matches inline on the normalized
 * string (not the original), the returned CSS is the post-normalization form
 * — escapes are gone from output, which is the right call here: a user
 * intentionally writing `\41` as the letter A doesn't need it preserved, and
 * keeping the original-form would force a much more complex "map normalized
 * indices back to original spans" pass.
 */
function normalizeEscapes(input: string): string {
  return input.replace(/\\([0-9a-fA-F]{1,6})\s?|\\([^\n])/g, (_match, hex, char) => {
    if (typeof hex === 'string') {
      const code = parseInt(hex, 16)
      // CSS spec: replace null / surrogate / out-of-range with U+FFFD.
      if (!Number.isFinite(code) || code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) {
        return '�'
      }
      return String.fromCodePoint(code)
    }
    return typeof char === 'string' ? char : ''
  })
}

/**
 * Returns a sanitized copy of `input` plus a small report of what was removed.
 * Always returns a string ≤ `CUSTOM_CHAT_CSS_MAX_LENGTH`. Empty input yields
 * `{ css: '', truncated: false, removedImports: 0, ... }`.
 */
export function sanitizeCustomChatCss(input: string): SanitizeResult {
  if (typeof input !== 'string' || input.length === 0) {
    return {
      css: '',
      truncated: false,
      originalLength: 0,
      removedImports: 0,
      removedUrlSchemes: 0,
      removedLegacyHooks: 0,
    }
  }

  const originalLength = input.length
  // 先按 *原始* 长度限流:某些用户的合法 CSS preset 可能跨越上限,既得
  // 截断在显式上限内,也得在剥离注释/escape 之后再次校验(见后)。
  let truncated = false
  let css = input
  if (css.length > CUSTOM_CHAT_CSS_MAX_LENGTH) {
    css = css.slice(0, CUSTOM_CHAT_CSS_MAX_LENGTH)
    truncated = true
  }

  // 关键:先把注释和 escape 都规范化掉,再跑黑名单正则。否则:
  //   - `@imp/*x*/ort url(evil.css)`     绕过 IMPORT_RE
  //   - `@\69 mport url(evil.css)`        绕过 IMPORT_RE
  //   - `url(\6a avascript:foo)`           绕过 URL_SCHEME_RE
  //   - `expressi\6Fn(alert(1))`          绕过 EXPRESSION_RE
  // 注释剥离不可逆——这是 sanitizer 的设计选择(用户的注释也会被丢)。
  css = css.replace(COMMENT_RE, '')
  css = normalizeEscapes(css)

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

  // 二次长度校验:strip 后理应更短,但 URL_SCHEME_RE 的替换文本
  // (`url("about:blank")`)比原文本短,综合应不超过上限。保险起见再裁一次。
  if (css.length > CUSTOM_CHAT_CSS_MAX_LENGTH) {
    css = css.slice(0, CUSTOM_CHAT_CSS_MAX_LENGTH)
    truncated = true
  }

  return { css, truncated, originalLength, removedImports, removedUrlSchemes, removedLegacyHooks }
}
