import { describe, expect, test } from 'bun:test'

import { decideAutoBlendToggle, shouldRequireAutoBlendRealFireConfirm } from '../src/lib/auto-blend-toggle'

describe('shouldRequireAutoBlendRealFireConfirm', () => {
  test('requires confirm when enabling with dry-run off and never confirmed', () => {
    expect(
      shouldRequireAutoBlendRealFireConfirm({
        currentlyEnabled: false,
        dryRun: false,
        hasConfirmedRealFire: false,
      })
    ).toBe(true)
  })

  test('does not require confirm when dry-run is on (still safe)', () => {
    expect(
      shouldRequireAutoBlendRealFireConfirm({
        currentlyEnabled: false,
        dryRun: true,
        hasConfirmedRealFire: false,
      })
    ).toBe(false)
  })

  test('does not require confirm if user already accepted once', () => {
    expect(
      shouldRequireAutoBlendRealFireConfirm({
        currentlyEnabled: false,
        dryRun: false,
        hasConfirmedRealFire: true,
      })
    ).toBe(false)
  })

  test('does not require confirm when turning auto-blend off', () => {
    expect(
      shouldRequireAutoBlendRealFireConfirm({
        currentlyEnabled: true,
        dryRun: false,
        hasConfirmedRealFire: false,
      })
    ).toBe(false)
  })
})

describe('decideAutoBlendToggle', () => {
  test('proceeds without invoking confirm when not gated', () => {
    let confirmCalls = 0
    const decision = decideAutoBlendToggle(
      { currentlyEnabled: false, dryRun: true, hasConfirmedRealFire: false },
      () => {
        confirmCalls += 1
        return true
      }
    )
    expect(confirmCalls).toBe(0)
    expect(decision).toEqual({ proceed: true, markConfirmed: false })
  })

  test('asks confirm and proceeds when user accepts; flags as confirmed', () => {
    let confirmCalls = 0
    const decision = decideAutoBlendToggle(
      { currentlyEnabled: false, dryRun: false, hasConfirmedRealFire: false },
      () => {
        confirmCalls += 1
        return true
      }
    )
    expect(confirmCalls).toBe(1)
    expect(decision).toEqual({ proceed: true, markConfirmed: true })
  })

  test('asks confirm and aborts when user cancels; does not flag', () => {
    let confirmCalls = 0
    const decision = decideAutoBlendToggle(
      { currentlyEnabled: false, dryRun: false, hasConfirmedRealFire: false },
      () => {
        confirmCalls += 1
        return false
      }
    )
    expect(confirmCalls).toBe(1)
    expect(decision).toEqual({ proceed: false, markConfirmed: false })
  })

  test('does not re-prompt once user has confirmed previously', () => {
    let confirmCalls = 0
    const decision = decideAutoBlendToggle(
      { currentlyEnabled: false, dryRun: false, hasConfirmedRealFire: true },
      () => {
        confirmCalls += 1
        return true
      }
    )
    expect(confirmCalls).toBe(0)
    expect(decision).toEqual({ proceed: true, markConfirmed: false })
  })

  test('disabling never prompts even if dry-run is off and never confirmed', () => {
    let confirmCalls = 0
    const decision = decideAutoBlendToggle(
      { currentlyEnabled: true, dryRun: false, hasConfirmedRealFire: false },
      () => {
        confirmCalls += 1
        return true
      }
    )
    expect(confirmCalls).toBe(0)
    expect(decision).toEqual({ proceed: true, markConfirmed: false })
  })
})
