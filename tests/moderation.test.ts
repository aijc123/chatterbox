/**
 * Exhaustive coverage for `src/lib/moderation.ts`. Lives alongside the
 * lighter "happy path" assertions from the H-logic / cloud-test audits —
 * the table-driven blocks below lock in the SPECIFIC string substrings,
 * numeric codes, regex anchors, duration units, and Set contents that
 * mutation testing flagged as silently swappable.
 *
 * Style note: prefer per-case table rows over collapsed `expect()` chains
 * so a single failing mutation pinpoints the broken classifier (not "one
 * of nine substrings in this `expect.toBe(true)` regressed").
 */

import { describe, expect, test } from 'bun:test'

import {
  classifyByCode,
  describeRestrictionDuration,
  durationFromData,
  formatDuration,
  isAccountRestrictedError,
  isInfrastructureError,
  isMutedError,
  isRateLimitError,
  type RestrictionKind,
  scanRestrictionSignals,
} from '../src/lib/moderation'

// ---------------------------------------------------------------------------
// classifyByCode — locks the exact Set contents and the order of code-class
// checks. Each known code maps to a fixed kind; anything else maps to null;
// undefined returns null.
// ---------------------------------------------------------------------------
describe('classifyByCode', () => {
  const cases: Array<[number, RestrictionKind]> = [
    [10030, 'rate-limit'],
    [10031, 'rate-limit'],
    [10024, 'muted'],
    [11004, 'muted'],
    [11002, 'blocked'],
    [11003, 'blocked'],
    [-101, 'account'],
    [-352, 'account'],
    [10005, 'account'],
    [10006, 'account'],
    [10021, 'account'],
  ]
  for (const [code, kind] of cases) {
    test(`code ${code} classifies as ${kind}`, () => {
      expect(classifyByCode(code)).toBe(kind)
    })
  }

  test('undefined returns null (no code attempted)', () => {
    expect(classifyByCode(undefined)).toBe(null)
  })

  test('unknown numeric codes return null', () => {
    expect(classifyByCode(0)).toBe(null)
    expect(classifyByCode(200)).toBe(null)
    expect(classifyByCode(99999)).toBe(null)
    expect(classifyByCode(-1)).toBe(null)
    expect(classifyByCode(-100)).toBe(null) // adjacent to -101 (account)
    expect(classifyByCode(-353)).toBe(null) // adjacent to -352 (account)
    expect(classifyByCode(10029)).toBe(null) // adjacent to 10030 (rate-limit)
    expect(classifyByCode(10032)).toBe(null) // adjacent to 10031 (rate-limit)
    expect(classifyByCode(11001)).toBe(null) // adjacent to 11002 (blocked)
    expect(classifyByCode(11005)).toBe(null) // adjacent to 11004 (muted)
  })

  test('boundary: -101 (account) is negative — UnaryOperator mutant would flip to +101 which is unknown', () => {
    expect(classifyByCode(-101)).toBe('account')
    expect(classifyByCode(101)).toBe(null) // +101 is NOT a known code
  })

  test('boundary: -352 stays negative; +352 is unknown', () => {
    expect(classifyByCode(-352)).toBe('account')
    expect(classifyByCode(352)).toBe(null)
  })
})

