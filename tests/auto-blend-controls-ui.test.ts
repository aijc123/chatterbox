// Integration tests for the AutoBlendControls UI tree.
// Verifies new labels, mutual-exclusion disabling, and the drift-aware
// hint/reset-button. Walks the VNode tree without invoking child components,
// so hooks (useTick) inside CooldownRow/CandidateProgressRow stay inert.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { VNode } from 'preact'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const { AutoBlendControls } = await import('../src/components/auto-blend-controls')
const {
  autoBlendAdvancedOpen,
  autoBlendCooldownAuto,
  autoBlendCooldownSec,
  autoBlendMinDistinctUsers,
  autoBlendPanelOpen,
  autoBlendPreset,
  autoBlendRequireDistinctUsers,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendThreshold,
} = await import('../src/lib/store')
const { applyAutoBlendPreset } = await import('../src/lib/auto-blend-presets')

type TreeNode = VNode<Record<string, unknown>> | string | number | boolean | null | undefined | TreeNode[]

function collectNodes(
  node: TreeNode,
  result: Array<VNode<Record<string, unknown>>> = []
): Array<VNode<Record<string, unknown>>> {
  if (node == null || node === false || node === true) return result
  if (typeof node === 'string' || typeof node === 'number') return result
  if (Array.isArray(node)) {
    for (const child of node) collectNodes(child, result)
    return result
  }
  result.push(node)
  collectNodes(node.props?.children as TreeNode, result)
  return result
}

function collectText(node: TreeNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join('')
  return collectText(node.props?.children as TreeNode)
}

function fullText(): string {
  return collectText(AutoBlendControls() as TreeNode)
}

function findInputById(id: string): VNode<Record<string, unknown>> | undefined {
  return collectNodes(AutoBlendControls() as TreeNode).find(
    n => (n.type === 'input' && n.props?.id === id) || n.props?.htmlFor === id
  )
}

function findFirstInputAfterText(searchText: string): VNode<Record<string, unknown>> | undefined {
  const nodes = collectNodes(AutoBlendControls() as TreeNode)
  let seenLabel = false
  for (const n of nodes) {
    if (!seenLabel && typeof n.props?.children === 'string' && (n.props.children as string).includes(searchText)) {
      seenLabel = true
      continue
    }
    if (seenLabel && n.type === 'input' && (n.props?.type === 'number' || !n.props?.type)) {
      return n
    }
  }
  return undefined
}

describe('AutoBlendControls labels (renaming pass)', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
    autoBlendAdvancedOpen.value = true
    autoBlendSendAllTrending.value = false
  })

  afterEach(() => {
    autoBlendPanelOpen.value = false
    autoBlendAdvancedOpen.value = false
    autoBlendSendAllTrending.value = false
  })

  test('uses 触发条件 (not 多少算跟) for the windowSec/threshold row', () => {
    const text = fullText()
    expect(text).toContain('触发条件')
    expect(text).not.toContain('多少算跟')
    expect(text).toContain('秒内刷出')
    expect(text).toContain('条相同弹幕')
  })

  test('且至少 N 人都在刷 is rendered as a sub-line, not a separate checkbox row', () => {
    const text = fullText()
    expect(text).toContain('且至少')
    expect(text).toContain('人都在刷')
    expect(text).not.toContain('多人都在刷才跟')
  })

  test('renames 限频保护 → 失败熔断', () => {
    const text = fullText()
    expect(text).toContain('失败熔断')
    expect(text).not.toContain('限频保护')
  })

  test('renames 突发等待 → 凑齐刷屏的窗口', () => {
    const text = fullText()
    expect(text).toContain('凑齐刷屏的窗口')
    expect(text).not.toContain('突发等待')
  })

  test('renames 一波刷屏全跟 → 多句一起跟', () => {
    const text = fullText()
    expect(text).toContain('多句一起跟')
    expect(text).not.toContain('一波刷屏全跟')
  })

  test('preserves named-preset hint text from AUTO_BLEND_PRESETS', () => {
    autoBlendPreset.value = 'safe'
    expect(fullText()).toContain('少跟，适合挂机')
  })
})

describe('AutoBlendControls drift-aware hint and reset button', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
  })

  afterEach(() => {
    autoBlendPanelOpen.value = false
  })

  test('shows preset hint when not custom, no reset button', () => {
    autoBlendPreset.value = 'normal'
    const text = fullText()
    expect(text).toContain('当前：推荐，比较克制') // hint of 'normal'
    expect(text).not.toContain('回到「正常」')
  })

  test('shows drift readout + reset button when custom with baseline', () => {
    applyAutoBlendPreset('normal')
    autoBlendThreshold.value = 2 // bump aggressiveness
    autoBlendPreset.value = 'custom'

    const text = fullText()
    expect(text).toContain('自定义（基于「正常」档')
    expect(text).toContain('% 激进')
    expect(text).toContain('回到「正常」')
  })

  test('reset button calls applyAutoBlendPreset with the baseline', () => {
    applyAutoBlendPreset('hot')
    autoBlendThreshold.value = 99
    autoBlendPreset.value = 'custom'

    const tree = AutoBlendControls() as TreeNode
    const buttons = collectNodes(tree).filter(n => n.type === 'button')
    const reset = buttons.find(b => collectText(b).includes('回到「热闹」'))
    expect(reset).toBeDefined()
    reset?.props.onClick?.()

    expect(autoBlendPreset.value).toBe('hot')
    expect(autoBlendThreshold.value).toBe(3) // hot's preset value, not the 99 we wrote
  })
})

