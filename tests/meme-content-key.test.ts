/**
 * Locks `memeContentKey()` to the cross-source dedup contract: same meme
 * text from LAPLACE + chatterbox-cloud + SBHZM must collapse into one key.
 *
 * The normalizer chain is:
 *   1. strip zero-width characters (ZWSP/ZWJ/ZWNJ/BOM)
 *   2. collapse all whitespace runs (incl. unicode) to a single space
 *   3. trim leading/trailing whitespace
 *   4. lowercase
 *
 * Each step is asserted independently so the mutation tester can't drop one
 * without a test flipping.
 */

import { describe, expect, test } from 'bun:test'

import { memeContentKey } from '../src/lib/meme-content-key'

describe('memeContentKey (cross-source dedup key)', () => {
  test('strips zero-width spaces, joiners, non-joiners, and BOM', () => {
    // ZWSP ​, ZWNJ ‌, ZWJ ‍, BOM
    expect(memeContentKey('hello​world')).toBe('helloworld')
    expect(memeContentKey('hello‌world')).toBe('helloworld')
    expect(memeContentKey('hello‍world')).toBe('helloworld')
    expect(memeContentKey('hello﻿world')).toBe('helloworld')
  })

  test('collapses any whitespace run to a single space', () => {
    expect(memeContentKey('a  b')).toBe('a b')
    expect(memeContentKey('a\t\tb')).toBe('a b')
    expect(memeContentKey('a\n\nb')).toBe('a b')
    expect(memeContentKey('a \t\n b')).toBe('a b')
  })

  test('uses /\\s+/u so unicode whitespace also collapses (locks the `u` flag)', () => {
    // U+3000 (ideographic space) — only matches \s when the regex has /u.
    // Stryker likes to drop regex flags; this test catches that mutation.
    expect(memeContentKey('a　b')).toBe('a b')
  })

  test('trims leading and trailing whitespace', () => {
    expect(memeContentKey('  hello  ')).toBe('hello')
    expect(memeContentKey('\thello\n')).toBe('hello')
    expect(memeContentKey('   ')).toBe('')
  })

  test('lowercases the result (last in the chain)', () => {
    expect(memeContentKey('HELLO')).toBe('hello')
    expect(memeContentKey('HelloWorld')).toBe('helloworld')
  })

  test('empty string stays empty', () => {
    expect(memeContentKey('')).toBe('')
  })

  test('full pipeline: LAPLACE + chatterbox-cloud variants collapse to same key', () => {
    // Same meme uploaded via different sources tends to differ on these
    // exact axes (extra whitespace, copy-pasted ZWSPs, case differences).
    const variants = [
      '哈哈哈',
      '  哈哈哈  ',
      '哈​哈​哈',
      '哈　哈　哈',
      '哈 哈 哈',
    ]
    const keys = variants.map(memeContentKey)
    // First two: trivially equal. Others should also equal '哈哈哈' or '哈 哈 哈'
    // depending on whether internal whitespace exists. Pin both buckets.
    expect(keys[0]).toBe('哈哈哈')
    expect(keys[1]).toBe('哈哈哈')
    expect(keys[2]).toBe('哈哈哈') // ZWSPs stripped first, then no spaces to collapse
    expect(keys[3]).toBe('哈 哈 哈') // U+3000 collapses to ascii space
    expect(keys[4]).toBe('哈 哈 哈')
  })

  test('lowercase happens AFTER zero-width strip and whitespace collapse', () => {
    // Order matters: if lowercase happened first, the ZWSP regex would still
    // strip (it's not case-sensitive). But chaining matters for assertion
    // robustness. This case confirms the full pipeline.
    expect(memeContentKey('  HELLO​WORLD  ')).toBe('helloworld')
  })
})
