import { describe, expect, test } from 'bun:test'

import {
  describeRestrictionDuration,
  durationFromData,
  formatDuration,
  isAccountRestrictedError,
  isMutedError,
  isRateLimitError,
  scanRestrictionSignals,
} from '../src/lib/moderation'

describe('moderation', () => {
  test('classifies common restriction errors', () => {
    expect(isRateLimitError('发送频率过快')).toBe(true)
    expect(isRateLimitError('rate limited')).toBe(true)
    expect(isMutedError('你已被禁言')).toBe(true)
    expect(isAccountRestrictedError('账号存在风控')).toBe(true)
  })

  test('formats durations from seconds and nested response data', () => {
    expect(formatDuration(59)).toBe('59 秒')
    expect(formatDuration(61)).toBe('2 分钟')
    expect(durationFromData({ data: { remain_seconds: 90 } })).toBe('2 分钟')
    expect(describeRestrictionDuration('禁言 3 分钟', null)).toBe('3 分钟')
  })

  test('extracts restriction signals from nested payloads', () => {
    const signals = scanRestrictionSignals(
      {
        data: {
          silent: true,
          reason: '发送频率过快',
        },
      },
      'unit'
    )

    expect(signals.map(signal => signal.kind)).toContain('muted')
    expect(signals.map(signal => signal.kind)).toContain('rate-limit')
  })

  // Regression: H-logic audit fix. Cyclic input previously stack-overflowed.
  test('does not stack-overflow on cyclic JSON', () => {
    const cyclic: Record<string, unknown> = { silent: true }
    cyclic.self = cyclic
    cyclic.nested = { back: cyclic }

    expect(() => scanRestrictionSignals(cyclic, 'unit')).not.toThrow()
    const signals = scanRestrictionSignals(cyclic, 'unit')
    expect(signals.some(signal => signal.kind === 'muted')).toBe(true)
  })
})
