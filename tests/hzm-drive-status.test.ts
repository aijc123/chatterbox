import { describe, expect, test } from 'bun:test'

import { formatHzmDriveStatus } from '../src/lib/hzm-drive-status'

// Pure-function tests for the smart-driving status text formatter.
// Mirrors auto-blend-status's contract: status reflects (enabled, dryRun, mode, lastActionAt).
describe('formatHzmDriveStatus', () => {
  const NOW = 1_700_000_000_000

  test('returns "已关闭" when not enabled (dryRun / mode / lastActionAt are irrelevant)', () => {
    expect(
      formatHzmDriveStatus({ enabled: false, mode: 'heuristic', dryRun: false, lastActionAt: null, now: NOW })
    ).toBe('已关闭')
    expect(formatHzmDriveStatus({ enabled: false, mode: 'llm', dryRun: true, lastActionAt: NOW, now: NOW })).toBe(
      '已关闭'
    )
  })

  test('returns "试运行（不发送）" when enabled with dryRun (mode/lastAction irrelevant)', () => {
    expect(formatHzmDriveStatus({ enabled: true, mode: 'heuristic', dryRun: true, lastActionAt: null, now: NOW })).toBe(
      '试运行（不发送）'
    )
    expect(formatHzmDriveStatus({ enabled: true, mode: 'llm', dryRun: true, lastActionAt: NOW, now: NOW })).toBe(
      '试运行（不发送）'
    )
  })

  test('returns "运行中 · 启发式" when a recent send happened and mode=heuristic', () => {
    expect(
      formatHzmDriveStatus({ enabled: true, mode: 'heuristic', dryRun: false, lastActionAt: NOW - 2_000, now: NOW })
    ).toBe('运行中 · 启发式')
  })

  test('returns "运行中 · LLM" when a recent send happened and mode=llm', () => {
    expect(formatHzmDriveStatus({ enabled: true, mode: 'llm', dryRun: false, lastActionAt: NOW - 100, now: NOW })).toBe(
      '运行中 · LLM'
    )
  })

  test('"运行中" decays back to "观察中" once the last action ages past the 5s window', () => {
    // 5_000ms is the inclusive boundary; one tick past it must flip back to 观察中.
    expect(
      formatHzmDriveStatus({ enabled: true, mode: 'heuristic', dryRun: false, lastActionAt: NOW - 5_001, now: NOW })
    ).toBe('观察中')
  })

  test('exactly at the 5s boundary is still treated as "运行中" (window is inclusive)', () => {
    expect(
      formatHzmDriveStatus({ enabled: true, mode: 'llm', dryRun: false, lastActionAt: NOW - 5_000, now: NOW })
    ).toBe('运行中 · LLM')
  })

  test('returns "观察中" when enabled, real-fire, but no action has happened yet', () => {
    expect(
      formatHzmDriveStatus({ enabled: true, mode: 'heuristic', dryRun: false, lastActionAt: null, now: NOW })
    ).toBe('观察中')
  })
})
