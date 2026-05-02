import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

const { generateHeuristicCandidates, formatCandidatesForLog } = await import('../src/lib/shadow-suggestion')

describe('generateHeuristicCandidates', () => {
  test('produces invisible / kou / space variants for multi-grapheme input', () => {
    const candidates = generateHeuristicCandidates('习近平')
    const strategies = candidates.map(c => c.strategy).sort()
    expect(strategies).toEqual(['invisible', 'kou', 'space'])
    const kou = candidates.find(c => c.strategy === 'kou')
    expect(kou?.text).toBe('习口近口平')
    const space = candidates.find(c => c.strategy === 'space')
    expect(space?.text).toBe('习　近　平')
    const invisible = candidates.find(c => c.strategy === 'invisible')
    expect(invisible?.text).toBe('习­近­平')
  })

  test('returns empty array for empty / whitespace-only text', () => {
    expect(generateHeuristicCandidates('')).toEqual([])
    expect(generateHeuristicCandidates('   ')).toEqual([])
  })

  test('drops candidates that did not change the input (single grapheme)', () => {
    // For a 1-character input, joining with any separator yields the same char,
    // so all three strategies are no-ops and the list collapses.
    const candidates = generateHeuristicCandidates('习')
    expect(candidates).toEqual([])
  })

  test('deduplicates identical-output candidates', () => {
    // When invisible and another strategy happen to produce the same string,
    // only the first survives. This is a paranoid invariant — the current
    // strategies don't collide for normal CJK input — but the dedup keeps
    // the panel tidy when extending strategies later.
    const candidates = generateHeuristicCandidates('ab')
    const texts = candidates.map(c => c.text)
    expect(new Set(texts).size).toBe(texts.length)
  })

  test('handles surrogate pairs (emoji etc.) without splitting them', () => {
    const candidates = generateHeuristicCandidates('😀😀')
    const kou = candidates.find(c => c.strategy === 'kou')
    expect(kou?.text).toBe('😀口😀')
  })
})

describe('formatCandidatesForLog', () => {
  test('returns null when candidate list is empty', () => {
    expect(formatCandidatesForLog([])).toBeNull()
  })

  test('formats candidates as a multi-line log message with the 🛠 prefix', () => {
    const formatted = formatCandidatesForLog([
      { strategy: 'invisible', label: '隐形字符', text: '习­近­平' },
      { strategy: 'kou', label: '口分隔', text: '习口近口平' },
    ])
    expect(formatted).not.toBeNull()
    if (formatted === null) throw new Error('Expected formatCandidatesForLog to return a log message')
    expect(formatted.startsWith('🛠')).toBe(true)
    expect(formatted.includes('隐形字符: 习­近­平')).toBe(true)
    expect(formatted.includes('口分隔: 习口近口平')).toBe(true)
    expect(formatted.includes('不自动发送')).toBe(true)
  })
})
