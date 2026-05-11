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
// 一次性把旧的 customChatCardMode 键迁到新名字 customChatFoldMode。
// 旧名"卡片模式"是从参考脚本沿用过来的，但我们其实没做卡片网格，只是去重 + ×N，
// 所以正名为"折叠"。已经持久化过 customChatCardMode 的本地配置不丢失。
const customChatFoldRenameKey = 'customChatFoldRenamed'
if (!GM_getValue(customChatFoldRenameKey, false)) {
  const legacy = GM_getValue<unknown>('customChatCardMode')
  if (typeof legacy === 'boolean') GM_setValue('customChatFoldMode', legacy)
  GM_setValue(customChatFoldRenameKey, true)
}

// 去重折叠（Chatterbox Chat 侧）：跨用户合并 9 秒内文本相同的弹幕，
// 在原有那一行末尾追加 ×N 徽章。默认关闭；只对 danmaku 生效，礼物/SC/进场不变。
export const customChatFoldMode = gmSignal('customChatFoldMode', false)
// 去重折叠（B 站原生聊天框侧）：在官方右侧弹幕列表上做同样的 ×N 合并。
// 与 customChatFoldMode 互相独立——一个改 Chatterbox Chat，一个改 B 站原生。
export const nativeChatFoldMode = gmSignal('nativeChatFoldMode', false)

export const cachedEmoticonPackages = signal<BilibiliEmoticonPackage[]>([])
