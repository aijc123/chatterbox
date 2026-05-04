import { computed, effect, signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'
import { type CustomChatWsStatus, subscribeCustomChatWsStatus } from './custom-chat-events'
import { appendLog } from './log'
import { memeContributorCandidatesByRoom, memeContributorSeenTextsByRoom } from './store-meme'
import { persistSendState, sendMsg } from './store-send'

export * from './store-auto-blend'
export * from './store-chat'
export * from './store-guard-room'
export * from './store-hzm'
export * from './store-meme'
export * from './store-replacement'
export * from './store-send'
export * from './store-shadow-learn'
export * from './store-stt'
export * from './store-ui'

export const cachedRoomId = signal<number | null>(null)
export const cachedStreamerUid = signal<number | null>(null)

/**
 * Reactive view of the live WebSocket connection state, mirrored from
 * `subscribeCustomChatWsStatus`. Lets UI surfaces (tab bar, settings) show
 * when the script has degraded to DOM-scrape mode without each component
 * needing its own subscription.
 *
 * Values: `off` (WS not started — features that need it are disabled),
 * `connecting`, `live` (healthy), `error` / `closed` (degraded — DOM
 * fallback in effect).
 */
export const liveWsStatus = signal<CustomChatWsStatus>('off')
subscribeCustomChatWsStatus(status => {
  liveWsStatus.value = status
})

// 当前直播间的候选梗（按房间隔离的派生视图）
export const memeContributorCandidates = computed<string[]>(() => {
  const id = cachedRoomId.value
  if (id === null) return []
  return memeContributorCandidatesByRoom.value[String(id)] ?? []
})

// 当前直播间的已见梗（被忽略或已贡献）
export const memeContributorSeenTexts = computed<string[]>(() => {
  const id = cachedRoomId.value
  if (id === null) return []
  return memeContributorSeenTextsByRoom.value[String(id)] ?? []
})

let sendStateRestored = false

effect(() => {
  const persist = persistSendState.value
  const roomId = cachedRoomId.value
  const sending = sendMsg.value
  if (roomId === null) return
  const key = String(roomId)
  if (persist[key]) {
    if (!sendStateRestored) {
      sendStateRestored = true
      const stored = GM_getValue<Record<string, boolean>>('persistedSendMsg', {})
      if (stored[key]) {
        sendMsg.value = true
        appendLog('🔄 已恢复独轮车运行状态')
      }
      return
    }
    const stored = GM_getValue<Record<string, boolean>>('persistedSendMsg', {})
    GM_setValue('persistedSendMsg', { ...stored, [key]: sending })
  } else {
    const stored = GM_getValue<Record<string, boolean>>('persistedSendMsg', {})
    if (key in stored) {
      const { [key]: _, ...rest } = stored
      GM_setValue('persistedSendMsg', rest)
    }
  }
})
