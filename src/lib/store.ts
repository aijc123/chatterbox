import { effect, signal } from '@preact/signals'

import type { BilibiliEmoticonPackage } from '../types'

import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'
import { appendLog } from './log'

// GM-persisted settings
export const msgSendInterval = gmSignal('msgSendInterval', 1)
export const maxLength = gmSignal('maxLength', 38)
export const randomColor = gmSignal('randomColor', false)
export const randomInterval = gmSignal('randomInterval', false)
export const randomChar = gmSignal('randomChar', false)
export const aiEvasion = gmSignal('aiEvasion', false)
export const forceScrollDanmaku = gmSignal('forceScrollDanmaku', false)
export const optimizeLayout = gmSignal('optimizeLayout', false)
export const danmakuDirectMode = gmSignal('danmakuDirectMode', true)
export const danmakuDirectConfirm = gmSignal('danmakuDirectConfirm', false)
export const danmakuDirectAlwaysShow = gmSignal('danmakuDirectAlwaysShow', false)
export const unlockForbidLive = gmSignal('unlockForbidLive', true)
export const activeTab = gmSignal('activeTab', 'fasong')
export const msgTemplates = gmSignal<string[]>('MsgTemplates', [])
export const activeTemplateIndex = gmSignal('activeTemplateIndex', 0)
export const logPanelOpen = gmSignal('logPanelOpen', false)
export const autoSendPanelOpen = gmSignal('autoSendPanelOpen', true)
export const autoBlendPanelOpen = gmSignal('autoBlendPanelOpen', true)
export const normalSendPanelOpen = gmSignal('normalSendPanelOpen', true)
export const memesPanelOpen = gmSignal('memesPanelOpen', true)
export const dialogOpen = gmSignal('dialogOpen', false)

// Auto-blend (自动融入): send when any message hits N repeats within W seconds,
// then freeze the detector for C seconds. A routine timer picks from active candidates
// by weighted random choice for sustained multi-topic trends.
// Optional: require N distinct users for a stricter social-consensus trigger.
export const autoBlendWindowSec = gmSignal('autoBlendWindowSec', 8) // rolling window W
export const autoBlendThreshold = gmSignal('autoBlendThreshold', 2) // burst threshold N
export const autoBlendCooldownSec = gmSignal('autoBlendCooldownSec', 12) // post-send freeze C
export const autoBlendRoutineIntervalSec = gmSignal('autoBlendRoutineIntervalSec', 30) // routine timer period
export const autoBlendIncludeReply = gmSignal('autoBlendIncludeReply', false)
export const autoBlendUseReplacements = gmSignal('autoBlendUseReplacements', true)
export const autoBlendRequireDistinctUsers = gmSignal('autoBlendRequireDistinctUsers', false)
export const autoBlendMinDistinctUsers = gmSignal('autoBlendMinDistinctUsers', 3)
export const autoBlendSendCount = gmSignal('autoBlendSendCount', 1)

// Meme Contributor (社区烂梗贡献者)
export const enableMemeContribution = gmSignal('enableMemeContribution', false)
export const memeContributorCandidates = gmSignal<string[]>('memeContributorCandidates', [])
export const memeContributorSeenTexts = gmSignal<string[]>('memeContributorSeenTexts', [])

// Soniox settings
export const sonioxApiKey = gmSignal('sonioxApiKey', '')
export const sonioxLanguageHints = gmSignal<string[]>('sonioxLanguageHints', ['zh'])
export const sonioxAutoSend = gmSignal('sonioxAutoSend', true)
export const sonioxMaxLength = gmSignal('sonioxMaxLength', 40)
export const sonioxWrapBrackets = gmSignal('sonioxWrapBrackets', false)
export const sonioxTranslationEnabled = gmSignal('sonioxTranslationEnabled', false)
export const sonioxTranslationTarget = gmSignal('sonioxTranslationTarget', 'en')

// Migrate legacy flat replacementRules → localGlobalRules (one-time, then delete old key)
;(() => {
  const old = GM_getValue<Array<{ from?: string; to?: string }>>('replacementRules', [])
  if (old.length > 0) {
    const existing = GM_getValue<Array<{ from?: string; to?: string }>>('localGlobalRules', [])
    if (existing.length === 0) {
      GM_setValue('localGlobalRules', old)
    }
    GM_deleteValue('replacementRules')
  }
})()

// Replacement rules
export const localGlobalRules = gmSignal<Array<{ from?: string; to?: string }>>('localGlobalRules', [])
export const localRoomRules = gmSignal<Record<string, Array<{ from?: string; to?: string }>>>('localRoomRules', {})
export const remoteKeywords = gmSignal<{
  global?: { keywords?: Record<string, string> }
  rooms?: Array<{ room: string; keywords?: Record<string, string> }>
} | null>('remoteKeywords', null)
export const remoteKeywordsLastSync = gmSignal<number | null>('remoteKeywordsLastSync', null)

export const persistSendState = gmSignal<Record<string, boolean>>('persistSendState', {})

// Runtime state (not GM-persisted)
export const sendMsg = signal(false)
export const sttRunning = signal(false)
export const cachedRoomId = signal<number | null>(null)
export const autoBlendEnabled = signal(false)

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


export const cachedStreamerUid = signal<number | null>(null)
export const availableDanmakuColors = signal<string[] | null>(null)
export const replacementMap = signal<Map<string, string> | null>(null)

export const cachedEmoticonPackages = signal<BilibiliEmoticonPackage[]>([])

export function isEmoticonUnique(msg: string): boolean {
  return cachedEmoticonPackages.value.some(pkg => pkg.emoticons.some(e => e.emoticon_unique === msg))
}

// Fasong tab shared text
export const fasongText = signal('')
