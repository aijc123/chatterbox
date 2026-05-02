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