// NumberInput is a function component; its `disabled`/`value`/`min`/`max`
// live on the outer VNode props rather than on the inner <input> element.
function findNumberInputVNode(
  tree: TreeNode,
  match: (props: Record<string, unknown>) => boolean
): VNode<Record<string, unknown>> | undefined {
  return collectNodes(tree).find(n => typeof n.type === 'function' && n.props && match(n.props))
}

describe('AutoBlendControls mutual exclusion: sendCount disabled when sendAllTrending', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
    autoBlendAdvancedOpen.value = true
  })

  afterEach(() => {
    autoBlendSendAllTrending.value = false
    autoBlendPanelOpen.value = false
    autoBlendAdvancedOpen.value = false
  })

  test('sendCount NumberInput is enabled when sendAllTrending is off', () => {
    autoBlendSendAllTrending.value = false
    autoBlendSendCount.value = 1
    const sendCountInput = findNumberInputVNode(
      AutoBlendControls() as TreeNode,
      p => p.value === 1 && p.max === 20 && p.min === 1
    )
    expect(sendCountInput?.props?.disabled).toBeFalsy()
  })

  test('sendCount NumberInput is disabled when sendAllTrending is on', () => {
    autoBlendSendAllTrending.value = true
    autoBlendSendCount.value = 1
    const sendCountInput = findNumberInputVNode(
      AutoBlendControls() as TreeNode,
      p => p.value === 1 && p.max === 20 && p.min === 1
    )
    expect(sendCountInput?.props?.disabled).toBe(true)
  })

  test('hint text changes to reflect override when sendAllTrending is on', () => {
    autoBlendSendAllTrending.value = true
    expect(fullText()).toContain('已被「多句一起跟」覆盖')
  })
})

describe('AutoBlendControls cooldown row: manual disabled when auto-cooldown on', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
    autoBlendAdvancedOpen.value = true
  })

  afterEach(() => {
    autoBlendCooldownAuto.value = false
    autoBlendPanelOpen.value = false
    autoBlendAdvancedOpen.value = false
  })

  test('manual cooldown input is disabled when auto-cooldown is on', () => {
    autoBlendCooldownAuto.value = true
    autoBlendCooldownSec.value = 35
    const manual = findNumberInputVNode(AutoBlendControls() as TreeNode, p => p.value === 35 && p.min === 4)
    expect(manual?.props?.disabled).toBe(true)
  })

  test('manual cooldown input is enabled when auto-cooldown is off', () => {
    autoBlendCooldownAuto.value = false
    autoBlendCooldownSec.value = 35
    const manual = findNumberInputVNode(AutoBlendControls() as TreeNode, p => p.value === 35 && p.min === 4)
    expect(manual?.props?.disabled).toBeFalsy()
  })
})

describe('AutoBlendControls merged trigger row: distinct-users sub-input', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
    autoBlendAdvancedOpen.value = true
  })

  afterEach(() => {
    autoBlendRequireDistinctUsers.value = true
    autoBlendPanelOpen.value = false
    autoBlendAdvancedOpen.value = false
  })

  test('checkbox + minDistinctUsers input both rendered inline', () => {
    expect(findInputById('autoBlendRequireDistinctUsers')).toBeDefined()
    autoBlendMinDistinctUsers.value = 3
    autoBlendRequireDistinctUsers.value = true
    const usersInput = findNumberInputVNode(AutoBlendControls() as TreeNode, p => p.value === 3 && p.min === 2)
    expect(usersInput).toBeDefined()
    expect(usersInput?.props?.disabled).toBeFalsy()
  })

  test('minDistinctUsers input is disabled when checkbox is unchecked', () => {
    autoBlendRequireDistinctUsers.value = false
    autoBlendMinDistinctUsers.value = 3
    const usersInput = findNumberInputVNode(AutoBlendControls() as TreeNode, p => p.value === 3 && p.min === 2)
    expect(usersInput?.props?.disabled).toBe(true)
  })
})

describe('AutoBlendControls verifyUiInvariants', () => {
  beforeEach(() => {
    resetGmStore()
    applyAutoBlendPreset('normal')
    autoBlendPanelOpen.value = true
    autoBlendAdvancedOpen.value = true
  })

  test('still renders all four preset buttons (UI verifier checks 稳一点/正常/热闹)', () => {
    const tree = AutoBlendControls() as TreeNode
    const buttons = collectNodes(tree).filter(n => n.type === 'button')
    const labels = buttons.map(b => collectText(b).trim())
    for (const expected of ['稳一点', '正常', '热闹', '自定义']) {
      expect(labels).toContain(expected)
    }
  })

  test('start button still says 开始跟车 when not enabled', () => {
    expect(fullText()).toContain('开始跟车')
  })

  test('panel still has 自动跟车 summary', () => {
    expect(fullText()).toContain('自动跟车')
  })

  // Reference unused helpers so lint doesn't flag them; they're handy for
  // future test extensions and document the search idiom.
  test('helpers compile', () => {
    expect(typeof findFirstInputAfterText).toBe('function')
  })
})
