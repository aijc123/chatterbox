import { describe, expect, test } from 'bun:test'

import { AUTO_BLEND_PRESETS, type AutoBlendPreset, getAutoBlendPresetValues } from '../src/lib/auto-blend-preset-config'

describe('auto-blend presets', () => {
  test('normal preset includes advanced safety defaults', () => {
    const normal = getAutoBlendPresetValues('normal')

    expect(normal.burstSettleMs).toBe(1500)
    expect(normal.rateLimitWindowMin).toBe(10)
    expect(normal.rateLimitStopThreshold).toBe(3)
  })

  test('hot preset is quicker but stops after fewer rate-limit hits', () => {
    const normal = getAutoBlendPresetValues('normal')
    const hot = getAutoBlendPresetValues('hot')

    expect(hot.burstSettleMs).toBeLessThan(normal.burstSettleMs)
    expect(hot.rateLimitStopThreshold).toBeLessThan(normal.rateLimitStopThreshold)
  })
})

// Mutation-testing fortifications below: every field of every preset is
// pinned to an exact value so stryker can't bump a number, swap a label, or
// flip a boolean without flipping a test.
describe('AUTO_BLEND_PRESETS exact-value lock', () => {
  test('safe preset matches the spec', () => {
    expect(AUTO_BLEND_PRESETS.safe).toEqual({
      label: '稳一点',
      hint: '少跟，适合挂机',
      windowSec: 25,
      threshold: 5,
      cooldownSec: 45,
      routineIntervalSec: 75,
      minDistinctUsers: 3,
      burstSettleMs: 1800,
      rateLimitWindowMin: 10,
      rateLimitStopThreshold: 3,
    })
  })

  test('normal preset matches the spec', () => {
    expect(AUTO_BLEND_PRESETS.normal).toEqual({
      label: '正常',
      hint: '推荐，比较克制',
      windowSec: 20,
      threshold: 4,
      cooldownSec: 35,
      routineIntervalSec: 60,
      minDistinctUsers: 3,
      burstSettleMs: 1500,
      rateLimitWindowMin: 10,
      rateLimitStopThreshold: 3,
    })
  })

  test('hot preset matches the spec', () => {
    expect(AUTO_BLEND_PRESETS.hot).toEqual({
      label: '热闹',
      hint: '跟得更快，但会自动刹车',
      windowSec: 15,
      threshold: 3,
      cooldownSec: 20,
      routineIntervalSec: 40,
      minDistinctUsers: 2,
      burstSettleMs: 1200,
      rateLimitWindowMin: 10,
      rateLimitStopThreshold: 2,
    })
  })

  test('preset registry has exactly three entries (locks ObjectLiteral mutation)', () => {
    const keys = Object.keys(AUTO_BLEND_PRESETS).sort()
    expect(keys).toEqual(['hot', 'normal', 'safe'])
  })
})

describe('getAutoBlendPresetValues', () => {
  // The function spreads the preset and tacks on four hard-coded values.
  // Pin each tacked-on value across all three presets so the StringLiteral /
  // BooleanLiteral / number mutations get killed.
  test.each([
    'safe',
    'normal',
    'hot',
  ] as const)('%s preset: extra fields are requireDistinctUsers=true, sendCount=1, sendAllTrending=false, useReplacements=true', (preset: AutoBlendPreset) => {
    const v = getAutoBlendPresetValues(preset)
    expect(v.requireDistinctUsers).toBe(true)
    expect(v.sendCount).toBe(1)
    expect(v.sendAllTrending).toBe(false)
    expect(v.useReplacements).toBe(true)
  })

  test.each([
    'safe',
    'normal',
    'hot',
  ] as const)('%s preset: all base fields preserved verbatim', (preset: AutoBlendPreset) => {
    const base = AUTO_BLEND_PRESETS[preset]
    const v = getAutoBlendPresetValues(preset)
    expect(v.label).toBe(base.label)
    expect(v.hint).toBe(base.hint)
    expect(v.windowSec).toBe(base.windowSec)
    expect(v.threshold).toBe(base.threshold)
    expect(v.cooldownSec).toBe(base.cooldownSec)
    expect(v.routineIntervalSec).toBe(base.routineIntervalSec)
    expect(v.minDistinctUsers).toBe(base.minDistinctUsers)
    expect(v.burstSettleMs).toBe(base.burstSettleMs)
    expect(v.rateLimitWindowMin).toBe(base.rateLimitWindowMin)
    expect(v.rateLimitStopThreshold).toBe(base.rateLimitStopThreshold)
  })

  test('returns a new object each call (locks against ObjectLiteral → reused-ref mutation)', () => {
    const a = getAutoBlendPresetValues('normal')
    const b = getAutoBlendPresetValues('normal')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  test('safe → normal → hot: windowSec / threshold / cooldownSec decrease monotonically', () => {
    // Spec invariants — if a preset gets bumped to a wrong number the
    // ordering breaks.
    const safe = AUTO_BLEND_PRESETS.safe
    const normal = AUTO_BLEND_PRESETS.normal
    const hot = AUTO_BLEND_PRESETS.hot
    expect(safe.windowSec).toBeGreaterThan(normal.windowSec)
    expect(normal.windowSec).toBeGreaterThan(hot.windowSec)
    expect(safe.threshold).toBeGreaterThan(normal.threshold)
    expect(normal.threshold).toBeGreaterThan(hot.threshold)
    expect(safe.cooldownSec).toBeGreaterThan(normal.cooldownSec)
    expect(normal.cooldownSec).toBeGreaterThan(hot.cooldownSec)
  })
})
