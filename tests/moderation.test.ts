import { describe, expect, test } from 'bun:test'

import {
  describeRestrictionDuration,
  durationFromData,
  formatDuration,
  isAccountRestrictedError,
  isInfrastructureError,
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

  // Regression: cloud-test 18 false-positive "原词被屏蔽" rows when CORS broke
  // every sendDanmaku call with `Failed to fetch`. The fix relies on
  // `isInfrastructureError` to peel network/CORS errors apart from real B站
  // moderation responses.
  describe('isInfrastructureError', () => {
    test('flags fetch / CORS / network errors as infrastructure (not blocked)', () => {
      expect(isInfrastructureError('Failed to fetch')).toBe(true)
      expect(isInfrastructureError('failed to fetch')).toBe(true)
      expect(isInfrastructureError('HTTP 502')).toBe(true)
      expect(isInfrastructureError('HTTP 403: Forbidden')).toBe(true)
      expect(isInfrastructureError('NetworkError when attempting to fetch')).toBe(true)
      expect(isInfrastructureError('TypeError: NetworkError')).toBe(true)
      expect(isInfrastructureError('AbortError')).toBe(true)
      expect(isInfrastructureError('发送接口 12s 无响应')).toBe(true)
    })

    test('does NOT flag real B站 moderation errors as infrastructure', () => {
      // Common Bilibili error strings — these mean the message was actually
      // blocked, not a network failure. They MUST go through the "原词被屏蔽"
      // path so the test reports useful results.
      expect(isInfrastructureError('f')).toBe(false)
      expect(isInfrastructureError('k')).toBe(false)
      expect(isInfrastructureError('包含全局屏蔽词')).toBe(false)
      expect(isInfrastructureError('包含房间屏蔽词')).toBe(false)
      expect(isInfrastructureError('你已被禁言')).toBe(false)
      expect(isInfrastructureError('发送频率过快')).toBe(false)
      expect(isInfrastructureError('code 11002')).toBe(false)
      expect(isInfrastructureError(undefined)).toBe(false)
      expect(isInfrastructureError('')).toBe(false)
    })
  })
})
