import { effect, signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'
import { appendLog } from './log'
import { persistSendState, sendMsg } from './store-send'

export * from './store-auto-blend'
export * from './store-chat'
export * from './store-guard-room'
export * from './store-meme'
export * from './store-replacement'
export * from './store-send'
export * from './store-stt'
export * from './store-ui'

export const cachedRoomId = signal<number | null>(null)
export const cachedStreamerUid = signal<number | null>(null)

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
