// 智能辅助驾驶状态文本格式化（与 auto-blend-status.ts 风格保持一致）。
// 纯函数：根据当前 enabled / dryRun / mode / lastActionAt 推导状态短语。
// 在 hzm-auto-drive.ts 里被 updateHzmStatusText() 调用。

import type { HzmDriveMode } from './store-hzm'

export interface HzmDriveStatusInput {
  enabled: boolean
  mode: HzmDriveMode
  dryRun: boolean
  /** 最近一次成功 send（含 dryRun 候选）的时间戳。null = 还没动作过。 */
  lastActionAt: number | null
  now: number
}

/** 最近一次动作落地多久内显示「运行中」而非「观察中」。 */
const RECENT_ACTION_WINDOW_MS = 5_000

const MODE_LABEL: Record<HzmDriveMode, string> = {
  heuristic: '启发式',
  llm: 'LLM',
}

export function formatHzmDriveStatus({ enabled, mode, dryRun, lastActionAt, now }: HzmDriveStatusInput): string {
  if (!enabled) return '已关闭'
  if (dryRun) return '试运行（不发送）'
  if (lastActionAt !== null && now - lastActionAt <= RECENT_ACTION_WINDOW_MS) {
    return `运行中 · ${MODE_LABEL[mode]}`
  }
  return '观察中'
}
