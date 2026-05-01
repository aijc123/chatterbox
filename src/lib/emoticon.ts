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
 * Builds the user-facing log line for a locked-emoticon rejection.
 */
export function formatLockedEmoticonReject(msg: string, label: string): string {
  const reqText = findEmoticon(msg)?.unlock_show_text?.trim()
  const reason = reqText ? `需要 ${reqText}` : '权限不足'
  return `🔒 ${label}：${msg} 已被平台锁定（${reason}），已阻止发送`
}
