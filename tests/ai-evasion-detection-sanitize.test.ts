// Regression test for audit Finding #6: ai-evasion's upstream
// (`edge-workers.laplace.cn`) was treated as schema-trusted. A malformed or
// hostile response shape (sensitiveWords containing non-strings, oversized
// strings, or huge arrays) used to cascade into `replaceSensitiveWords` and
// either throw or silently produce garbage. `sanitizeDetectionResult` filters
// out anything that isn't a sane `string[]` before the result leaves the module.

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { sanitizeDetectionResult, SENSITIVE_WORD_MAX_LEN, SENSITIVE_WORDS_MAX_COUNT } = await import(
  '../src/lib/ai-evasion'
)

describe('sanitizeDetectionResult', () => {
  test('null / non-object → safe default', () => {
    expect(sanitizeDetectionResult(null)).toEqual({ hasSensitiveContent: false })
    expect(sanitizeDetectionResult(undefined)).toEqual({ hasSensitiveContent: false }) // skipcq: JS-W1042
    expect(sanitizeDetectionResult('not an object')).toEqual({ hasSensitiveContent: false })
    expect(sanitizeDetectionResult(42)).toEqual({ hasSensitiveContent: false })
  })

  test('valid shape passes through verbatim', () => {
    const out = sanitizeDetectionResult({
      hasSensitiveContent: true,
      sensitiveWords: ['a', 'bb'],
      severity: 'high',
      categories: ['profanity'],
    })
    expect(out.hasSensitiveContent).toBe(true)
    expect(out.sensitiveWords).toEqual(['a', 'bb'])
    expect(out.severity).toBe('high')
    expect(out.categories).toEqual(['profanity'])
  })

  test('sensitiveWords with non-string entries → entries filtered out', () => {
    const out = sanitizeDetectionResult({
      hasSensitiveContent: true,
      sensitiveWords: ['ok', 42, null, { foo: 'bar' }, 'also-ok'],
    })
    expect(out.sensitiveWords).toEqual(['ok', 'also-ok'])
  })

  test('sensitiveWords longer than SENSITIVE_WORD_MAX_LEN → entry dropped', () => {
    const oversized = 'x'.repeat(SENSITIVE_WORD_MAX_LEN + 1)
    const out = sanitizeDetectionResult({
      hasSensitiveContent: true,
      sensitiveWords: ['ok', oversized, 'still-ok'],
    })
    expect(out.sensitiveWords).toEqual(['ok', 'still-ok'])
  })

  test('empty sensitiveWords entry skipped', () => {
    const out = sanitizeDetectionResult({
      hasSensitiveContent: true,
      sensitiveWords: ['', 'real'],
    })
    expect(out.sensitiveWords).toEqual(['real'])
  })

  test('sensitiveWords list capped at SENSITIVE_WORDS_MAX_COUNT', () => {
    const tooMany = Array.from({ length: SENSITIVE_WORDS_MAX_COUNT + 10 }, (_, i) => `w${i}`)
    const out = sanitizeDetectionResult({ hasSensitiveContent: true, sensitiveWords: tooMany })
    expect(out.sensitiveWords).toHaveLength(SENSITIVE_WORDS_MAX_COUNT)
  })

  test('hasSensitiveContent that is not boolean → omitted (no truthy/falsy coercion)', () => {
    const out = sanitizeDetectionResult({ hasSensitiveContent: 'true' as unknown })
    expect(out.hasSensitiveContent).toBeUndefined()
  })
})
