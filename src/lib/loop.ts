import type { DanmakuConfigResponse } from '../types'

import { ensureRoomId, fetchEmoticons, getCsrfToken, setDanmakuMode, setRandomDanmakuColor } from './api'
import { BASE_URL } from './const'
import { formatLockedEmoticonReject, isEmoticonUnique, isLockedEmoticon } from './emoticon'
import { classifyRiskEvent, syncGuardRoomRiskEvent } from './guard-room-sync'
import { appendLog } from './log'
import { applyReplacements, buildReplacementMap } from './replacement'
import { cancelPendingAuto, enqueueDanmaku, SendPriority } from './send-queue'
import { verifyBroadcast } from './send-verification'
import {
  activeTemplateIndex,
  availableDanmakuColors,
  forceScrollDanmaku,
  maxLength,
  msgSendInterval,
  msgTemplates,
  randomChar,
  randomColor,
  randomInterval,
  sendMsg,
} from './store'
import { processMessages } from './utils'
import { cachedWbiKeys, encodeWbi, waitForWbiKeys } from './wbi'

let currentAbort: AbortController | null = null

function getSpmPrefix(): string {
  const metaTag = document.querySelector('meta[name="spm_prefix"]')
  return metaTag?.getAttribute('content') ?? '444.8'
}

export function cancelLoop(): void {
  currentAbort?.abort()
  currentAbort = null
  // Drain any AUTO items already sitting in the global queue so they don't
  // go out after the user clicks 停车.
  cancelPendingAuto()
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    if (signal.aborted) {
      resolve(false)
      return
    }
    const timer = setTimeout(() => resolve(true), ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve(false)
      },
      { once: true }
    )
  })
}

/**
 * Main loop: handles auto-send (独轮车), room init, danmaku config, and message sending.
 */
