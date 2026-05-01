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
export const hasSeenWelcome = gmSignal('hasSeenWelcome', false)
