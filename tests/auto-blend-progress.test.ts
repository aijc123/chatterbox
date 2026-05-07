// Unit tests for formatAutoBlendCandidateProgress.
// Pure function — no GM mock needed. Drives the panel's "正在刷" progress bar
// so it deserves thorough coverage of the AND-bottleneck math.

import { describe, expect, test } from 'bun:test'

import { formatAutoBlendCandidateProgress } from '../src/lib/auto-blend-status'

describe('formatAutoBlendCandidateProgress', () => {
  test('returns null text + zero fill when no candidates', () => {
    const result = formatAutoBlendCandidateProgress([], 4, true, 3)
    expect(result.text).toBeNull()
    expect(result.shortText).toBeNull()
    expect(result.totalCount).toBe(0)
    expect(result.fillRatio).toBe(0)
    expect(result.threshold).toBe(4)
    expect(result.minUsers).toBe(3)
    expect(result.requireDistinctUsers).toBe(true)
  })

  test('skips singletons (totalCount < 2) — same rule as formatAutoBlendCandidate', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'lone', totalCount: 1, uniqueUsers: 1 }], 4, false, 3)
    expect(result.text).toBeNull()
  })

  test('picks the leading candidate by totalCount', () => {
    const result = formatAutoBlendCandidateProgress(
      [
        { text: 'a', totalCount: 2, uniqueUsers: 2 },
        { text: 'b', totalCount: 5, uniqueUsers: 3 },
        { text: 'c', totalCount: 3, uniqueUsers: 2 },
      ],
      6,
      false,
      3
    )
    expect(result.text).toBe('b')
    expect(result.totalCount).toBe(5)
  })

  test('countRatio when distinct-users gating is off', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 3, uniqueUsers: 1 }], 4, false, 3)
    // 3/4 = 0.75; users not gating
    expect(result.fillRatio).toBe(0.75)
    expect(result.requireDistinctUsers).toBe(false)
  })

  test('AND bottleneck: takes min(countRatio, userRatio) when distinct-users on', () => {
    // count fills 80% but only 1 of 3 users — bar should reflect 33%
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 4, uniqueUsers: 1 }], 5, true, 3)
    expect(result.fillRatio).toBeCloseTo(1 / 3, 3)
  })

  test('AND bottleneck flips when users meet but count is short', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 2, uniqueUsers: 5 }], 5, true, 3)
    // count = 2/5 = 0.4, users = 5/3 capped at 1.0 → bar shows 0.4
    expect(result.fillRatio).toBe(0.4)
  })

  test('countRatio capped at 1.0 even when count vastly exceeds threshold', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 100, uniqueUsers: 100 }], 4, true, 3)
    expect(result.fillRatio).toBe(1)
  })

  test('userRatio capped at 1.0 even when users vastly exceed minimum', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 4, uniqueUsers: 100 }], 4, true, 3)
    expect(result.fillRatio).toBe(1)
  })

  test('handles minUsers=0 defensively (treats as not gating)', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 3, uniqueUsers: 0 }], 4, true, 0)
    // userRatio short-circuits to 1 because minUsers <= 0
    expect(result.fillRatio).toBe(0.75)
  })

  test('handles threshold=0 defensively (countRatio=0 → fill 0)', () => {
    const result = formatAutoBlendCandidateProgress([{ text: 'x', totalCount: 5, uniqueUsers: 5 }], 0, true, 3)
    expect(result.fillRatio).toBe(0)
  })

  test('truncates long text via shortText (<= 18 chars approx)', () => {
    const long = 'a'.repeat(40)
    const result = formatAutoBlendCandidateProgress([{ text: long, totalCount: 3, uniqueUsers: 2 }], 4, true, 3)
    expect(result.text).toBe(long)
    // shortAutoBlendText caps to 18 chars in trimText
    expect(result.shortText?.length).toBeLessThanOrEqual(20)
    expect(result.shortText?.length).toBeLessThan(long.length)
  })
})
