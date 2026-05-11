/**
 * Locks the auto-blend panel status formatters in `auto-blend-status.ts`.
 *
 * Goals:
 *  - Every branch of `formatAutoBlendStatus` is hit with both positive and
 *    adjacent-negative inputs so ConditionalExpression mutations get caught.
 *  - `formatAutoBlendCandidate` boundaries: `< 2` exclusion, "暂无" empty
 *    case, tie-break (first-wins).
 *  - `formatAutoBlendCandidateProgress` ratio math, AND-semantics fillRatio
 *    bottleneck, and the requireDistinctUsers=false escape hatch.
 *
 * `shortAutoBlendText` is exercised transitively (it delegates to `trimText`,
 * tested in tests/utils-pure.test.ts).
 */

import { describe, expect, test } from 'bun:test'

import {
  type AutoBlendCandidate,
  formatAutoBlendCandidate,
  formatAutoBlendCandidateProgress,
  formatAutoBlendSenderInfo,
  formatAutoBlendStatus,
  shortAutoBlendText,
} from '../src/lib/auto-blend-status'

describe('formatAutoBlendSenderInfo', () => {
  test('returns "N 人 / M 条" when uniqueUsers > 0', () => {
    expect(formatAutoBlendSenderInfo(3, 5)).toBe('3 人 / 5 条')
    expect(formatAutoBlendSenderInfo(1, 1)).toBe('1 人 / 1 条')
  })

  test('falls back to "M 条" only when uniqueUsers === 0 (boundary)', () => {
    expect(formatAutoBlendSenderInfo(0, 5)).toBe('5 条')
    // adjacent: 1 person should NOT fall back
    expect(formatAutoBlendSenderInfo(1, 5)).toBe('1 人 / 5 条')
  })
})

describe('shortAutoBlendText', () => {
  test('truncates long text via trimText (18 char budget)', () => {
    const long = '哈'.repeat(50)
    const short = shortAutoBlendText(long)
    expect(short.length).toBeLessThan(long.length)
  })

  test('short text passes through unchanged', () => {
    expect(shortAutoBlendText('短的')).toBe('短的')
  })

  test('empty string falls back to itself (locks the `?? text` branch)', () => {
    // trimText('', 18) returns ['', ...] so `?? text` is unused here; but
    // pinning it ensures stryker can't replace the fallback with a sentinel.
    expect(shortAutoBlendText('')).toBe('')
  })
})

describe('formatAutoBlendStatus (branch ladder)', () => {
  const base = { isSending: false, cooldownUntil: 0, now: 0 }

  test('disabled → "已关闭" (highest priority)', () => {
    expect(formatAutoBlendStatus({ ...base, enabled: false })).toBe('已关闭')
    // dryRun + isSending + cooldown all ignored when disabled
    expect(
      formatAutoBlendStatus({
        enabled: false,
        dryRun: true,
        isSending: true,
        cooldownUntil: 999_999,
        now: 0,
      })
    ).toBe('已关闭')
  })

  test('dryRun (when enabled) → "试运行（不发送）"', () => {
    expect(formatAutoBlendStatus({ ...base, enabled: true, dryRun: true })).toBe('试运行（不发送）')
  })

  test('isSending (when enabled, not dryRun) → "正在跟车"', () => {
    expect(formatAutoBlendStatus({ ...base, enabled: true, isSending: true })).toBe('正在跟车')
  })

  test('cooldown remaining → "冷却中 Ns" (ceil to nearest second)', () => {
    // 5s left exactly
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 5000, now: 0 })).toBe('冷却中 5s')
    // 4.5s left → ceil to 5
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 4500, now: 0 })).toBe('冷却中 5s')
    // 1ms left → ceil to 1
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 1, now: 0 })).toBe('冷却中 1s')
  })

  test('cooldown expired or in the past → "观察中" (boundary at now === cooldownUntil)', () => {
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 0, now: 0 })).toBe('观察中')
    // cooldownUntil in the past → clamped to 0 → '观察中'
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 0, now: 1000 })).toBe('观察中')
  })

  test('Math.max(0, …) prevents negative cooldown turning into "冷却中 -3s"', () => {
    // Without the clamp, (0 - 3000) / 1000 = -3 and `left > 0` is false,
    // but pinning the exact output catches any flip of `>` → `>=`.
    expect(formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: 0, now: 3000 })).toBe('观察中')
  })
})

