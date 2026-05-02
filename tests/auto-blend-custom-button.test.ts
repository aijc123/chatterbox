import { beforeEach, describe, expect, test } from 'bun:test'
import type { VNode } from 'preact'

const { AutoBlendControls } = await import('../src/components/auto-blend-controls')
const { autoBlendAdvancedOpen, autoBlendCooldownSec, autoBlendPreset, autoBlendThreshold, autoBlendWindowSec } =
  await import('../src/lib/store')

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

function findPresetButton(tree: TreeNode, label: string): VNode<Record<string, unknown>> | undefined {
  return collectNodes(tree).find(node => node.type === 'button' && collectText(node).trim() === label)
}

describe('auto-blend custom preset button', () => {
  beforeEach(() => {
    autoBlendPreset.value = 'normal'
    autoBlendAdvancedOpen.value = false
    autoBlendWindowSec.value = 20
    autoBlendThreshold.value = 4
    autoBlendCooldownSec.value = 35
  })

  test('renders all four preset buttons in the segment', () => {
    const tree = AutoBlendControls()
    for (const label of ['稳一点', '正常', '热闹', '自定义']) {
      expect(findPresetButton(tree, label)).toBeDefined()
    }
  })

  test('custom button is aria-pressed only when preset === custom', () => {
    autoBlendPreset.value = 'normal'
    let custom = findPresetButton(AutoBlendControls(), '自定义')
    expect(custom?.props['aria-pressed']).toBe(false)

    autoBlendPreset.value = 'custom'
    custom = findPresetButton(AutoBlendControls(), '自定义')
    expect(custom?.props['aria-pressed']).toBe(true)
  })

  test('clicking 自定义 marks preset as custom and opens advanced settings', () => {
    autoBlendPreset.value = 'normal'
    autoBlendAdvancedOpen.value = false

    const custom = findPresetButton(AutoBlendControls(), '自定义')
    expect(custom).toBeDefined()
    custom?.props.onClick?.()

    expect(autoBlendPreset.value).toBe('custom')
    expect(autoBlendAdvancedOpen.value).toBe(true)
  })

  test('clicking 自定义 preserves current numeric values', () => {
    autoBlendPreset.value = 'normal'
    autoBlendWindowSec.value = 17
    autoBlendThreshold.value = 6
    autoBlendCooldownSec.value = 42

    const custom = findPresetButton(AutoBlendControls(), '自定义')
    custom?.props.onClick?.()

    expect(autoBlendWindowSec.value).toBe(17)
    expect(autoBlendThreshold.value).toBe(6)
    expect(autoBlendCooldownSec.value).toBe(42)
  })

  test('clicking a named preset still applies its values and clears custom', () => {
    autoBlendPreset.value = 'custom'
    autoBlendWindowSec.value = 99

    const safe = findPresetButton(AutoBlendControls(), '稳一点')
    safe?.props.onClick?.()

    expect(autoBlendPreset.value).toBe('safe')
    expect(autoBlendWindowSec.value).toBe(25)
  })
})
