/**
 * Pure helpers around the cached Bilibili emoticon list.
 *
 * The signal that backs them (`cachedEmoticonPackages`) lives in `./store`
 * because it is runtime state; everything in this module is a derivation
 * (lookup / classification / log formatting) and has no own state.
 */

import type { BilibiliEmoticon } from '../types'

import { cachedEmoticonPackages } from './store'

/**
 * True when `msg` exactly matches the `emoticon_unique` of any cached emoticon.
 */
export function isEmoticonUnique(msg: string): boolean {
  return cachedEmoticonPackages.value.some(pkg => pkg.emoticons.some(e => e.emoticon_unique === msg))
}

/**
 * Returns the cached emoticon entry whose `emoticon_unique` matches `msg`.
 */
export function findEmoticon(msg: string): BilibiliEmoticon | null {
  for (const pkg of cachedEmoticonPackages.value) {
    for (const e of pkg.emoticons) {
      if (e.emoticon_unique === msg) return e
    }
  }
  return null
}

/**
 * True when `msg` is a known emoticon that the current user cannot send.
 */
export function isLockedEmoticon(msg: string): boolean {
  const emoticon = findEmoticon(msg)
  return emoticon !== null && emoticon.perm === 0
}

/**
 * Returns the human-facing "why is this locked" reason for a given emoticon.
 * Falls back to 权限不足 when the emoticon is unknown or carries no
 * `unlock_show_text`. Single source of truth so log lines, picker toasts,
 * and tooltips stay in sync.
 */
export function getEmoticonLockReason(emo: BilibiliEmoticon | null | undefined): string {
  const reqText = emo?.unlock_show_text?.trim()
  return reqText ? `需要 ${reqText}` : '权限不足'
}

/**
 * Bundle of UI-level lock metadata for a single emoticon. Computed once and
 * reused across the picker (toast + thumbnail) and the settings list (badge
 * + dimmed thumbnail) so they cannot drift.
 */
export interface EmoticonLockMeta {
  /** True iff the server has flagged the emote as unsendable for this user. */
  isLocked: boolean
  /** Trimmed `unlock_show_text` (`''` when missing or whitespace-only). */
  lockText: string
  /** Reason text used for toasts and log lines (`需要 X` or `权限不足`). */
  reason: string
  /** Background color for the lock badge (falls back to a translucent black). */
  badgeColor: string
  /** Tooltip suffix to append after the emoji name; empty when unlocked. */
  titleSuffix: string
  /** Short visible label inside the lock badge — `lockText` or 🔒 fallback. */
  badgeLabel: string
}

/**
 * Derives the lock-state UI metadata for a given emoticon. Always returns a
 * full meta object (including for unlocked emotes) so call sites can use the
 * same helper unconditionally and read `isLocked` to gate badge rendering.
 */
export function getEmoticonLockMeta(emo: BilibiliEmoticon | null | undefined): EmoticonLockMeta {
  const isLocked = emo?.perm === 0
  const lockText = emo?.unlock_show_text?.trim() || ''
  const reason = lockText ? `需要 ${lockText}` : '权限不足'
  const badgeColor = emo?.unlock_show_color || 'rgba(0,0,0,0.6)'
  const titleSuffix = isLocked ? (lockText ? `🔒 该表情需要 ${lockText} 才能发送` : '🔒 该表情已被平台锁定') : ''
  const badgeLabel = lockText || '🔒'
  return { isLocked, lockText, reason, badgeColor, titleSuffix, badgeLabel }
}

/**
 * Builds the user-facing log line for a locked-emoticon rejection.
 */
export function formatLockedEmoticonReject(msg: string, label: string): string {
  const reason = getEmoticonLockReason(findEmoticon(msg))
  return `🔒 ${label}：${msg} 已被平台锁定（${reason}），已阻止发送`
}

/**
 * Heuristic regex for B站 `emoticon_unique` IDs: one or more lowercase
 * letters followed by one or more `_<digits>` segments. Catches the three
 * observed families:
 *
 *   - `room_<roomId>_<emoticonId>`     — 房间专属（主播自己的表情包）
 *   - `official_<emoticonId>`          — 站内通用
 *   - `upower_<roomId>_<emoticonId>`   — 充电档专属表情
 *
 * 故意保守：纯 ID 形态字符串（`abc_123`）在中文聊天里几乎不会自然出现，
 * 误判代价是"用户多看到一行 log"而不是"静默漏发"。
 */
const EMOTICON_UNIQUE_PATTERN = /^[a-z]+(_\d+)+$/

/**
 * `true` when `msg` looks like an `emoticon_unique` ID 但不在当前房间的
 * 缓存表情包内。这种字符串发出去 B 站会按"未识别的 unique"原样回显，
 * 在聊天里就是一坨乱码（`room_1713546334_108382`），通常发生场景：
 *
 *   - 观众从别的主播房间复制了 unique ID，跟车把它当文本累积出 trend
 *   - 模板/共享脚本里硬编码了别房间的 ID
 *
 * 三条 send path（auto-blend / 手动 / +1 / 独轮车 / 同传）都把这个当
 * 硬拒绝。从 upstream chatterbox 644e6b1 移植。
 *
 * 返回 `false` 的情况：
 *   - 字符串是已知表情（走 `isEmoticonUnique` 的正常表情发送路径），
 *   - 字符串不像 ID 形态（普通文本，照常发送），
 *   - 表情缓存还没加载（无法区分"不可用"和"还在加载"，宁可放过也
 *     不要把启动瞬间的合法本房间表情误杀）。
 */
export function isUnavailableEmoticon(msg: string): boolean {
  if (!EMOTICON_UNIQUE_PATTERN.test(msg)) return false
  if (cachedEmoticonPackages.value.length === 0) return false
  return !isEmoticonUnique(msg)
}

/**
 * Builds the user-facing log line for an unavailable-emoticon rejection.
 * 与 `formatLockedEmoticonReject` 同形：调用方传入 call-site label，
 * 文案与 🚫 前缀在这里集中维护，五条 send path 看到的提示一致。
 */
export function formatUnavailableEmoticonReject(msg: string, label: string): string {
  return `🚫 ${label}：${msg} 不在当前房间表情包内，已阻止发送`
}
