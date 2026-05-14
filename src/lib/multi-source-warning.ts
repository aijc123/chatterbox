/**
 * 多自动发送源并发警告。
 *
 * 三个发送循环（独轮车 `sendMsg` / 自动跟车 `autoBlendEnabled` / 智驾
 * `hzmDriveEnabled`）虽然都串联到同一个 send-queue 不会发生技术冲突，
 * 但**叠加到同一个账号身上会增加每分钟弹幕量**，更容易触发风控/封号。
 *
 * 用户的真实"WTF moment"——先开了独轮车试了试，关闭忘记了，又开了自动
 * 跟车，再开了智驾，三股流量同时往外发。没有任何 UI 提示能让他意识到
 * 这点。
 *
 * 设计选择：toast warning 而不是 showConfirm。
 * - 用户已主动开第二个/第三个；他知道自己在做什么。
 * - 阻塞 confirm 会破坏"开关一拨就开"的肌肉记忆。
 * - 但**未知的并发态需要可见**——toast 5s 自动消失，足够提醒，不打断。
 *
 * 已存在的更激进保护（保留）：
 * - hzm-drive-panel.tsx 在开智驾时若 sendMsg=true 会 showConfirm 阻塞
 *   （Footgun #1）——这是针对"已知的具体配对最危险"的特别处理。
 * - auto-blend-controls.tsx 在 cooldown 被绕过时 showConfirm 阻塞。
 *
 * Toast 是兜底的、覆盖所有组合的"软提醒"。
 */

import { notifyUser } from './log'
import { autoBlendEnabled } from './store-auto-blend'
import { hzmDriveEnabled } from './store-hzm'
import { sendMsg } from './store-send'

export type SendSource = 'loop' | 'blend' | 'hzm'

const SOURCE_LABEL: Record<SendSource, string> = {
  loop: '独轮车',
  blend: '自动跟车',
  hzm: '智驾',
}

/** 同一种组合 30 秒内只弹一次，避免开-关-开循环刷屏。 */
const TOAST_DEDUP_MS = 30_000
let lastToastAt = 0
let lastToastKey = ''

function getOtherActive(starting: SendSource): SendSource[] {
  const others: SendSource[] = []
  if (starting !== 'loop' && sendMsg.peek()) others.push('loop')
  if (starting !== 'blend' && autoBlendEnabled.peek()) others.push('blend')
  if (starting !== 'hzm' && hzmDriveEnabled.peek()) others.push('hzm')
  return others
}

/**
 * 在 starting 这一路 send 真正开始（即 signal 被置为 true）之后调用。
 * 若已有别的源在跑，弹一次 warning toast。
 */
export function warnIfOtherSourcesActive(starting: SendSource): void {
  const others = getOtherActive(starting)
  if (others.length === 0) return

  // dedup key：以全部正在跑（含本次刚开的）的源组合为键
  const allActive = [...others, starting].sort().join(',')
  const now = Date.now()
  if (allActive === lastToastKey && now - lastToastAt < TOAST_DEDUP_MS) return
  lastToastKey = allActive
  lastToastAt = now

  const otherLabels = others.map(s => SOURCE_LABEL[s]).join('、')
  const startingLabel = SOURCE_LABEL[starting]
  const totalCount = others.length + 1
  notifyUser(
    'warning',
    `已同时运行 ${totalCount} 个自动发送（${otherLabels}、${startingLabel}）`,
    '叠加发送会增加每分钟弹幕量，更容易被风控/封号。如非必要，建议只开一个，或先调低各自频率。'
  )
}

/** 测试钩子：清空 dedup 状态。 */
export function _resetMultiSourceWarningForTests(): void {
  lastToastAt = 0
  lastToastKey = ''
}
