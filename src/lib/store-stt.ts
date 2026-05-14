import { effect, signal } from '@preact/signals'

import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'

/**
 * 是否把 Soniox API key 持久化到 GM 存储。
 *
 * 默认开（保持老用户既有行为）。关掉后切换为"仅本会话"——key 留在内存，刷新页
 * 面后清空，且 GM 存储里的旧值立即抹掉。和 `llmApiKeyPersist` 同模式。
 */
export const sonioxApiKeyPersist = gmSignal<boolean>('sonioxApiKeyPersist', true)

/**
 * Soniox API key（运行时 signal）。
 *
 * 不直接用 gmSignal，因为持久化由 sonioxApiKeyPersist 决定。冷启动时若上次
 * 选了"持久"就从 GM 读回；否则从空字符串起步（用户需手动重新粘贴）。
 */
export const sonioxApiKey = signal<string>(
  GM_getValue<boolean>('sonioxApiKeyPersist', true) ? GM_getValue<string>('sonioxApiKey', '') : ''
)

// 唯一会写盘的地方——持久模式下落盘；切到非持久模式立刻删除 GM 里的旧值。
let _sonioxKeyFirstEffectRun = true
effect(() => {
  const persist = sonioxApiKeyPersist.value
  const key = sonioxApiKey.value
  if (_sonioxKeyFirstEffectRun) {
    _sonioxKeyFirstEffectRun = false
    return
  }
  if (persist) {
    GM_setValue('sonioxApiKey', key)
  } else {
    GM_deleteValue('sonioxApiKey')
  }
})

/** 显式清空 Soniox API key（运行时 + GM 存储）。 */
export function clearSonioxApiKey(): void {
  sonioxApiKey.value = ''
  GM_deleteValue('sonioxApiKey')
}

export const sonioxLanguageHints = gmSignal<string[]>('sonioxLanguageHints', ['zh'])
// 默认关：识别错误（环境噪音 / 家人说话 / 电视）会直接进 B 站弹幕，与其他
// 自动发送功能（HZM dryRun=true 默认）的安全偏好对齐。老用户的偏好被
// GM 存储覆盖，不受默认值改变影响。
export const sonioxAutoSend = gmSignal('sonioxAutoSend', false)
export const sonioxMaxLength = gmSignal('sonioxMaxLength', 40)
export const sonioxWrapBrackets = gmSignal('sonioxWrapBrackets', false)
export const sonioxTranslationEnabled = gmSignal('sonioxTranslationEnabled', false)
export const sonioxTranslationTarget = gmSignal('sonioxTranslationTarget', 'en')
// Empty = system default mic. The id is validated against the live device
// list before every start; a stale id (mic unplugged across sessions)
// silently falls back to default instead of erroring out.
export const sonioxAudioDeviceId = gmSignal('sonioxAudioDeviceId', '')

export const sttRunning = signal(false)
