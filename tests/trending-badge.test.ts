// Render-tree tests for `<TrendingBadge content={...}>`. Mirrors the
// VNode-walking pattern used by tests/settings-ui.test.ts: we don't mount a
// DOM, we just call the component as a function and inspect the returned
// JSX tree. That's sufficient to prove:
//   - badge is omitted (returns null) when the meme isn't trending
//   - badge renders 🔥 + a rank/cluster tooltip when the meme IS trending
//   - whitespace/case variants of the content still match (delegates to
//     lookupTrendingMatch which is independently tested in
//     tests/meme-trending.test.ts)
//   - signal updates flip the rendered output across renders
//
// No internal-module mock.module — the test mutates the public
// `trendingMemeKeys` signal directly, which is the same surface the real
// `refreshTrendingMemes()` writes to.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { VNode } from 'preact'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { _resetTrendingMemesForTests, trendingMemeKeys } = await import('../src/lib/meme-trending')
const { TrendingBadge } = await import('../src/components/trending-badge')

type TreeNode = VNode<Record<string, unknown>> | string | number | boolean | null | undefined

function isVNode(n: TreeNode): n is VNode<Record<string, unknown>> {
  return !!n && typeof n === 'object' && 'type' in n && 'props' in n
}

function collectText(node: TreeNode): string {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'boolean') return ''
  const children = node.props?.children
  if (Array.isArray(children)) return children.map(c => collectText(c as TreeNode)).join('')
  return collectText(children as TreeNode)
}

beforeEach(() => {
  resetGmStore()
  _resetTrendingMemesForTests()
})

afterEach(() => {
  _resetTrendingMemesForTests()
})

describe('<TrendingBadge>', () => {
  test('returns null when trendingMemeKeys is empty', () => {
    const out = TrendingBadge({ content: '冲鸭' }) as TreeNode
    expect(out).toBeNull()
  })

  test('returns null when content does not match any trending key', () => {
    trendingMemeKeys.value = new Map([['something else', { rank: 1, clusterId: 1, heatScore: 0, slopeScore: 0 }]])
    const out = TrendingBadge({ content: '冲鸭' }) as TreeNode
    expect(out).toBeNull()
  })

  test('renders 🔥 + tooltip when meme content matches a trending cluster', () => {
    trendingMemeKeys.value = new Map([['冲', { rank: 3, clusterId: 42, heatScore: 7, slopeScore: 2 }]])
    const out = TrendingBadge({ content: '冲' }) as TreeNode

    expect(isVNode(out)).toBe(true)
    if (!isVNode(out)) throw new Error('expected VNode')

    expect(out.type).toBe('span')
    expect(out.props.title).toBe('今日跨房间热门 · 第 3 位（簇 #42）')
    expect(collectText(out)).toBe('🔥')
  })

  test('whitespace + case variants in content still hit the same cluster', () => {
    trendingMemeKeys.value = new Map([['cool', { rank: 1, clusterId: 1, heatScore: 0, slopeScore: 0 }]])
    // memeContentKey lowercases + collapses whitespace + trims, so all of
    // these should normalize to "cool" and produce a badge.
    for (const variant of ['COOL', '  cool  ', 'Cool', 'cool']) {
      const out = TrendingBadge({ content: variant }) as TreeNode
      expect(isVNode(out)).toBe(true)
      if (!isVNode(out)) throw new Error(`expected VNode for variant ${JSON.stringify(variant)}`)
      expect(collectText(out)).toBe('🔥')
    }
  })

  test('empty content returns null without a lookup', () => {
    trendingMemeKeys.value = new Map([['', { rank: 1, clusterId: 1, heatScore: 0, slopeScore: 0 }]])
    expect(TrendingBadge({ content: '' }) as TreeNode).toBeNull()
    expect(TrendingBadge({ content: '   ' }) as TreeNode).toBeNull()
  })

  test('reacts to signal updates: same content flips from null → badge → null', () => {
    // Initially empty → no badge
    expect(TrendingBadge({ content: '冲' }) as TreeNode).toBeNull()

    // Map gains the entry → badge appears
    trendingMemeKeys.value = new Map([['冲', { rank: 5, clusterId: 9, heatScore: 1, slopeScore: 0 }]])
    const hit = TrendingBadge({ content: '冲' }) as TreeNode
    expect(isVNode(hit)).toBe(true)
    if (!isVNode(hit)) throw new Error('expected VNode')
    expect(hit.props.title).toContain('第 5 位')
    expect(hit.props.title).toContain('簇 #9')

    // Map cleared → badge disappears again
    trendingMemeKeys.value = new Map()
    expect(TrendingBadge({ content: '冲' }) as TreeNode).toBeNull()
  })

  test('rank + clusterId from the match are reflected verbatim in the tooltip', () => {
    trendingMemeKeys.value = new Map([
      ['上车', { rank: 1, clusterId: 100, heatScore: 50, slopeScore: 20 }],
      ['谢谢老板', { rank: 17, clusterId: 7, heatScore: 2, slopeScore: 0 }],
    ])

    const a = TrendingBadge({ content: '上车' }) as TreeNode
    const b = TrendingBadge({ content: '谢谢老板' }) as TreeNode

    if (!isVNode(a) || !isVNode(b)) throw new Error('expected both VNodes')
    expect(a.props.title).toBe('今日跨房间热门 · 第 1 位（簇 #100）')
    expect(b.props.title).toBe('今日跨房间热门 · 第 17 位（簇 #7）')
  })
})
