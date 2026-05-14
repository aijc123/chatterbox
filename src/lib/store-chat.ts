import { effect, signal } from '@preact/signals'

import type { BilibiliEmoticonPackage } from '../types'

import { GM_getValue, GM_setValue } from '$'
import { CUSTOM_CHAT_CSS_MAX_LENGTH, sanitizeCustomChatCss } from './custom-chat-css-sanitize'
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
// megabytes of CSS would otherwise sit forever in GM storage.
//
// Sanitization 也在 set/load 时跑一遍，让 GM 存储里的字符串就是"已 sanitize 的"。
// 之前只在 injection 时（ensureCustomChatStyles）sanitize，意味着如果未来 sanitizer
// 漏掉某个新攻击向量，已经被持久化的恶意 CSS 是个"定时炸弹"——每次脚本启动注
// 入都会触发。现在 setter 侧 sanitize 后，存的就是干净的。注入时仍跑一次作为
// 冗余防御。
export const customChatCss = gmSignal<string>('customChatCss', '', {
  validate: (val): val is string => typeof val === 'string' && val.length <= CUSTOM_CHAT_CSS_MAX_LENGTH,
  // 不在 validate 里做副作用 sanitize（validate 是纯类型守卫）。改用 transform
  // 钩子；gm-signal 不支持就在外部用 effect 同步回写。这里采用 effect 方案以
  // 避免动 gm-signal 的接口。
})

// 把存进 customChatCss 的字符串经过 sanitizer——任何 setter（UI 输入框、备份
// 导入、preset 应用）流入的 CSS 都会被规整。结果只回写当差异显著时，避免
// 无限 effect 循环（sanitize(sanitize(x)) === sanitize(x) 是 idempotent 的）。
let _customChatCssSanitizing = false
effect(() => {
  const raw = customChatCss.value
  if (_customChatCssSanitizing) return
  if (!raw) return
  const sanitized = sanitizeCustomChatCss(raw).css
  if (sanitized !== raw) {
    _customChatCssSanitizing = true
    customChatCss.value = sanitized
    _customChatCssSanitizing = false
  }
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
