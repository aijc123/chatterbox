import { signal } from '@preact/signals'

import type { BilibiliEmoticonPackage } from '../types'

import { GM_getValue, GM_setValue } from '$'
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
export const customChatCss = gmSignal('customChatCss', '')
export const customChatPerfDebug = gmSignal('customChatPerfDebug', false)

export const cachedEmoticonPackages = signal<BilibiliEmoticonPackage[]>([])
