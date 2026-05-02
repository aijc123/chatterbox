// Regression test for the M-fix: AI-evasion previously enqueued any value
// returned by `replaceSensitiveWords`, including the empty string when the
// detected sensitive words consumed the whole message.

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { isEvadedMessageSendable, replaceSensitiveWords, processText } = await import('../src/lib/ai-evasion')

describe('AI-evasion empty-string guard', () => {
  test('isEvadedMessageSendable rejects empty/whitespace-only strings', () => {
    expect(isEvadedMessageSendable('')).toBe(false)
    expect(isEvadedMessageSendable('   ')).toBe(false)
    expect(isEvadedMessageSendable('\t\n  ')).toBe(false)
  })

  test('isEvadedMessageSendable accepts strings with at least one non-ws char', () => {
    expect(isEvadedMessageSendable('a')).toBe(true)
    expect(isEvadedMessageSendable('  hi  ')).toBe(true)
    // After insertInvisibleChars: contains soft-hyphens + visible chars.
    expect(isEvadedMessageSendable(processText('hello'))).toBe(true)
  })

  test('replaceSensitiveWords ignores empty entries instead of expanding to bookend matches', () => {
    // Pre-fix: ''.split('') returned ['', 'a', 'b', 'c', ''] then joined
    // back, which could mangle the message. The guard now skips empty words.
    expect(replaceSensitiveWords('hello', [''])).toBe('hello')
    expect(replaceSensitiveWords('hello', ['', 'l'])).toContain(processText('l'))
  })

  test('replaces matched words with insert-invisible-char form', () => {
    const result = replaceSensitiveWords('say hello to hello', ['hello'])
    expect(result.includes('hello')).toBe(false)
    expect(result.split(processText('hello')).length - 1).toBe(2)
  })
})
