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
  /**
   * 活跃度闸门是否开着。tick 头部根据最近窗口的弹幕数 + distinct uid 算出。
   * 关闭时（公屏冷清）显示"观察中（公屏冷清）"，让用户明白为什么没动。
   * 老调用方不传则默认 true，行为与升级前一致。
   */
  gateOpen?: boolean
}

/** 最近一次动作落地多久内显示「运行中」而非「观察中」。 */
const RECENT_ACTION_WINDOW_MS = 5_000

const MODE_LABEL: Record<HzmDriveMode, string> = {
  heuristic: '启发式',
  llm: 'LLM',
}

export function formatHzmDriveStatus({
  enabled,
  mode,
  dryRun,
  lastActionAt,
  now,
  gateOpen = true,
}: HzmDriveStatusInput): string {
  if (!enabled) return '已关闭'
  if (dryRun) return '试运行（不发送）'
  if (lastActionAt !== null && now - lastActionAt <= RECENT_ACTION_WINDOW_MS) {
    return `运行中 · ${MODE_LABEL[mode]}`
  }
  // 闸门状态优先于裸"观察中"——刚发完的"运行中"窗口（5s）覆盖闸门状态，因为
  // 那是已经发生过的真实动作，比一个静态的闸门信号更有信息量。
  if (!gateOpen) return '观察中（公屏冷清）'
  return '观察中'
}