// ---------------------------------------------------------------------------
// isRateLimitError — substring + lowercase check. Table-drive each token.
// ---------------------------------------------------------------------------
describe('isRateLimitError', () => {
  test.each([
    ['发送频率过快', true, '频率'],
    ['你的速度过快', true, '过快'],
    ['Rate limit hit', true, 'rate (lower)'],
    ['RATE LIMIT', true, 'rate (upper folded)'],
    ['too fast', false, 'no token'],
    ['', false, 'empty'],
  ])('"%s" → %s (%s)', (input, expected) => {
    expect(isRateLimitError(input)).toBe(expected)
  })
  test('undefined returns false', () => {
    expect(isRateLimitError(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isInfrastructureError — already had a substantial test; add a few that
// pin the regex anchors that survived mutation.
// ---------------------------------------------------------------------------
describe('isInfrastructureError (regex anchors)', () => {
  test('HTTP-prefix only matches when "HTTP " appears at the start (^ anchor)', () => {
    expect(isInfrastructureError('HTTP 502')).toBe(true)
    expect(isInfrastructureError('HTTP/1.1 500')).toBe(false) // missing space after HTTP
    // A mutant that drops the `^` anchor would match "code: HTTP 502 leaked"
    // here. We want anchored matching.
    expect(isInfrastructureError('contains the substring HTTP 502 in middle')).toBe(false)
  })

  test('"无响应" only matches at end ($ anchor)', () => {
    expect(isInfrastructureError('发送接口 12s 无响应')).toBe(true)
    expect(isInfrastructureError('无响应 - 检查网络')).toBe(false) // not at end
  })

  test('rejects real moderation errors and falsy inputs', () => {
    expect(isInfrastructureError(undefined)).toBe(false) // skipcq: JS-W1042
    expect(isInfrastructureError('')).toBe(false)
    expect(isInfrastructureError('f')).toBe(false)
    expect(isInfrastructureError('包含全局屏蔽词')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isMutedError — same shape as isRateLimitError; lock each substring.
// ---------------------------------------------------------------------------
describe('isMutedError', () => {
  test.each([
    ['你已被禁言', true, '禁言'],
    ['账号被封 3 天', true, '被封'],
    ['You have been muted', true, 'muted'],
    ['MUTED', true, 'muted (upper)'],
    ['random text', false, 'no token'],
    ['', false, 'empty'],
  ])('"%s" → %s (%s)', (input, expected) => {
    expect(isMutedError(input)).toBe(expected)
  })
  test('undefined returns false', () => {
    expect(isMutedError(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isAccountRestrictedError — 7 substring branches; one row each.
// ---------------------------------------------------------------------------
describe('isAccountRestrictedError', () => {
  test.each([
    ['账号存在风控', true, '账号 + 风控'],
    ['账号已被限制', true, '账号'],
    ['账户异常', true, '账户'],
    ['触发风控规则', true, '风控'],
    ['封号警告', true, '封号'],
    ['封禁了', true, '封禁'],
    ['Account locked', true, 'account (lower-fold)'],
    ['ACCOUNT issue', true, 'account (upper-fold)'],
    ['Risk flag', true, 'risk (lower-fold)'],
    ['unrelated message', false, 'no token'],
    ['', false, 'empty'],
  ])('"%s" → %s (%s)', (input, expected) => {
    expect(isAccountRestrictedError(input)).toBe(expected)
  })
  test('undefined returns false', () => {
    expect(isAccountRestrictedError(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatDuration — boundary tests around each unit edge so EqualityOperator
// (< vs <=) and ArithmeticOperator mutants get caught.
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  test.each([
    [0, '1 秒', 'Math.max(1, ...) floor for 0'],
    [0.5, '1 秒', 'sub-second rounds up to 1'],
    [1, '1 秒', '1 second'],
    [59, '59 秒', '59 seconds — below minute boundary'],
    [60, '1 分钟', '60 seconds — flips to minutes via strict <60'],
    [61, '2 分钟', '61 seconds — rounds up to 2 minutes (ceil)'],
    [119, '2 分钟', '119 seconds — still 2 minutes'],
    [120, '2 分钟', '120 seconds — exactly 2 minutes'],
    [3599, '1 小时', '59:59 — minutes=60 falls through to hours via strict <60'],
    [3600, '1 小时', '3600 seconds — exactly 1 hour'],
    [86399, '1 天', 'just under 1 day — hours=24 falls through to days via strict <24'],
    [86400, '1 天', 'exactly 24 hours — flips to days'],
    [86401, '2 天', 'just over 1 day — rounds to 2 days'],
    [172800, '2 天', 'exactly 2 days'],
  ])('formatDuration(%d) === %s (%s)', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })

  test('floor at 1 second: 0 and negative inputs do not produce "0 秒" or "-X 秒"', () => {
    // Math.max(1, Math.ceil(seconds)) — if Math.max were dropped, 0 would
    // become "0 秒" and negative inputs would become "-N 秒".
    expect(formatDuration(0)).toBe('1 秒')
    expect(formatDuration(-5)).toBe('1 秒')
  })
})

// ---------------------------------------------------------------------------
// durationFromData — tests each branch of the unit parser + each numeric
// key-name pattern + date matching.
// ---------------------------------------------------------------------------
describe('durationFromData (string parser)', () => {
  test.each([
    ['禁言 30 秒', '30 秒'],
    ['禁言 5 分', '5 分钟'],
    ['禁言 5 分钟', '5 分钟'],
    ['禁言 2 小时', '2 小时'],
    ['禁言 7 天', '7 天'],
  ])('"%s" → %s', (input, expected) => {
    expect(describeRestrictionDuration(input, null)).toBe(expected)
  })

  test('value × multiplier semantics: 5 分 = 5*60s = 5 分钟 (kills `* 60` → `+ 60`)', () => {
    expect(describeRestrictionDuration('剩余 5 分', null)).toBe('5 分钟')
    expect(describeRestrictionDuration('剩余 2 小时', null)).toBe('2 小时') // 2 * 3600 = 7200 s
    expect(describeRestrictionDuration('剩余 3 天', null)).toBe('3 天')
  })

  test('returns null on text without unit nor date', () => {
    expect(describeRestrictionDuration('禁言中', null)).toBe('接口未返回时长') // fallback chain
    expect(describeRestrictionDuration(undefined, null)).toBe('接口未返回时长')
  })

  test('date in body → returns formatted countdown + (到 date)', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10) // YYYY-MM-DD tomorrow
    const out = describeRestrictionDuration(`封禁至 ${future} 23:59`, null)
    expect(out).toContain(future) // contains date literal back-quoted
    expect(out).toMatch(/小时|分钟|秒|天/) // and a duration string in front
  })

  test('past date → null fallthrough', () => {
    expect(describeRestrictionDuration('封禁至 2000-01-01', null)).toBe('接口未返回时长')
  })

  test('invalid date → null fallthrough', () => {
    expect(describeRestrictionDuration('封禁至 9999-99-99', null)).toBe('接口未返回时长')
  })
})

describe('durationFromData (numeric key patterns)', () => {
  test.each([
    [{ remain_seconds: 90 }, '2 分钟', 'remain'],
    [{ remainSeconds: 90 }, '2 分钟', 'remain (camel)'],
    [{ time_left: 90 }, '2 分钟', 'left'],
    [{ duration: 90 }, '2 分钟', 'duration'],
    [{ second: 90 }, '2 分钟', 'second'],
    [{ ttl: 90 }, '2 分钟', 'ttl'],
    [{ 剩余时间: 90 }, '2 分钟', '剩余 (zh)'],
    [{ 时长: 90 }, '2 分钟', '时长 (zh)'],
  ])('key %p → %s (%s)', (data, expected) => {
    expect(durationFromData(data)).toBe(expected)
  })

  test('unrelated numeric keys are NOT picked up', () => {
    expect(durationFromData({ foo: 90 })).toBe(null)
    expect(durationFromData({ count: 90 })).toBe(null)
  })

  test('end-timestamp keys produce a "(到 date)" suffix when in the future', () => {
    const futureMs = Date.now() + 60_000
    const out = durationFromData({ end_at: futureMs })
    expect(out).not.toBeNull()
    expect(out).toContain('（到')
  })

  test('past end-timestamps are dropped (no negative durations leak out)', () => {
    expect(durationFromData({ end_at: 1000 })).toBe(null)
  })

  test('end-timestamp in seconds is auto-detected (value < 10_000_000_000)', () => {
    const futureSec = Math.floor((Date.now() + 60_000) / 1000)
    const out = durationFromData({ expire: futureSec })
    expect(out).not.toBeNull()
    expect(out).toContain('（到')
  })

  test('nested objects are recursed (kills BlockStatement of recursion path)', () => {
    expect(durationFromData({ a: { b: { c: { remain_seconds: 90 } } } })).toBe('2 分钟')
    expect(durationFromData({ data: { meta: { ttl: 30 } } })).toBe('30 秒')
  })

  test('cycle-safe: a cyclic object does not stack-overflow', () => {
    const o: Record<string, unknown> = { remain_seconds: 90 }
    o.self = o
    expect(() => durationFromData(o)).not.toThrow()
    expect(durationFromData(o)).toBe('2 分钟')
  })

  test('non-object / null / primitive inputs return null', () => {
    expect(durationFromData(null)).toBe(null)
    expect(durationFromData(undefined)).toBe(null)
    expect(durationFromData(42)).toBe(null)
    expect(durationFromData(true)).toBe(null)
  })

  test('string input is parsed as a duration string', () => {
    // 30 seconds stays in seconds (rounded < 60); 60s overflows to 1 分钟
    // due to the strict-`<` boundary in formatDuration.
    expect(durationFromData('禁言 30 秒')).toBe('30 秒')
    expect(durationFromData('禁言 60 秒')).toBe('1 分钟')
  })
})

// ---------------------------------------------------------------------------
// describeRestrictionDuration — the public fallback chain. Locks the order:
// string parse → data parse → '接口未返回时长'.
// ---------------------------------------------------------------------------
describe('describeRestrictionDuration', () => {
  test('prefers error-string duration over data duration', () => {
    // Both supplied — error string wins.
    expect(describeRestrictionDuration('禁言 30 秒', { remain_seconds: 90 })).toBe('30 秒')
  })

  test('falls back to data when error string has no duration', () => {
    expect(describeRestrictionDuration('禁言中', { remain_seconds: 90 })).toBe('2 分钟')
  })

  test('uses final fallback when both error and data are dry', () => {
    expect(describeRestrictionDuration(undefined, null)).toBe('接口未返回时长')
    expect(describeRestrictionDuration('plain text', {})).toBe('接口未返回时长')
  })
})

// ---------------------------------------------------------------------------
// scanRestrictionSignals — traversal + boolean-flag classifier + cycle
// guard. Pins each signal shape so a mutant on the literal kind values
// ('muted' / 'blocked') is caught.
// ---------------------------------------------------------------------------
describe('scanRestrictionSignals', () => {
  test('truthy "silent" flag emits a muted signal', () => {
    const signals = scanRestrictionSignals({ silent: true }, 'unit')
    expect(signals.some(s => s.kind === 'muted')).toBe(true)
  })

  test('truthy "mute"/"禁言" key emits muted', () => {
    expect(scanRestrictionSignals({ mute_until: true }, 'unit').some(s => s.kind === 'muted')).toBe(true)
    expect(scanRestrictionSignals({ 禁言状态: true }, 'unit').some(s => s.kind === 'muted')).toBe(true)
  })

  test('truthy "forbid"/"block"/"封"/"黑" emits blocked', () => {
    expect(scanRestrictionSignals({ forbid_send: true }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ is_blocked: true }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ 已封禁: true }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ 黑名单中: true }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
  })

  test('FALSY boolean flags are ignored (kills BooleanLiteral mutant on `value && lowerKey.includes...`)', () => {
    // The check is `if (typeof value === 'boolean' && value)`. If a mutant
    // drops the `&& value`, false values would emit signals too.
    expect(scanRestrictionSignals({ silent: false }, 'unit').filter(s => s.kind === 'muted')).toEqual([])
    expect(scanRestrictionSignals({ is_blocked: false }, 'unit').filter(s => s.kind === 'blocked')).toEqual([])
  })

  test('string fields classify via classifyText', () => {
    expect(scanRestrictionSignals({ reason: '账号已注销' }, 'unit').some(s => s.kind === 'deactivated')).toBe(true)
    expect(scanRestrictionSignals({ reason: '拉黑了' }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ reason: '黑名单' }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ reason: 'On the blacklist' }, 'unit').some(s => s.kind === 'blocked')).toBe(true)
    expect(scanRestrictionSignals({ reason: '账号风控' }, 'unit').some(s => s.kind === 'account')).toBe(true)
  })

  test('source label is propagated to each emitted signal', () => {
    const signals = scanRestrictionSignals({ silent: true }, 'my-source-label')
    expect(signals.every(s => s.source === 'my-source-label')).toBe(true)
  })

  test('path tracks nested keys (kills MethodExpression on `Object.entries`)', () => {
    const signals = scanRestrictionSignals({ data: { user: { silent: true } } }, 'unit')
    const muted = signals.find(s => s.kind === 'muted')
    expect(muted?.message).toContain('data.user.silent')
  })

  test('returns [] on null / primitive inputs (no throw)', () => {
    expect(scanRestrictionSignals(null, 'unit')).toEqual([])
    expect(scanRestrictionSignals(undefined, 'unit')).toEqual([])
    expect(scanRestrictionSignals(42, 'unit')).toEqual([])
    expect(scanRestrictionSignals('plain', 'unit')).toEqual([])
  })

  test('cycle-safe', () => {
    const o: Record<string, unknown> = { silent: true }
    o.self = o
    o.nested = { back: o }
    expect(() => scanRestrictionSignals(o, 'unit')).not.toThrow()
    expect(scanRestrictionSignals(o, 'unit').some(s => s.kind === 'muted')).toBe(true)
  })
})
