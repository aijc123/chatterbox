import { signal } from '@preact/signals'

import type { BilibiliEmoticonPackage } from '../types'

import { GM_getValue, GM_setValue } from '$'
import { CUSTOM_CHAT_CSS_MAX_LENGTH } from './custom-chat-css-sanitize'
import { gmSignal } from './gm-signal'

const customChatDefaultMigrationKey = 'customChatDefaultPresetMigrated'
if (!GM_getValue(customChatDefaultMigrationKey, false)) {
  GM_setValue('customChatEnabled', false)
  GM_setValue('customChatHideNative', false)
  GM_setValue('customChatUseWs', true)
  GM_setValue(customChatDefaultMigrationKey, true)
}

const customChatDisableDefaultMigrationKey = 'customChatDisabledByDefaultMigrated'
if (!GM_getValue(customChatDisableDefaultMigrationKey, false)) {
  GM_setValue('customChatEnabled', false)
  GM_setValue(customChatDisableDefaultMigrationKey, true)
}

export const customChatEnabled = gmSignal('customChatEnabled', false)
export const customChatHideNative = gmSignal('customChatHideNative', false)
export const customChatUseWs = gmSignal('customChatUseWs', true)
export const customChatTheme = gmSignal<'laplace' | 'light' | 'compact'>('customChatTheme', 'laplace')
export const customChatShowDanmaku = gmSignal('customChatShowDanmaku', true)
export const customChatShowGift = gmSignal('customChatShowGift', true)
export const customChatShowSuperchat = gmSignal('customChatShowSuperchat', true)
export const customChatShowEnter = gmSignal('customChatShowEnter', true)
export const customChatShowNotice = gmSignal('customChatShowNotice', true)
// Reject persisted values larger than the cap. A corrupted backup with
// megabytes of CSS would otherwise sit forever in GM storage. Sanitization
// (strip @import, hostile url(...), etc.) still happens at injection time
// inside `ensureCustomChatStyles`, so this validator only enforces size.
export const customChatCss = gmSignal<string>('customChatCss', '', {
  validate: (val): val is string => typeof val === 'string' && val.length <= CUSTOM_CHAT_CSS_MAX_LENGTH,
})
export const customChatPerfDebug = gmSignal('customChatPerfDebug', false)

export const cachedEmoticonPackages = signal<BilibiliEmoticonPackage[]>([])
