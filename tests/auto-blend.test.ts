import { describe, expect, test } from 'bun:test'

import { detectTrend, type TrendEvent } from '../src/lib/auto-blend-trend'

describe('auto-blend trend detection', () => {
  test('does not trigger when messages in the window are below threshold', () => {
    const events: TrendEvent[] = [
      { text: '上车', ts: 1_000, uid: '1' },
      { text: '上车', ts: 2_000, uid: '2' },
    ]

    expect(detectTrend(events, 10_000, 3).shouldSend).toBe(false)
  })

  test('triggers when one text reaches threshold inside the window', () => {
    const events: TrendEvent[] = [
      { text: '冲', ts: 1_000, uid: '1' },
      { text: '冲', ts: 2_000, uid: '2' },
      { text: '冲', ts: 3_000, uid: '3' },
    ]

    const result = detectTrend(events, 10_000, 3)

    expect(result.shouldSend).toBe(true)
    expect(result.text).toBe('冲')
    expect(result.candidates[0]).toEqual({ text: '冲', totalCount: 3, uniqueUsers: 3 })
  })

  test('ignores expired events when counting a sudden burst', () => {
    const events: TrendEvent[] = [
      { text: '过期', ts: 1_000, uid: '1' },
      { text: '过期', ts: 2_000, uid: '2' },
      { text: '过期', ts: 20_000, uid: '3' },
    ]

    expect(detectTrend(events, 5_000, 2).shouldSend).toBe(false)
  })

  test('counts duplicate senders toward total but only once for unique users', () => {
    const events: TrendEvent[] = [
      { text: '复读', ts: 1_000, uid: '1' },
      { text: '复读', ts: 2_000, uid: '1' },
      { text: '复读', ts: 3_000, uid: '2' },
    ]

    const result = detectTrend(events, 10_000, 3)

    expect(result.shouldSend).toBe(true)
    expect(result.candidates[0]).toEqual({ text: '复读', totalCount: 3, uniqueUsers: 2 })
  })

  test('whitespace-padded text is grouped with the trimmed key', () => {
    // Mutation-test trap: if `event.text.trim()` is replaced with `event.text`,
    // `'冲'` and `'冲 '` and `' 冲'` would split into 3 distinct buckets and
    // never reach threshold. Assert the merge by hand.
    const events: TrendEvent[] = [
      { text: '冲', ts: 1_000, uid: '1' },
      { text: '冲 ', ts: 2_000, uid: '2' },
      { text: ' 冲', ts: 3_000, uid: '3' },
    ]
    const result = detectTrend(events, 10_000, 3)
    expect(result.shouldSend).toBe(true)
    expect(result.candidates[0]).toEqual({ text: '冲', totalCount: 3, uniqueUsers: 3 })
  })

  test('drops events at the exact window-start boundary (strict <)', () => {
    // Window is `[now - windowMs, now]`. The implementation uses `event.ts <
    // windowStart` to drop pre-window events — events exactly AT windowStart
    // are kept. If `<` is flipped to `<=`, the boundary event drops and the
    // threshold is missed. now=3000, windowMs=2000 → windowStart=1000.
    const events: TrendEvent[] = [
      { text: '边界', ts: 1_000, uid: 'edge' },
      { text: '边界', ts: 2_000, uid: '2' },
      { text: '边界', ts: 3_000, uid: '3' },
    ]
    const result = detectTrend(events, 2_000, 3)
    expect(result.shouldSend).toBe(true)
    expect(result.candidates[0]?.totalCount).toBe(3)
  })

  test('events with null/undefined uid still count toward totalCount but not uniqueUsers', () => {
    // Mutation-test trap: `if (event.uid)` flipped to `true` would .add(undefined)
    // and produce uniqueUsers = totalCount, which would silently pass the
    // "distinct users" gate downstream.
    const events: TrendEvent[] = [
      { text: '匿名', ts: 1_000, uid: null },
      { text: '匿名', ts: 2_000, uid: undefined },
      { text: '匿名', ts: 3_000, uid: '' },
      { text: '匿名', ts: 4_000, uid: 'real' },
    ]
    const result = detectTrend(events, 10_000, 4)
    expect(result.candidates[0]).toEqual({ text: '匿名', totalCount: 4, uniqueUsers: 1 })
  })

  test('candidates are sorted by descending totalCount (locks the b - a comparator)', () => {
    // Mutation-test trap: `b.totalCount - a.totalCount` mutated to
    // `b.totalCount + a.totalCount` produces a constant non-zero comparator
    // result, leaving an unspecified order. Or `() => undefined` keeps
    // insertion order. Lock in strict descending: lower-count items appear
    // after higher-count items.
    const events: TrendEvent[] = [
      { text: 'low', ts: 1_000, uid: '1' },
      { text: 'mid', ts: 2_000, uid: '2' },
      { text: 'mid', ts: 3_000, uid: '3' },
      { text: 'high', ts: 4_000, uid: '4' },
      { text: 'high', ts: 5_000, uid: '5' },
      { text: 'high', ts: 6_000, uid: '6' },
    ]
    const result = detectTrend(events, 10_000, 99) // high threshold so winner=null but candidates still sorted
    const counts = result.candidates.map(c => c.totalCount)
    expect(counts).toEqual([3, 2, 1])
    expect(result.candidates[0]?.text).toBe('high')
    expect(result.candidates[result.candidates.length - 1]?.text).toBe('low')
  })

  test('candidates carry the actual totalCount + uniqueUsers (not a stub mapper)', () => {
    // Locks the Array.from mapper shape — a mutant that replaces the
    // `([text, entry]) => ({ text, totalCount, uniqueUsers })` mapper with a
    // no-op would produce candidates without those fields, breaking callers.
    const events: TrendEvent[] = [
      { text: 'A', ts: 1_000, uid: 'u1' },
      { text: 'A', ts: 2_000, uid: 'u1' }, // duplicate user
      { text: 'A', ts: 3_000, uid: 'u2' },
    ]
    const result = detectTrend(events, 10_000, 99)
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]?.text).toBe('A')
    expect(result.candidates[0]?.totalCount).toBe(3)
    expect(result.candidates[0]?.uniqueUsers).toBe(2)
  })
})
