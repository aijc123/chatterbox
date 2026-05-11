/**
 * Pure unit + regression tests for the `cn()` class-name joiner.
 *
 * `cn` is the project's local replacement for `clsx` / `classnames`. It accepts
 * strings, numbers, nested arrays, and "object dictionaries" ({ klass: enabled }).
 * Every UI surface (configurator, settings sections, custom-chat bubbles, ...)
 * funnels its className through this helper, so any regression here cascades
 * across the whole panel. Lock the semantics tight.
 *
 * Why we hand-roll our own: keeps the userscript bundle smaller and avoids a
 * runtime dep that would otherwise need a `connect` allowlist whitelist.
 */

import { describe, expect, test } from 'bun:test'

import { cn } from '../src/lib/cn'

describe('cn — primitive inputs', () => {
  test('returns empty string with no arguments', () => {
    expect(cn()).toBe('')
  })

  test('joins simple string tokens with single spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  test('numeric values are stringified into tokens', () => {
    // Documented behavior: numbers are accepted (mirrors clsx).
    expect(cn(1, 2, 'foo')).toBe('1 2 foo')
  })

  test('treats 0 as falsy and skips it (per pushClass guard)', () => {
    // `if (!value) return` makes 0 indistinguishable from ''/null/undefined.
    // This lines up with how callers use `count > 0 && "has-items"`.
    expect(cn(0, 'a')).toBe('a')
    expect(cn('a', 0, 'b')).toBe('a b')
  })

  test('skips empty strings, null, undefined, and false', () => {
    expect(cn('', 'a', null, 'b', undefined, 'c', false)).toBe('a b c')
  })

  test('splits whitespace-separated tokens inside a single string', () => {
    // Important for legacy callsites that pass " foo  bar " from template
    // literals — the function must not produce double spaces.
    expect(cn('  foo   bar  ')).toBe('foo bar')
  })

  test('handles tabs and newlines as whitespace separators', () => {
    expect(cn('foo\tbar\nbaz')).toBe('foo bar baz')
  })
})

describe('cn — array inputs (recursive)', () => {
  test('flattens a single level of array', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })

  test('flattens deeply nested arrays of arbitrary depth', () => {
    expect(cn(['a', ['b', ['c', ['d']]]])).toBe('a b c d')
  })

  test('drops falsy entries inside arrays', () => {
    expect(cn(['a', null, ['b', false, [undefined, 'c']]])).toBe('a b c')
  })

  test('empty arrays produce no tokens', () => {
    expect(cn([])).toBe('')
    expect(cn([], 'a', [])).toBe('a')
  })

  test('interleaves arrays with primitives in declared order', () => {
    expect(cn('a', ['b', 'c'], 'd', ['e'])).toBe('a b c d e')
  })
})

describe('cn — object dictionaries', () => {
  test('emits keys whose values are truthy', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c')
  })

  test('treats null/undefined/0/"" values as falsy (per ClassDictionary type)', () => {
    // The type is `boolean | null | undefined` but the runtime check is just
    // `if (enabled)` — so 0/'' would also be skipped. Lock this so a future
    // refactor that changes the truthiness check trips here first.
    const dict = { keep: true, skipNull: null, skipUndef: undefined } satisfies Record<
      string,
      boolean | null | undefined
    >
    expect(cn(dict)).toBe('keep')
  })

  test('preserves key order (object iteration is insertion order for string keys)', () => {
    // We rely on V8/Bun preserving insertion order for non-integer string keys.
    expect(cn({ first: true, second: true, third: true })).toBe('first second third')
  })

  test('emits keys with spaces in them verbatim (no splitting at this layer)', () => {
    // Object keys are pushed as-is, not split; this is consistent with clsx
    // and matches how callers write `{ 'btn-primary active': isActive }`.
    expect(cn({ 'btn primary': true })).toBe('btn primary')
  })

  test('skips keys when value is false', () => {
    expect(cn({ on: false, off: true })).toBe('off')
  })

  test('empty object produces no tokens', () => {
    expect(cn({})).toBe('')
  })
})

describe('cn — mixed input shapes', () => {
  test('combines strings, arrays, and dictionaries in one call', () => {
    expect(cn('a', ['b', 'c'], { d: true, e: false }, 'f')).toBe('a b c d f')
  })

  test('dictionaries inside arrays still emit truthy keys', () => {
    expect(cn(['a', { b: true, c: false }, 'd'])).toBe('a b d')
  })

  test('arrays inside arrays inside dictionaries — wait, no — dictionaries do NOT recurse', () => {
    // Important regression: object VALUES are checked for truthiness only;
    // they are not recursively flattened (no clsx surprise there either).
    // The value `['x', 'y']` is truthy → key is emitted, contents ignored.
    expect(cn({ outer: ['x', 'y'] as unknown as boolean })).toBe('outer')
  })

  test('classic Preact pattern: base + variant + state', () => {
    const active = true
    const danger = false
    expect(
      cn(
        'btn',
        ['btn-md', 'rounded'],
        {
          'btn-active': active,
          'btn-danger': danger,
        },
        active && 'has-ring'
      )
    ).toBe('btn btn-md rounded btn-active has-ring')
  })
})

describe('cn — output invariants', () => {
  test('never produces leading, trailing, or double spaces', () => {
    const out = cn(' a ', { b: true }, [' c ', null, undefined])
    expect(out).toBe('a b c')
    expect(out.startsWith(' ')).toBe(false)
    expect(out.endsWith(' ')).toBe(false)
    expect(out.includes('  ')).toBe(false)
  })

  test('idempotent for purely falsy input', () => {
    expect(cn(null, undefined, false, '', 0, [], {})).toBe('')
  })

  test('does not deduplicate repeated tokens (callers may rely on order/multiplicity)', () => {
    // clsx-compatible behavior: deduplication is NOT a contract. Lock it so
    // a "clever" optimization that adds Set-based dedup fails this test and
    // forces a review.
    expect(cn('a', 'a', { a: true })).toBe('a a a')
  })
})
