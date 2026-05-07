// Unit tests for the adaptive cooldown port (autoBlendCooldownAuto + CPM math).
// Covers the pure math (computeAutoCooldownSec) and the rolling-window CPM
// reader (getCurrentCpm), plus the user-vs-auto routing in
// getEffectiveCooldownMs.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

// auto-blend imports api.ts which patches XMLHttpRequest at module load. Mock
// other internal modules with their real exports preserved so unrelated tests
// don't break when this file runs first.
const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const {
  computeAutoCooldownSec,
  getAutoBlendRepeatGapMs,
  getCurrentCpm,
  getEffectiveCooldownMs,
  _pushCpmTimestampForTests,
  _getCpmWindowSizeForTests,
  _resetAutoBlendStateForTests,
} = await import('../src/lib/auto-blend')

const { autoBlendCooldownAuto, autoBlendCooldownSec, msgSendInterval } = await import('../src/lib/store')

// Mirror constants from src/lib/auto-blend.ts (private to that module).
// K=300 is documented in tests below via inline comments at each assertion.
const FLOOR = 2
const CEILING = 60

describe('computeAutoCooldownSec', () => {
  test('returns ceiling when room is silent (cpm == 0)', () => {
    // 冷场房间不应该立刻再发,免得别人喘口气我们就抢话。
    expect(computeAutoCooldownSec(0)).toBe(CEILING)
  })

  test('returns ceiling for negative input (defensive)', () => {
    expect(computeAutoCooldownSec(-5)).toBe(CEILING)
  })

  test('clamps to floor when room is extremely busy (cpm >> K/floor)', () => {
    // K=300, FLOOR=2 → 任何 cpm > 150 都应该被压到 FLOOR=2。
    expect(computeAutoCooldownSec(300)).toBe(FLOOR)
    expect(computeAutoCooldownSec(1000)).toBe(FLOOR)
  })

  test('clamps to ceiling when room is sluggish (cpm << K/ceiling)', () => {
    // K=300, CEILING=60 → 任何 cpm < 5 都应该被拉到 CEILING=60。
    expect(computeAutoCooldownSec(1)).toBe(CEILING)
    expect(computeAutoCooldownSec(4)).toBe(CEILING) // 300/4 = 75 > 60
  })

  test('uses K/cpm formula in the linear range', () => {
    // CPM=30 → 300/30 = 10s
    expect(computeAutoCooldownSec(30)).toBe(10)
    // CPM=60 → 300/60 = 5s
    expect(computeAutoCooldownSec(60)).toBe(5)
    // CPM=15 → 300/15 = 20s
    expect(computeAutoCooldownSec(15)).toBe(20)
  })

  test('rounds K/cpm to nearest integer', () => {
    // 300/7 ≈ 42.857 → 43
    expect(computeAutoCooldownSec(7)).toBe(43)
    // 300/9 ≈ 33.333 → 33
    expect(computeAutoCooldownSec(9)).toBe(33)
  })
})

describe('getCurrentCpm', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
  })

  afterEach(() => {
    _resetAutoBlendStateForTests()
  })

  test('returns 0 when no messages have been observed', () => {
    expect(getCurrentCpm(1_000_000)).toBe(0)
  })

  test('extrapolates from real span when window is partially filled', () => {
    // 5 条消息分布在 4 秒间隔内(t=0,1,2,3,4 秒,span=4s)
    // → 5 / 4s × 60 = 75 cpm
    const base = 1_000_000
    for (let i = 0; i < 5; i++) _pushCpmTimestampForTests(base + i * 1000)
    expect(getCurrentCpm(base + 4000)).toBe(75)
  })

  test('caps extrapolation at CPM_MIN_WINDOW_MS=2000 to prevent single-message spikes', () => {
    // 1 条消息在 100ms 前 → 不应该被外推成 600 cpm。
    // 实际 span=100ms,但下限 2s → 1/2s × 60 = 30 cpm。
    const base = 1_000_000
    _pushCpmTimestampForTests(base - 100)
    expect(getCurrentCpm(base)).toBe(30)
  })

  test('caps window at CPM_WINDOW_SEC=30 — older entries are pruned', () => {
    // 3 条消息分别在 60s/45s/35s 前(都超出 30s 窗口) +
    // 3 条消息在 10s 内 → CPM 只算最新 3 条。
    const now = 1_000_000
    _pushCpmTimestampForTests(now - 60_000)
    _pushCpmTimestampForTests(now - 45_000)
    _pushCpmTimestampForTests(now - 35_000)
    _pushCpmTimestampForTests(now - 10_000)
    _pushCpmTimestampForTests(now - 5_000)
    _pushCpmTimestampForTests(now - 1_000)
    // 读后窗口里只剩 3 条:span=10s, 3/10 × 60 = 18 cpm
    expect(getCurrentCpm(now)).toBe(18)
    // 读 CPM 时也会顺手 prune,验证副作用:
    expect(_getCpmWindowSizeForTests()).toBe(3)
  })

  test('handles all-fresh sub-2s windows without divide-by-zero', () => {
    // 100 条消息全在 50ms 内 → 还是按 2s 下限算:100 / 2 × 60 = 3000 cpm
    const now = 1_000_000
    for (let i = 0; i < 100; i++) _pushCpmTimestampForTests(now - 50 + i)
    expect(getCurrentCpm(now)).toBe(3000)
  })
})

