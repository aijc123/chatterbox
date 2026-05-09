import { describe, expect, test } from 'bun:test'

import { shouldScanNativeEventNode, wheelFoldKey } from '../src/lib/custom-chat-native-adapter'

function fakeNode({
  closest = null,
  containsDanmaku = false,
  matches = false,
  hasChild = false,
}: {
  closest?: Element | null
  containsDanmaku?: boolean
  matches?: boolean
  hasChild?: boolean
}): HTMLElement {
  return {
    closest: () => closest,
    classList: { contains: () => containsDanmaku },
    matches: () => matches,
    querySelector: () => (hasChild ? {} : null),
  } as unknown as HTMLElement
}

describe('custom chat native adapter', () => {
  test('filters custom chat and danmaku nodes before scanning', () => {
    expect(shouldScanNativeEventNode(fakeNode({ closest: {} as Element, matches: true }), 'root')).toBe(false)
    expect(shouldScanNativeEventNode(fakeNode({ containsDanmaku: true, matches: true }), 'root')).toBe(false)
    expect(shouldScanNativeEventNode(fakeNode({ matches: true }), 'root')).toBe(true)
    expect(shouldScanNativeEventNode(fakeNode({ hasChild: true }), 'root')).toBe(true)
  })
})

describe('wheelFoldKey', () => {
  test('collapses runs of identical chars so wheels of different lengths fold together', () => {
    expect(wheelFoldKey('666')).toBe(wheelFoldKey('6666'))
    expect(wheelFoldKey('66666')).toBe(wheelFoldKey('666'))
    expect(wheelFoldKey('哈哈哈')).toBe(wheelFoldKey('哈哈哈哈哈哈'))
    expect(wheelFoldKey('啊啊啊啊')).toBe(wheelFoldKey('啊啊'))
  })

  test('lowercases so NICE and nice fold together', () => {
    expect(wheelFoldKey('NICE')).toBe(wheelFoldKey('nice'))
    expect(wheelFoldKey('666 NICE')).toBe(wheelFoldKey('66 Nice'))
  })

  test('different distinct chars stay distinct (66 ≠ 77, hi ≠ ha)', () => {
    expect(wheelFoldKey('666')).not.toBe(wheelFoldKey('777'))
    expect(wheelFoldKey('哈哈')).not.toBe(wheelFoldKey('啊啊'))
    expect(wheelFoldKey('hi')).not.toBe(wheelFoldKey('ha'))
  })

  test('non-periodic text is preserved (single chars, asymmetric strings, lone tokens stay readable)', () => {
    expect(wheelFoldKey('wow')).toBe('wow')
    expect(wheelFoldKey('你好啊')).toBe('你好啊')
    expect(wheelFoldKey('[doge]')).toBe('[doge]')
    expect(wheelFoldKey('晚安啊')).toBe('晚安啊')
  })

  test('phrase-level periodic repeats fold so wheel-mode evasion (晚安晚安晚安) collapses', () => {
    // 同一短语的周期重复折成一份，不同长度的同款全归同一把键。
    expect(wheelFoldKey('你好你好')).toBe('你好')
    expect(wheelFoldKey('晚安晚安晚安')).toBe('晚安')
    expect(wheelFoldKey('晚安晚安')).toBe(wheelFoldKey('晚安晚安晚安晚安'))
    expect(wheelFoldKey('晚安')).toBe(wheelFoldKey('晚安晚安晚安晚安晚安晚安'))
    expect(wheelFoldKey('[doge][doge]')).toBe('[doge]')
    expect(wheelFoldKey('abcabcabc')).toBe('abc')
    // 部分重复 / 带尾巴的不折，保留原样
    expect(wheelFoldKey('晚安晚安晚')).toBe('晚安晚安晚')
  })

  test('whitespace is collapsed and trimmed (compactText behavior preserved)', () => {
    expect(wheelFoldKey('  666   ')).toBe('6')
    expect(wheelFoldKey('hello\t\nworld')).toBe('helo world')
  })
})
