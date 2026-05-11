/**
 * Locks `md5()` to the RFC 1321 test vectors plus a few extra fixtures used
 * by Bilibili's WBI signing (so the mutation tester can't silently change a
 * constant inside the F/G/H/I rounds, the rotate amounts, or the addUnsigned
 * helper without flipping a digest).
 *
 * The implementation is the classic 1990s-era public-domain port (Paul
 * Johnston / Greg Holt), so all of the magic constants are immutable. Any
 * mutation operator (BinaryOperator on `&`/`|`/`^`/`~`, ArithmeticOperator
 * on `<<`/`>>`, ConditionalExpression on the loop boundary, StringLiteral
 * on the hex digit map) changes the output digest, which the fixtures here
 * detect.
 *
 * Imported from the pure module so the test stays free of GM_* / userscript
 * globals — `md5.ts` has zero side-effect imports.
 */

import { describe, expect, test } from 'bun:test'

import { md5 } from '../src/lib/md5'

describe('md5 (RFC 1321 test vectors)', () => {
  // Reference vectors straight out of RFC 1321 Appendix A.5. If a mutation
  // flips any of the constants in ff/gg/hh/ii or the rotate amounts, at
  // least one of these will mismatch — they collectively exercise every
  // round of every block.
  test('empty string → d41d8cd98f00b204e9800998ecf8427e', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  test('"a" → 0cc175b9c0f1b6a831c399e269772661', () => {
    expect(md5('a')).toBe('0cc175b9c0f1b6a831c399e269772661')
  })

  test('"abc" → 900150983cd24fb0d6963f7d28e17f72', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  test('"message digest" → f96b697d7cb7938d525a2f31aaf161d0', () => {
    expect(md5('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0')
  })

  test('lowercase alphabet → c3fcd3d76192e4007dfb496cca67e13b', () => {
    expect(md5('abcdefghijklmnopqrstuvwxyz')).toBe('c3fcd3d76192e4007dfb496cca67e13b')
  })

  test('mixed-case alphanumeric → d174ab98d277d9f5a5611c2c9f419d9f', () => {
    expect(md5('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')).toBe(
      'd174ab98d277d9f5a5611c2c9f419d9f'
    )
  })

  test('80-digit numeric string → 57edf4a22be3c955ac49da2e2107b67a', () => {
    expect(md5('12345678901234567890123456789012345678901234567890123456789012345678901234567890')).toBe(
      '57edf4a22be3c955ac49da2e2107b67a'
    )
  })
})

describe('md5 (boundary cases for block padding)', () => {
  // The implementation pads at byte index = str.length, and writes the length
  // word at `(((len+8) >> 6) << 4) + 14`. Lengths near the 56-byte boundary
  // (where a second padding block becomes necessary) are most fragile to
  // mutations of the padding math. These fixtures pin both sides of that
  // boundary.

  test('55 chars (one block away from second-block padding)', () => {
    const s = 'a'.repeat(55)
    expect(md5(s)).toBe('ef1772b6dff9a122358552954ad0df65')
  })

  test('56 chars (exactly at the boundary)', () => {
    const s = 'a'.repeat(56)
    expect(md5(s)).toBe('3b0c8ac703f828b04c6c197006d17218')
  })

  test('64 chars (one full block)', () => {
    const s = 'a'.repeat(64)
    expect(md5(s)).toBe('014842d480b571495a4a0363793f7367')
  })
})

describe('md5 (output shape invariants)', () => {
  // These guard against the trivial mutations (return early, return ''),
  // and lock the `wordToHex` helper's hex-digit semantics.
  test('always returns a 32-char lowercase hex string', () => {
    for (const s of ['', 'a', 'hello world', '中文'.repeat(10), 'x'.repeat(100)]) {
      const h = md5(s)
      expect(h).toHaveLength(32)
      expect(h).toMatch(/^[0-9a-f]{32}$/)
    }
  })

  test('different inputs produce different digests (collision sanity)', () => {
    expect(md5('a')).not.toBe(md5('b'))
    expect(md5('abc')).not.toBe(md5('abd'))
    expect(md5('hello')).not.toBe(md5('Hello'))
  })

  test('is deterministic — same input always returns same digest', () => {
    const inputs = ['', 'a', 'abc', 'message digest']
    for (const s of inputs) {
      expect(md5(s)).toBe(md5(s))
    }
  })
})
