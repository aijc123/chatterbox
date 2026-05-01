import { describe, expect, test } from 'bun:test'

import { shouldScanNativeEventNode } from '../src/lib/custom-chat-native-adapter'

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
