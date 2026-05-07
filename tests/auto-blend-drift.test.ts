// Unit tests for the autoBlendDriftFromPreset computed signal.
// Verifies the "+/- X% 激进" readout that the panel shows when the user has
// drifted off a named preset into custom values.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const {
  autoBlendCooldownSec,
  autoBlendDriftFromPreset,
  autoBlendMinDistinctUsers,
  autoBlendPreset,
  autoBlendThreshold,
  autoBlendWindowSec,
  lastAppliedPresetBaseline,
} = await import('../src/lib/store')
const { applyAutoBlendPreset } = await import('../src/lib/auto-blend-presets')
const { AUTO_BLEND_PRESETS } = await import('../src/lib/auto-blend-preset-config')

describe('autoBlendDriftFromPreset', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
  })

  afterEach(() => {
    resetGmStore()
  })

  test('returns 0% drift when current preset is a named one', () => {
    autoBlendPreset.value = 'normal'
    expect(autoBlendDriftFromPreset.value).toEqual({ baselinePreset: 'normal', driftPercent: 0 })

    autoBlendPreset.value = 'safe'
    expect(autoBlendDriftFromPreset.value).toEqual({ baselinePreset: 'safe', driftPercent: 0 })

    autoBlendPreset.value = 'hot'
    expect(autoBlendDriftFromPreset.value).toEqual({ baselinePreset: 'hot', driftPercent: 0 })
  })

  test('records baseline when applyAutoBlendPreset runs', () => {
    applyAutoBlendPreset('safe')
    expect(lastAppliedPresetBaseline.value).toBe('safe')
    applyAutoBlendPreset('hot')
    expect(lastAppliedPresetBaseline.value).toBe('hot')
  })

  test('drift falls back to "normal" baseline default when never applied', () => {
    // GM store fresh (lastAppliedPresetBaseline default = 'normal'),
    // user is on 'custom' from old persistence.
    autoBlendPreset.value = 'custom'
    expect(autoBlendDriftFromPreset.value.baselinePreset).toBe('normal')
  })

  test('positive drift when user moves towards more aggressive (lower threshold)', () => {
    applyAutoBlendPreset('normal') // threshold = 4
    autoBlendThreshold.value = 2 // 50% lower than baseline=4
    autoBlendPreset.value = 'custom'

    const drift = autoBlendDriftFromPreset.value
    expect(drift.baselinePreset).toBe('normal')
    // threshold weight=2/total=6: weighted = (0.5 * 2) / 6 = 0.1667 → 17%
    expect(drift.driftPercent).toBe(17)
  })

  test('negative drift when user moves towards more conservative (higher cooldown)', () => {
    applyAutoBlendPreset('normal') // cooldown = 35
    autoBlendCooldownSec.value = 70 // 100% above baseline → -100% on aggressiveness axis
    autoBlendPreset.value = 'custom'

    const drift = autoBlendDriftFromPreset.value
    expect(drift.baselinePreset).toBe('normal')
    // cooldown weight=2/total=6: weighted = (-1.0 * 2) / 6 = -0.333 → -33%
    expect(drift.driftPercent).toBe(-33)
  })

  test('windowSec longer than baseline counts as more aggressive', () => {
    applyAutoBlendPreset('normal') // windowSec = 20
    autoBlendWindowSec.value = 40 // 100% longer = more aggressive
    autoBlendPreset.value = 'custom'

    // window weight=1/total=6: weighted = (1.0 * 1) / 6 = 0.167 → 17%
    expect(autoBlendDriftFromPreset.value.driftPercent).toBe(17)
  })

  test('lower minDistinctUsers counts as more aggressive', () => {
    applyAutoBlendPreset('normal') // minDistinctUsers = 3
    autoBlendMinDistinctUsers.value = 2 // 33.3% lower
    autoBlendPreset.value = 'custom'

    // weight=1/total=6: weighted = (0.333 * 1) / 6 ≈ 0.0556 → 6%
    expect(autoBlendDriftFromPreset.value.driftPercent).toBe(6)
  })

  test('combined offsets average correctly', () => {
    applyAutoBlendPreset('normal') // win=20 thr=4 cool=35 users=3
    autoBlendThreshold.value = 2 // +0.5 (weight 2)
    autoBlendCooldownSec.value = 17.5 // +0.5 (weight 2)
    autoBlendPreset.value = 'custom'

    // weighted = (0.5*2 + 0.5*2) / 6 = 0.333 → 33%
    expect(autoBlendDriftFromPreset.value.driftPercent).toBe(33)
  })

  test('switching baseline mid-drift updates the readout', () => {
    applyAutoBlendPreset('normal')
    autoBlendThreshold.value = 2
    autoBlendPreset.value = 'custom'
    expect(autoBlendDriftFromPreset.value.baselinePreset).toBe('normal')

    // User clicks 稳一点 — baseline jumps to 'safe', preset goes back to 'safe'
    applyAutoBlendPreset('safe')
    expect(autoBlendDriftFromPreset.value).toEqual({ baselinePreset: 'safe', driftPercent: 0 })

    // Drift again: thr 5 → 3 (-40%) on safe baseline
    autoBlendThreshold.value = 3
    autoBlendPreset.value = 'custom'
    const drift = autoBlendDriftFromPreset.value
    expect(drift.baselinePreset).toBe('safe')
    // (5-3)/5 = 0.4, weight 2/6 = 0.133 → 13%
    expect(drift.driftPercent).toBe(13)
  })

  test('matches preset hint config exactly when applied (sanity)', () => {
    applyAutoBlendPreset('hot')
    const hot = AUTO_BLEND_PRESETS.hot
    expect(autoBlendThreshold.value).toBe(hot.threshold)
    expect(autoBlendCooldownSec.value).toBe(hot.cooldownSec)
    expect(autoBlendDriftFromPreset.value).toEqual({ baselinePreset: 'hot', driftPercent: 0 })
  })
})
