import { signal } from '@preact/signals'

import { gmSignal, numericGmSignal } from './gm-signal'

export const msgSendInterval = numericGmSignal('msgSendInterval', 1, { min: 0.1, max: 600 })
export const maxLength = numericGmSignal('maxLength', 38, { min: 1, max: 100, integer: true })
export const randomColor = gmSignal('randomColor', false)
/**
 * 独轮车循环发送时，对 `msgSendInterval` 加 0.7×–1.5× jitter。
 *
 * 默认 **true**——这是纯安全默认。完全等间隔（用户设 3 秒 → 每条隔精确 3 秒）
 * 是 B 站风控最容易识别的机器人指纹。开启抖动后实际间隔分布在用户设定值附近
 * 的一个窗口里，看起来像人在按节奏发，**显著降低被风控的概率**。
 *
 * 关掉这个开关意味着用户主动选择了"我要精准节奏，请不要替我抖动"——通常只在
 * 测试 / 需要精确同步外部计时的场景。绝大多数用户不需要关。
 *
 * 老用户的 GM 持久值会覆盖这个默认（false 还是 false），不影响他们当前体验。
 */
export const randomInterval = gmSignal('randomInterval', true)
export const randomChar = gmSignal('randomChar', false)
export const aiEvasion = gmSignal('aiEvasion', false)
export const msgTemplates = gmSignal<string[]>('MsgTemplates', [])
export const activeTemplateIndex = numericGmSignal('activeTemplateIndex', 0, { min: 0, max: 999, integer: true })
export const persistSendState = gmSignal<Record<string, boolean>>('persistSendState', {})

export const sendMsg = signal(false)
export const availableDanmakuColors = signal<string[] | null>(null)

// Fasong tab shared text
export const fasongText = signal('')