export async function loop(): Promise<void> {
  let count = 0
  // One-time init (WBI keys, color palette, emoticons, scroll mode) runs only
  // on the first active round.  roomId itself is refreshed every round so SPA
  // navigation to a different live room is picked up without restarting the loop.
  let initialized = false

  while (true) {
    if (sendMsg.value) {
      // Re-resolve the room ID each round.  ensureRoomId() compares the cached
      // slug against the current URL and invalidates when the user navigates to
      // another room, so this is the only place that needs to change.
      let roomId: number
      try {
        roomId = await ensureRoomId()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        appendLog(`❌ 获取房间ID失败: ${message}`)
        await new Promise(r => setTimeout(r, 5000))
        continue
      }

      // Read the token fresh each round so login/logout changes are picked up
      // without needing a page reload.
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        appendLog('❌ 未找到登录信息，已自动停止运行，请先登录 Bilibili')
        void syncGuardRoomRiskEvent({
          kind: 'login_missing',
          source: 'auto-send',
          level: 'observe',
          roomId,
          reason: '自动发送没有检测到 B 站登录态。',
          advice: '先登录 B 站，再重新开车。',
        })
        sendMsg.value = false
        continue
      }

      if (!initialized) {
        initialized = true
        buildReplacementMap()

        await waitForWbiKeys()
        if (cachedWbiKeys) {
          try {
            const configQuery = encodeWbi(
              {
                room_id: String(roomId),
                web_location: getSpmPrefix(),
              },
              cachedWbiKeys
            )
            const configUrl = `${BASE_URL.BILIBILI_GET_DM_CONFIG}?${configQuery}`
            const configResp: DanmakuConfigResponse = await fetch(configUrl, {
              method: 'GET',
              credentials: 'include',
            }).then(r => r.json())

            if (configResp?.data?.group) {
              const colors: string[] = []
              for (const group of configResp.data.group) {
                for (const color of group.color) {
                  if (color.status === 1) {
                    colors.push(`0x${color.color_hex}`)
                  }
                }
              }
              if (colors.length > 0) {
                availableDanmakuColors.value = colors
              }
            }
          } catch {
            // non-critical
          }
        }

        try {
          await fetchEmoticons(roomId)
        } catch {
          // non-critical
        }

        if (forceScrollDanmaku.value) {
          const initCsrfToken = getCsrfToken()
          if (initCsrfToken) {
            await setDanmakuMode(roomId, initCsrfToken, '1')
          }
        }
      }

      currentAbort = new AbortController()
      const { signal } = currentAbort

      const currentTemplate = msgTemplates.value[activeTemplateIndex.value] ?? ''
      if (!currentTemplate.trim()) {
        appendLog('⚠️ 当前模板为空，已自动停止运行')
        sendMsg.value = false
        currentAbort = null
        continue
      }

      const interval = msgSendInterval.value
      const enableRandomColor = randomColor.value
      const enableRandomInterval = randomInterval.value
      const enableRandomChar = randomChar.value

      const Msg: string[] = []
      for (const line of currentTemplate.split('\n').filter(l => l?.trim())) {
        if (isEmoticonUnique(line.trim())) {
          Msg.push(line.trim())
        } else {
          Msg.push(...processMessages(line, maxLength.value, enableRandomChar))
        }
      }

      const total = Msg.length
      let completed = true
      for (let i = 0; i < total; i++) {
        if (signal.aborted) {
          completed = false
          break
        }
        const message = Msg[i]
        if (sendMsg.value) {
          if (isLockedEmoticon(message)) {
            const skipLabel = total > 1 ? `自动表情 [${i + 1}/${total}]` : '自动表情'
            appendLog(formatLockedEmoticonReject(message, skipLabel))
            const resolvedRandomInterval = enableRandomInterval ? Math.floor(Math.random() * 500) : 0
            const ok = await abortableSleep(interval * 1000 - resolvedRandomInterval, signal)
            if (!ok) {
              completed = false
              break
            }
            continue
          }

          const isEmote = isEmoticonUnique(message)
          const originalMessage = message
          const processedMessage = isEmote ? message : applyReplacements(message)
          const wasReplaced = !isEmote && originalMessage !== processedMessage

          if (enableRandomColor) {
            await setRandomDanmakuColor(roomId, csrfToken)
          }

          // Re-check abort after the async color call: the user may have
          // clicked stop while setRandomDanmakuColor was awaiting.
          if (signal.aborted) {
            completed = false
            break
          }

          const result = await enqueueDanmaku(processedMessage, roomId, csrfToken, SendPriority.AUTO)
          const displayMsg = wasReplaced ? `${originalMessage} → ${processedMessage}` : processedMessage
          const baseLabel = result.isEmoticon ? '自动表情' : '自动'
          const label = total > 1 ? `${baseLabel} [${i + 1}/${total}]` : baseLabel
          appendLog(result, label, displayMsg)
          if (!result.success && !result.cancelled) {
            const risk = classifyRiskEvent(result.error, result.errorData)
            void syncGuardRoomRiskEvent({
              ...risk,
              source: 'auto-send',
              roomId,
              errorCode: result.errorCode,
              reason: result.error,
            })
          }
          if (result.success && !result.cancelled) {
            // Background verification: log a ⚠️ line ~4s later if no real
            // broadcast echo arrives. Toast is rate-limited per template so
            // continuous shadow-bans don't spam notifications.
            void verifyBroadcast({
              text: processedMessage,
              label,
              display: displayMsg,
              sinceTs: result.startedAt ?? Date.now(),
              isEmoticon: result.isEmoticon,
              toastDedupeKey: `loop:${originalMessage}`,
            })
          }

          const resolvedRandomInterval = enableRandomInterval ? Math.floor(Math.random() * 500) : 0
          const ok = await abortableSleep(interval * 1000 - resolvedRandomInterval, signal)
          if (!ok) {
            completed = false
            break
          }
        }
      }

      currentAbort = null

      if (completed) {
        count += 1
        appendLog(`🔵第 ${count} 轮发送完成`)
      }
    } else {
      count = 0
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}