describe('formatAutoBlendCandidate', () => {
  test('empty list → "暂无"', () => {
    expect(formatAutoBlendCandidate([])).toBe('暂无')
  })

  test('all candidates below totalCount=2 → "暂无" (boundary `< 2`)', () => {
    const c: AutoBlendCandidate[] = [
      { text: '哈', totalCount: 1, uniqueUsers: 1 },
      { text: '嘿', totalCount: 1, uniqueUsers: 1 },
    ]
    expect(formatAutoBlendCandidate(c)).toBe('暂无')
  })

  test('exactly totalCount=2 qualifies (boundary `< 2` excludes only 0–1)', () => {
    const c: AutoBlendCandidate[] = [{ text: '哈哈', totalCount: 2, uniqueUsers: 2 }]
    expect(formatAutoBlendCandidate(c)).toBe('哈哈（2 人 / 2 条）')
  })

  test('picks the candidate with highest totalCount (locks `>` not `>=`)', () => {
    const c: AutoBlendCandidate[] = [
      { text: 'first', totalCount: 5, uniqueUsers: 3 },
      { text: 'second', totalCount: 10, uniqueUsers: 4 },
      { text: 'third', totalCount: 3, uniqueUsers: 2 },
    ]
    expect(formatAutoBlendCandidate(c)).toBe('second（4 人 / 10 条）')
  })

  test('tie-break: first wins (since `>` is strict, not `>=`)', () => {
    const c: AutoBlendCandidate[] = [
      { text: 'first', totalCount: 5, uniqueUsers: 3 },
      { text: 'second', totalCount: 5, uniqueUsers: 4 },
    ]
    // first sets `best`; second has same totalCount so `5 > 5` is false → first kept
    expect(formatAutoBlendCandidate(c)).toBe('first（3 人 / 5 条）')
  })

  test('falls back to "M 条" when uniqueUsers === 0', () => {
    const c: AutoBlendCandidate[] = [{ text: '匿名', totalCount: 3, uniqueUsers: 0 }]
    expect(formatAutoBlendCandidate(c)).toBe('匿名（3 条）')
  })
})

describe('formatAutoBlendCandidateProgress', () => {
  test('empty list → null text/shortText, fillRatio 0', () => {
    const r = formatAutoBlendCandidateProgress([], 4, true, 3)
    expect(r.text).toBeNull()
    expect(r.shortText).toBeNull()
    expect(r.totalCount).toBe(0)
    expect(r.uniqueUsers).toBe(0)
    expect(r.fillRatio).toBe(0)
    expect(r.threshold).toBe(4)
    expect(r.minUsers).toBe(3)
    expect(r.requireDistinctUsers).toBe(true)
  })

  test('all candidates < 2 → null branch (boundary)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 1, uniqueUsers: 1 }]
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.text).toBeNull()
    expect(r.fillRatio).toBe(0)
  })

  test('countRatio computed as totalCount / threshold (clamped to 1)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 3, uniqueUsers: 3 }]
    // threshold=4 → countRatio=0.75; userRatio=1 (3/3); fillRatio=min=0.75
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.fillRatio).toBeCloseTo(0.75, 5)
  })

  test('countRatio capped at 1 even when totalCount > threshold', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 10, uniqueUsers: 5 }]
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.fillRatio).toBe(1)
  })

  test('threshold === 0 → countRatio is 0 (avoids divide-by-zero)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 5, uniqueUsers: 5 }]
    const r = formatAutoBlendCandidateProgress(c, 0, true, 3)
    expect(r.fillRatio).toBe(0)
  })

  test('userRatio is 1 when requireDistinctUsers is false (escape hatch)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 4, uniqueUsers: 0 }]
    // requireDistinctUsers=false → userRatio=1; countRatio=4/4=1 → fillRatio=1
    const r = formatAutoBlendCandidateProgress(c, 4, false, 99)
    expect(r.fillRatio).toBe(1)
  })

  test('userRatio is 1 when minUsers === 0 (boundary)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 2, uniqueUsers: 0 }]
    // even with requireDistinctUsers=true, minUsers=0 short-circuits to userRatio=1
    const r = formatAutoBlendCandidateProgress(c, 4, true, 0)
    // countRatio=2/4=0.5; userRatio=1; fillRatio=0.5
    expect(r.fillRatio).toBe(0.5)
  })

  test('fillRatio is min(countRatio, userRatio) — userRatio is the bottleneck', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 4, uniqueUsers: 1 }]
    // countRatio=1 (4/4); userRatio=1/3≈0.333; min = 0.333
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.fillRatio).toBeCloseTo(1 / 3, 5)
  })

  test('fillRatio is min(countRatio, userRatio) — countRatio is the bottleneck', () => {
    const c: AutoBlendCandidate[] = [{ text: 'a', totalCount: 2, uniqueUsers: 5 }]
    // countRatio=0.5 (2/4); userRatio=1 (capped, 5/3 → min 1); min = 0.5
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.fillRatio).toBe(0.5)
  })

  test('picks highest totalCount candidate (locks `>` not `>=`)', () => {
    const c: AutoBlendCandidate[] = [
      { text: 'a', totalCount: 2, uniqueUsers: 2 },
      { text: 'b', totalCount: 3, uniqueUsers: 3 },
    ]
    const r = formatAutoBlendCandidateProgress(c, 4, true, 3)
    expect(r.text).toBe('b')
    expect(r.totalCount).toBe(3)
  })

  test('returned shape pins all fields (catches ObjectLiteral mutation)', () => {
    const c: AutoBlendCandidate[] = [{ text: 'meme', totalCount: 3, uniqueUsers: 2 }]
    const r = formatAutoBlendCandidateProgress(c, 5, true, 4)
    expect(r).toEqual({
      text: 'meme',
      shortText: 'meme',
      totalCount: 3,
      threshold: 5,
      uniqueUsers: 2,
      minUsers: 4,
      requireDistinctUsers: true,
      fillRatio: Math.min(3 / 5, 2 / 4),
    })
  })
})
