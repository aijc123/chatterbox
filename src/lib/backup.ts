import { GM_getValue, GM_setValue } from '$'
import { applyImportedSettings } from './gm-signal'

const BACKUP_VERSION = 1

// All GM-persisted keys that are safe to export. Migration flags are excluded.
const EXPORT_KEYS = [
  // Send
  'msgSendInterval',
  'maxLength',
  'randomColor',
  'randomInterval',
  'randomChar',
  'aiEvasion',
  'forceScrollDanmaku',
  'optimizeLayout',
  'danmakuDirectMode',
  'danmakuDirectConfirm',
  'danmakuDirectAlwaysShow',
  // Templates
  'MsgTemplates',
  'activeTemplateIndex',
  'persistSendState',
  // Auto-blend
  'autoBlendWindowSec',
  'autoBlendThreshold',
  'autoBlendCooldownSec',
  'autoBlendRoutineIntervalSec',
  'autoBlendBurstSettleMs',
  'autoBlendRateLimitWindowMin',
  'autoBlendRateLimitStopThreshold',
  'autoBlendPreset',
  'autoBlendAdvancedOpen',
  'autoBlendDryRun',
  'autoBlendAvoidRisky',
  'autoBlendBlockedWords',
  'autoBlendIncludeReply',
  'autoBlendUseReplacements',
  'autoBlendRequireDistinctUsers',
  'autoBlendMinDistinctUsers',
  'autoBlendSendCount',
  'autoBlendSendAllTrending',
  // Custom chat
  'customChatEnabled',
  'customChatHideNative',
  'customChatUseWs',
  'customChatTheme',
  'customChatShowDanmaku',
  'customChatShowGift',
  'customChatShowSuperchat',
  'customChatShowEnter',
  'customChatShowNotice',
  'customChatCss',
  'customChatPerfDebug',
  // Guard room
  'guardRoomEndpoint',
  'guardRoomSyncKey',
  'guardRoomWebsiteControlEnabled',
  // UI panel state
  'logPanelOpen',
  'autoSendPanelOpen',
  'autoBlendPanelOpen',
  'memesPanelOpen',
  // STT
  'sonioxApiKey',
  'sonioxLanguageHints',
  'sonioxAutoSend',
  'sonioxMaxLength',
  'sonioxWrapBrackets',
  'sonioxTranslationEnabled',
  'sonioxTranslationTarget',
  // Replacement rules
  'localGlobalRules',
  'localRoomRules',
  // Log
  'maxLogLines',
] as const

export function exportSettings(): string {
  const data: Record<string, unknown> = {
    __version: BACKUP_VERSION,
    __exportedAt: new Date().toISOString(),
  }
  for (const key of EXPORT_KEYS) {
    const val = GM_getValue(key, undefined)
    if (val !== undefined) data[key] = val
  }
  return JSON.stringify(data, null, 2)
}

export function importSettings(json: string): { ok: boolean; error?: string; count: number } {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(json) as Record<string, unknown>
  } catch {
    return { ok: false, error: '无效的 JSON 格式', count: 0 }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: '数据格式错误，需要 JSON 对象', count: 0 }
  }
  const allowed = new Set<string>(EXPORT_KEYS)
  const toApply: Record<string, unknown> = {}
  let count = 0
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('__')) continue
    if (!allowed.has(key)) continue
    GM_setValue(key, val)
    toApply[key] = val
    count++
  }
  applyImportedSettings(toApply)
  return { ok: true, count }
}
