/**
 * Test the token-based settings search helper.
 *
 * Old logic: `KEYWORDS.includes(query)` — pure substring. Multi-word queries
 * never matched even if all words were in the keywords (`"key llm"` ≠
 * `"llm api key model"`.includes(`"key llm"`)). This test pins the new behavior:
 * split on whitespace, every token must appear in the haystack.
 */

import { describe, expect, test } from 'bun:test'

import { matchesSearchQuery } from '../src/components/settings/search'

describe('matchesSearchQuery', () => {
  const KEYWORDS = 'llm api key model 模型 anthropic openai deepseek base url'

  test('empty query matches anything (show all)', () => {
    expect(matchesSearchQuery(KEYWORDS, '')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, '   ')).toBe(true)
  })

  test('single token substring match (the old behavior, preserved)', () => {
    expect(matchesSearchQuery(KEYWORDS, 'llm')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, 'deepseek')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, '模型')).toBe(true)
  })

  test('case insensitive on both sides', () => {
    expect(matchesSearchQuery('表情 emote emoji ID 复制', 'id')).toBe(true)
    expect(matchesSearchQuery('表情 emote emoji ID 复制', 'ID')).toBe(true)
    expect(matchesSearchQuery('llm api KEY model', 'key')).toBe(true)
  })

  test('multi-token query: all tokens must match (THE bug-fix case)', () => {
    expect(matchesSearchQuery(KEYWORDS, 'key llm')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, 'llm key')).toBe(true) // order independent
    expect(matchesSearchQuery(KEYWORDS, 'api 模型')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, 'openai deepseek')).toBe(true)
  })

  test('multi-token query: partial match misses', () => {
    expect(matchesSearchQuery(KEYWORDS, 'llm xenon')).toBe(false)
    expect(matchesSearchQuery(KEYWORDS, '鞭子 模型')).toBe(false)
  })

  test('extra whitespace between tokens does not break it', () => {
    expect(matchesSearchQuery(KEYWORDS, '   llm    api   ')).toBe(true)
    expect(matchesSearchQuery(KEYWORDS, '\tkey\nllm')).toBe(true)
  })

  test('empty haystack only matches empty query', () => {
    expect(matchesSearchQuery('', '')).toBe(true)
    expect(matchesSearchQuery('', 'anything')).toBe(false)
  })

  test('substring match within a longer haystack word', () => {
    // "deep" is a substring of "deepseek"
    expect(matchesSearchQuery(KEYWORDS, 'deep')).toBe(true)
    // "anth" is a substring of "anthropic"
    expect(matchesSearchQuery(KEYWORDS, 'anth')).toBe(true)
  })
})
