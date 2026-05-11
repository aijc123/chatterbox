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

  test('pins the exact human label for each strategy (kills StringLiteral mutants on label fields)', () => {
    const candidates = generateHeuristicCandidates('习近平')
    expect(candidates.find(c => c.strategy === 'invisible')?.label).toBe('隐形字符')
    expect(candidates.find(c => c.strategy === 'kou')?.label).toBe('口分隔')
    expect(candidates.find(c => c.strategy === 'space')?.label).toBe('全角空格')
  })

  test('returns empty array for empty / whitespace-only text', () => {
    expect(generateHeuristicCandidates('')).toEqual([])
    expect(generateHeuristicCandidates('   ')).toEqual([])
  })

  test('drops candidates that did not change the input (single grapheme)', () => {
    // For a 1-character input, joining with any separator yields the same char,
    // so all three strategies are no-ops and the list collapses.
    // This kills the line-66 mutation `if (c.text === trimmed) return false`
    // → `if (false) return false` (which would leave the unchanged variants
    // in) AND validates that the `seen.has(trimmed)` seed catches any
    // remaining duplicate.
    const candidates = generateHeuristicCandidates('习')
    expect(candidates).toEqual([])
  })

  test('seed [trimmed] prevents output that equals the input (defense in depth)', () => {
    // Mutation: `new Set<string>([trimmed])` → `new Set<string>([])`.
    // Without the trimmed seed, a candidate whose .text equals trimmed
    // would still be dropped by line 66 anyway — so this mutation IS
    // observable only if line 66 also gets mutated. Pin explicitly across
    // several inputs that the input itself never appears in the output.
    for (const input of ['ab', 'abc', '习近平', '😀😀']) {
      const candidates = generateHeuristicCandidates(input)
      for (const c of candidates) {
        expect(c.text).not.toBe(input)
      }
    }
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

  test('joins header + candidate lines with newline (kills `.join("\\n")` → `.join("")` mutant)', () => {
    // Without the newline join, the output collapses to a single line —
    // `.includes()` assertions still pass, but `.split('\n').length` and the
    // exact line-count drop from 3 to 1.
    const formatted = formatCandidatesForLog([
      { strategy: 'invisible', label: '隐形字符', text: 'A' },
      { strategy: 'kou', label: '口分隔', text: 'B' },
    ])
    expect(formatted).not.toBeNull()
    const lines = formatted?.split('\n') ?? []
    // 1 header + 2 candidate lines = 3 lines exactly.
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe('🛠 改写候选（不自动发送，可复制粘贴）：')
    expect(lines[1]).toBe('   • 隐形字符: A')
    expect(lines[2]).toBe('   • 口分隔: B')
  })

  test('exact output for the canonical single-candidate case', () => {
    // Pin every literal: the 🛠 emoji, the parenthetical, the 4-space bullet
    // prefix, and the colon-space label separator.
    const formatted = formatCandidatesForLog([{ strategy: 'invisible', label: '隐形字符', text: 'x' }])
    expect(formatted).toBe('🛠 改写候选（不自动发送，可复制粘贴）：\n   • 隐形字符: x')
  })
})
