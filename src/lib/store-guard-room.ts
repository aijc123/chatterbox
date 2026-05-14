import { effect, signal } from '@preact/signals'

import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'

export const guardRoomEndpoint = gmSignal('guardRoomEndpoint', 'https://bilibili-guard-room.vercel.app')

/**
 * 是否把保安室同步密钥持久化到 GM 存储。
 *
 * 密钥格式 `spaceId@syncSecret`——`syncSecret` 部分是 Bearer 凭证。默认开（保
 * 持老用户既有行为）。关掉后切换为"仅本会话"，刷新页面后清空。和 LLM /
 * Soniox 同模式。
 */
export const guardRoomSyncKeyPersist = gmSignal<boolean>('guardRoomSyncKeyPersist', true)

/**
 * 保安室同步密钥（运行时 signal）。冷启动时若上次选了"持久"就从 GM 读回；
 * 否则从空字符串起步。
 */
export const guardRoomSyncKey = signal<string>(
  GM_getValue<boolean>('guardRoomSyncKeyPersist', true) ? GM_getValue<string>('guardRoomSyncKey', '') : ''
)

let _guardRoomKeyFirstEffectRun = true
effect(() => {
  const persist = guardRoomSyncKeyPersist.value
  const key = guardRoomSyncKey.value
  if (_guardRoomKeyFirstEffectRun) {
    _guardRoomKeyFirstEffectRun = false
    return
  }
  if (persist) {
    GM_setValue('guardRoomSyncKey', key)
  } else {
    GM_deleteValue('guardRoomSyncKey')
  }
})

/** 显式清空保安室同步密钥（运行时 + GM 存储）。 */
export function clearGuardRoomSyncKey(): void {
  guardRoomSyncKey.value = ''
  GM_deleteValue('guardRoomSyncKey')
}

export const guardRoomWebsiteControlEnabled = gmSignal('guardRoomWebsiteControlEnabled', false)

export const guardRoomHandoffActive = signal(false)
