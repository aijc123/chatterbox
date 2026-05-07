import { GM_getValue, GM_setValue } from '$'
import { applyImportedSettings, isValidImportedValue } from './gm-signal'

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
    const val = GM_getValue(key)
    if (val !== undefined) data[key] = val
  }
  return JSON.stringify(data, null, 2)
}

export interface ImportSettingsResult {
  ok: boolean
  error?: string
  count: number
  /**
   * Keys that appeared in the backup, were on the allowlist, but were
   * rejected by the per-key validator (typically because the stored type
   * doesn't match the live signal's type). Surfaced so the settings UI can
   * show the user *which* fields didn't survive a corrupt or downgraded
   * backup, instead of a flat "导入了 N 项" with no signal about what was lost.
   */
  skipped?: string[]
  /** Allowlisted keys that arrived but had an unrelated structural issue
   * (e.g. JSON.parse succeeded but the value was wrong shape). Same intent
   * as `skipped`, separated so future tooling can show different copy.
   */
  unknownKeys?: string[]
}

export function importSettings(json: string): ImportSettingsResult {
  let data: Record<string, unknown>
  try {
    data = JSON.parse(json) as Record<string, unknown>
  } catch (err) {
    // Surface the parser's own diagnostic (`Unexpected token … at position N`)
    // instead of a flat "无效的 JSON 格式". For a hand-edited backup this
    // narrows the user's search to the offending line.
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `无效的 JSON 格式：${detail}`, count: 0 }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: '数据格式错误，需要 JSON 对象', count: 0 }
  }
  // Reject backups produced by a newer schema we don't understand. Backups
  // missing __version are accepted (legacy export).
  const version = data.__version
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return { ok: false, error: `导入版本 ${version} 高于当前支持的版本 ${BACKUP_VERSION}`, count: 0 }
  }
  const allowed = new Set<string>(EXPORT_KEYS)
  const toApply: Record<string, unknown> = {}
  const skipped: string[] = []
  const unknownKeys: string[] = []
  let count = 0
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('__')) continue
    if (!allowed.has(key)) {
      unknownKeys.push(key)
      continue
    }
    // Drop entries whose imported value doesn't match the in-memory shape.
    // Without this, a malformed backup could write `msgSendInterval = "5"`
    // and break the auto-send loop until the user resets the setting.
    if (!isValidImportedValue(key, val)) {
      skipped.push(key)
      continue
    }
    GM_setValue(key, val)
    toApply[key] = val
    count++
  }
  applyImportedSettings(toApply)
  return {
    ok: true,
    count,
    skipped: skipped.length > 0 ? skipped : undefined,
    unknownKeys: unknownKeys.length > 0 ? unknownKeys : undefined,
  }
}
