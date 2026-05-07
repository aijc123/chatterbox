import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { VNode } from 'preact'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: (_key: string, defaultValue: unknown) => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { LayoutSection } = await import('../src/components/settings/layout-section')
const { DanmakuDirectSection } = await import('../src/components/settings/danmaku-direct-section')
const { ErrorBoundary } = await import('../src/components/error-boundary')
const {
  danmakuDirectAlwaysShow,
  danmakuDirectConfirm,
  danmakuDirectMode,
  forceScrollDanmaku,
  optimizeLayout,
  unlockForbidLive,
  unlockSpaceBlock,
} = await import('../src/lib/store')

type TreeNode = VNode<Record<string, unknown>> | string | number | boolean | null | undefined

function collectNodes(
  node: TreeNode,
  result: Array<VNode<Record<string, unknown>>> = []
): Array<VNode<Record<string, unknown>>> {
  if (!node) return result
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return result
  result.push(node)
  const children = node.props?.children
  if (Array.isArray(children)) {
    for (const child of children) collectNodes(child as TreeNode, result)
  } else {
    collectNodes(children as TreeNode, result)
  }
  return result
}

function findNodeById(node: TreeNode, id: string): VNode<Record<string, unknown>> | undefined {
  return collectNodes(node).find(entry => entry.props?.id === id)
}

function collectText(node: TreeNode): string {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'boolean') return ''
  const children = node.props?.children
  if (Array.isArray(children)) return children.map(child => collectText(child as TreeNode)).join('')
  return collectText(children as TreeNode)
}

describe('settings UI components', () => {
  beforeEach(() => {
    optimizeLayout.value = false
    forceScrollDanmaku.value = false
    unlockForbidLive.value = false
    unlockSpaceBlock.value = false
    danmakuDirectMode.value = false
    danmakuDirectConfirm.value = true
    danmakuDirectAlwaysShow.value = false
  })

  test('layout section only renders for matching queries', () => {
    const visible = LayoutSection({ query: '布局' })
    const hidden = LayoutSection({ query: '粉丝牌' })

    expect(visible).not.toBeNull()
    expect(findNodeById(visible, 'optimizeLayout')).toBeDefined()
    expect(collectText(visible)).toContain('直播间布局')

    expect(hidden).toBeNull()
  })

  test('layout section exposes the unlockSpaceBlock checkbox and the 空间 search keyword', () => {
    const bySpaceQuery = LayoutSection({ query: '空间' })
    const byUnlockQuery = LayoutSection({ query: '解锁' })

    expect(bySpaceQuery).not.toBeNull()
    expect(byUnlockQuery).not.toBeNull()

    const spaceCheckbox = findNodeById(bySpaceQuery, 'unlockSpaceBlock')
    expect(spaceCheckbox).toBeDefined()
    expect(spaceCheckbox?.props.checked).toBe(false)
    expect(collectText(bySpaceQuery)).toContain('空间拉黑解锁')
  })

  test('toggling the unlockSpaceBlock input flips the underlying signal', () => {
    const initial = LayoutSection({ query: '' })
    const checkbox = findNodeById(initial, 'unlockSpaceBlock')
    expect(checkbox).toBeDefined()
    expect(unlockSpaceBlock.value).toBe(false)

    checkbox?.props.onInput?.({ currentTarget: { checked: true } })
    expect(unlockSpaceBlock.value).toBe(true)

    checkbox?.props.onInput?.({ currentTarget: { checked: false } })
    expect(unlockSpaceBlock.value).toBe(false)
  })

  test('the other layout toggles also write back through their onInput handlers', () => {
    const tree = LayoutSection({ query: '' })

    findNodeById(tree, 'optimizeLayout')?.props.onInput?.({ currentTarget: { checked: true } })
    findNodeById(tree, 'forceScrollDanmaku')?.props.onInput?.({ currentTarget: { checked: true } })
    findNodeById(tree, 'unlockForbidLive')?.props.onInput?.({ currentTarget: { checked: true } })

    expect(optimizeLayout.value).toBe(true)
    expect(forceScrollDanmaku.value).toBe(true)
    expect(unlockForbidLive.value).toBe(true)
  })

  test('danmaku direct child toggles follow the parent mode state', () => {
    const initial = DanmakuDirectSection({ query: '' })
    const modeNode = findNodeById(initial, 'danmakuDirectMode')
    const confirmNode = findNodeById(initial, 'danmakuDirectConfirm')
    const alwaysShowNode = findNodeById(initial, 'danmakuDirectAlwaysShow')

    expect(modeNode?.props.checked).toBe(false)
    expect(confirmNode?.props.disabled).toBe(true)
    expect(alwaysShowNode?.props.disabled).toBe(true)

    modeNode?.props.onInput?.({ currentTarget: { checked: true } })

    const enabled = DanmakuDirectSection({ query: '' })
    expect(danmakuDirectMode.value).toBe(true)
    expect(findNodeById(enabled, 'danmakuDirectConfirm')?.props.disabled).toBe(false)
    expect(findNodeById(enabled, 'danmakuDirectAlwaysShow')?.props.disabled).toBe(false)
  })

  test('error boundary renders a recovery panel after a crash', () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error('boom'))
    const boundary = new ErrorBoundary({ children: 'ok' })
    const fallback = boundary.render({ children: 'ok' }, state)

    expect(state.error).toBeInstanceOf(Error)
    expect(collectText(fallback)).toContain('Chatterbox 面板遇到错误')
    expect(collectText(fallback)).toContain('刷新页面')
  })
})
