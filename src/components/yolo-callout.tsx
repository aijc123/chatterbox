import type { LlmPromptFeature } from '../lib/prompts'

import { describeLlmGap } from '../lib/llm-polish'
import { activeTab } from '../lib/store'

/**
 * 把"YOLO 已开但 LLM 还没配齐"这句话集中渲染。
 *
 * 每个 send 路径（auto-blend / auto-send / normal-send）都需要紧接 YOLO 复选框
 * 渲染同样的状态文字，原本是各自一段 inline JSX。问题：
 *  1. 三处文字略有差异（"已就绪：触发后…" vs "已就绪：每条…" vs "已就绪：手动发送…"）
 *  2. 配置缺失时只有一段 plain text，没有跳转手段——P0-4 中提到这点：用户看到
 *     "请到「设置 → LLM」中…" 但要自己手动找设置 tab、找到 LLM 区域、展开。
 *
 * 这个组件解决 #2：把 describeLlmGap 的字符串里的「设置 → LLM」高亮成一个按钮，
 * 点了就 `activeTab.value = 'settings'`，把用户直接送进设置页（LLM 区域是默认
 * 展开的，所以一跳就能看到）。
 */
export function YoloCallout({
  feature,
  enabled,
  readyText,
}: {
  feature: LlmPromptFeature
  enabled: boolean
  /** YOLO 配置齐全时显示的"已就绪"提示文字。 */
  readyText: string
}) {
  if (!enabled) return null
  const gap = describeLlmGap(feature)
  if (!gap) {
    return (
      <div className='cb-note' style={{ paddingLeft: '1.4em' }}>
        {readyText}
      </div>
    )
  }
  return (
    <div className='cb-note' style={{ paddingLeft: '1.4em' }}>
      {gap}
      <button
        type='button'
        style={{
          marginLeft: '.5em',
          background: 'none',
          border: 'none',
          padding: 0,
          color: '#1677ff',
          cursor: 'pointer',
          fontSize: 'inherit',
          textDecoration: 'underline',
        }}
        onClick={() => {
          activeTab.value = 'settings'
        }}
      >
        前往设置 →
      </button>
    </div>
  )
}