describe('getEffectiveCooldownMs', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
  })

  afterEach(() => {
    _resetAutoBlendStateForTests()
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 35
  })

  test('returns user-fixed cooldown when auto mode is off', () => {
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 12
    expect(getEffectiveCooldownMs(1_000_000)).toBe(12_000)
  })

  test('returns adaptive cooldown when auto mode is on', () => {
    autoBlendCooldownAuto.value = true
    // CPM=30 → 10s (linear range)
    const now = 1_000_000
    for (let i = 0; i < 5; i++) _pushCpmTimestampForTests(now - 5_000 + i * 1000)
    // 5/5s × 60 = 60 cpm → 300/60 = 5s
    expect(getEffectiveCooldownMs(now)).toBe(5_000)
  })

  test('adaptive mode falls back to ceiling on silent rooms', () => {
    autoBlendCooldownAuto.value = true
    expect(getEffectiveCooldownMs(1_000_000)).toBe(CEILING * 1000)
  })

  test('toggling auto-cooldown off mid-session restores user-fixed value', () => {
    autoBlendCooldownAuto.value = true
    autoBlendCooldownSec.value = 25
    const now = 1_000_000
    for (let i = 0; i < 10; i++) _pushCpmTimestampForTests(now - 10_000 + i * 1000)
    // 10/10s × 60 = 60 cpm → 5s
    expect(getEffectiveCooldownMs(now)).toBe(5_000)

    autoBlendCooldownAuto.value = false
    expect(getEffectiveCooldownMs(now)).toBe(25_000)
  })
})

describe('getAutoBlendRepeatGapMs', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
  })

  afterEach(() => {
    _resetAutoBlendStateForTests()
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 35
    msgSendInterval.value = 1.5
  })

  test('uses manual cooldown when auto mode is off', () => {
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 12
    msgSendInterval.value = 1.5
    // max(12s, 1.5s, 1.01s) = 12s
    expect(getAutoBlendRepeatGapMs(1_000_000)).toBe(12_000)
  })

  test('uses adaptive cooldown when auto mode is on, ignoring manual seconds', () => {
    autoBlendCooldownAuto.value = true
    autoBlendCooldownSec.value = 999 // should be ignored
    msgSendInterval.value = 1
    const now = 1_000_000
    for (let i = 0; i < 5; i++) _pushCpmTimestampForTests(now - 5_000 + i * 1000)
    // 5/5s × 60 = 60 cpm → 5s adaptive cooldown
    // max(5000, 1000, 1010) = 5000
    expect(getAutoBlendRepeatGapMs(now)).toBe(5_000)
  })

  test('msgSendInterval acts as floor when cooldown is small', () => {
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 1 // 1000ms
    msgSendInterval.value = 3 // 3000ms
    expect(getAutoBlendRepeatGapMs(1_000_000)).toBe(3_000)
  })

  test('1010ms hard floor applies when both inputs are smaller', () => {
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 0.5 // 500ms — but numericGmSignal min=1 will clamp; force via direct write OK in test
    msgSendInterval.value = 0.5 // 500ms
    expect(getAutoBlendRepeatGapMs(1_000_000)).toBeGreaterThanOrEqual(1010)
  })

  test('adaptive mode falls back to ceiling on silent rooms', () => {
    autoBlendCooldownAuto.value = true
    msgSendInterval.value = 1.5
    // CPM=0 → ceiling 60s, max(60000, 1500, 1010) = 60000
    expect(getAutoBlendRepeatGapMs(1_000_000)).toBe(60_000)
  })
})
