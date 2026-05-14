import { signal } from '@preact/signals'

import { gmSignal } from './gm-signal'

export const forceScrollDanmaku = gmSignal('forceScrollDanmaku', false)
export const optimizeLayout = gmSignal('optimizeLayout', false)
export const danmakuDirectMode = gmSignal('danmakuDirectMode', true)
export const danmakuDirectConfirm = gmSignal('danmakuDirectConfirm', false)
export const danmakuDirectAlwaysShow = gmSignal('danmakuDirectAlwaysShow', false)
export const activeTab = gmSignal('activeTab', 'fasong')
export const logPanelOpen = gmSignal('logPanelOpen', false)
export const logPanelFocusRequest = signal(0)
export const autoSendPanelOpen = gmSignal('autoSendPanelOpen', true)
export const autoBlendPanelOpen = gmSignal('autoBlendPanelOpen', true)
export const memesPanelOpen = gmSignal('memesPanelOpen', false)
export const dialogOpen = gmSignal('dialogOpen', false)
export const unlockForbidLive = gmSignal('unlockForbidLive', true)
export const unlockSpaceBlock = gmSignal('unlockSpaceBlock', true)
export const hasSeenWelcome = gmSignal('hasSeenWelcome', false)
export const hasConfirmedAutoBlendRealFire = gmSignal('hasConfirmedAutoBlendRealFire', false)
/**
 * 上次"自动跟车真发"确认弹窗的接受时间（ms epoch）。0 = 从未确认。
 *
 * `hasConfirmedAutoBlendRealFire` 是布尔型且永不过期，这意味着用户第一次
 * 点过"我已了解"之后，半年后回来再开车也不弹窗——但半年前的"我知道"
 * 对现在的状态不一定还成立（账号风控政策变了、用户换了直播节奏、想重新
 * 确认风险）。新增一个 TTL 字段：调用方判断"30 天内确认过 = 不再问"，
 * 超 30 天即视为未确认重新弹。
 */
export const lastAutoBlendRealFireConfirmAt = gmSignal('lastAutoBlendRealFireConfirmAt', 0)
export const lastSeenVersion = gmSignal('lastSeenVersion', '')
