import { describe, expect, test } from 'bun:test'

import { formatMilliyuanAmount, formatMilliyuanBadgeAmount } from '../src/lib/custom-chat-pricing'

describe('formatMilliyuanAmount', () => {
  test('formats low-price gifts with one decimal place', () => {
    expect(formatMilliyuanAmount(100)).toBe('¥0.1')
    expect(formatMilliyuanAmount(500)).toBe('¥0.5')
    expect(formatMilliyuanAmount(1000)).toBe('¥1')
  })

  // The `if (!amount || !isFinite || amount <= 0)` guard is composed of three
  // separately-mutable conditions. Each one needs its own test row to kill
  // the LogicalOperator + ConditionalExpression mutants.
  test('undefined → "" (locks the falsy-amount short-circuit)', () => {
    expect(formatMilliyuanAmount(undefined)).toBe('')
  })

  test('0 → "" (locks the `<= 0` boundary, not `< 0`)', () => {
    // !amount triggers on 0 anyway, but the `<= 0` clause is what catches
    // negative zero / Number(0) edge cases — pinning the exact return.
    expect(formatMilliyuanAmount(0)).toBe('')
  })

  test('negative → "" (locks the `<= 0` clause)', () => {
    expect(formatMilliyuanAmount(-100)).toBe('')
    expect(formatMilliyuanAmount(-1)).toBe('')
  })

  test('NaN → "" (locks the !Number.isFinite clause)', () => {
    // !amount is also true for NaN, but pin the exact return so a mutation
    // of !isFinite → !isInteger gets caught when amount is a valid integer.
    expect(formatMilliyuanAmount(Number.NaN)).toBe('')
  })

  test('Infinity → "" (locks the !Number.isFinite clause, not covered by !amount)', () => {
    // Critical: `!Infinity` is false, so the !amount clause does NOT short-
    // circuit here. Only !Number.isFinite catches it. If a mutation drops
    // the isFinite clause, Infinity would slip through and divide-by-1000
    // would still be Infinity.
    expect(formatMilliyuanAmount(Number.POSITIVE_INFINITY)).toBe('')
    expect(formatMilliyuanAmount(Number.NEGATIVE_INFINITY)).toBe('')
  })

  test('boundary at amount=1 (yuan=0.001 < 1 → low-price formatter)', () => {
    // yuan = 0.001, round(0.01) = 0, toFixed(1) = '0.0'
    expect(formatMilliyuanAmount(1)).toBe('¥0.0')
  })

  test('boundary at yuan=1 vs yuan<1 (locks `< 1` not `<= 1`)', () => {
    // yuan=0.999 → low-price branch
    expect(formatMilliyuanAmount(999)).toBe('¥1.0') // round(9.99)=10, /10=1, toFixed='1.0'
    // yuan=1 exactly → high-price branch (integer path)
    expect(formatMilliyuanAmount(1000)).toBe('¥1')
  })

  test('high-price integer yuan uses no decimal (locks Number.isInteger branch)', () => {
    expect(formatMilliyuanAmount(2000)).toBe('¥2')
    expect(formatMilliyuanAmount(10000)).toBe('¥10')
    expect(formatMilliyuanAmount(100000)).toBe('¥100')
  })

  test('high-price non-integer yuan uses one decimal (locks the else branch)', () => {
    expect(formatMilliyuanAmount(1500)).toBe('¥1.5')
    expect(formatMilliyuanAmount(2300)).toBe('¥2.3')
    // Rounding: yuan=2.34 → round(23.4)=23 → 2.3
    expect(formatMilliyuanAmount(2340)).toBe('¥2.3')
    // Rounding: yuan=2.35 → round(23.5)=24 → 2.4
    expect(formatMilliyuanAmount(2350)).toBe('¥2.4')
  })

  test('honors custom currency symbol (locks the default `¥` parameter)', () => {
    // Pinning the default vs the override catches a mutation of the
    // default-value StringLiteral `'¥'`.
    expect(formatMilliyuanAmount(2000, '$')).toBe('$2')
    expect(formatMilliyuanAmount(500, '$')).toBe('$0.5')
    expect(formatMilliyuanAmount(1500, '')).toBe('1.5')
  })

  test('default symbol is "¥" (locks against StringLiteral mutation)', () => {
    // The default parameter `symbol = '¥'` is its own mutable string
    // literal. Pin it by comparing the no-arg call against an explicit one.
    expect(formatMilliyuanAmount(2000)).toBe(formatMilliyuanAmount(2000, '¥'))
    expect(formatMilliyuanAmount(2000)).not.toBe(formatMilliyuanAmount(2000, '$'))
  })
})

describe('formatMilliyuanBadgeAmount', () => {
  test('formats badge values without duplicating the currency symbol', () => {
    expect(formatMilliyuanBadgeAmount(100)).toBe('0.1元')
    expect(formatMilliyuanBadgeAmount(500)).toBe('0.5元')
    expect(formatMilliyuanBadgeAmount(1000)).toBe('1元')
  })

  test('returns "" when the underlying formatter returns "" (locks the truthy branch)', () => {
    // formatMilliyuanAmount(0, '') returns '' so the `formatted ? … : ''`
    // ternary takes the false branch. Without this test, a mutation of
    // `formatted ?` → `!formatted ?` flips the output but the happy-path
    // assertions above can't detect it.
    expect(formatMilliyuanBadgeAmount(undefined)).toBe('')
    expect(formatMilliyuanBadgeAmount(0)).toBe('')
    expect(formatMilliyuanBadgeAmount(-100)).toBe('')
    expect(formatMilliyuanBadgeAmount(Number.NaN)).toBe('')
  })

  test('suffix is exactly "元" (locks the StringLiteral)', () => {
    // Pinned exact-string comparison catches a mutation of `'元'` →
    // `'Stryker was here!'`.
    expect(formatMilliyuanBadgeAmount(1000)).toEndWith('元')
    expect(formatMilliyuanBadgeAmount(1000)).toBe('1元')
    expect(formatMilliyuanBadgeAmount(2500)).toBe('2.5元')
  })

  test("passes empty-string symbol to underlying formatter (locks `formatMilliyuanAmount(amount, '')`)", () => {
    // Badge uses no currency prefix — the inner call must pass '' not '¥'.
    // Otherwise badge would output '¥1元' instead of '1元'.
    expect(formatMilliyuanBadgeAmount(1000)).toBe('1元')
    expect(formatMilliyuanBadgeAmount(1000)).not.toContain('¥')
  })
})
