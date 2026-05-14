import { signal } from '@preact/signals'

import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'

// Migrate legacy flat replacementRules → localGlobalRules (one-time, then delete old key)
;(() => {
  const old = GM_getValue<Array<{ from?: string; to?: string }>>('replacementRules', [])
  if (old.length > 0) {
    const existing = GM_getValue<Array<{ from?: string; to?: string }>>('localGlobalRules', [])
    if (existing.length === 0) {
      GM_setValue('localGlobalRules', old)
    }
    GM_deleteValue('replacementRules')
  }
})()

/**
 * 替换规则的结构：基础是 `from → to`，外加两个可选元字段。
 *
 * - `source`：'manual' = 用户手工加的；'learned' = shadow-learn 自动学到的。
 *   未设字段视为 'manual'（旧持久数据兼容，且 manual 优先保护、不被裁剪）。
 * - `learnedAt`：'learned' 规则的写入时间（ms epoch）。用来在 UI 上按时间倒序
 *   展示自动学到的规则，方便用户撤销近期学错的条目。手工规则不写。
 *
 * 持久化层（gmSignal）的 validator 默认接受额外字段——TypeScript 结构类型在
 * 运行时不强制 schema，所以老数据多/少这两个字段都不会被丢。
 */
export interface ReplacementRule {
  from?: string
  to?: string
  source?: 'manual' | 'learned'
  learnedAt?: number
}

export const localGlobalRules = gmSignal<ReplacementRule[]>('localGlobalRules', [])
export const localRoomRules = gmSignal<Record<string, ReplacementRule[]>>('localRoomRules', {})
export const remoteKeywords = gmSignal<{
  global?: { keywords?: Record<string, string> }
  rooms?: Array<{ room: string; keywords?: Record<string, string> }>
} | null>('remoteKeywords', null)
export const remoteKeywordsLastSync = gmSignal<number | null>('remoteKeywordsLastSync', null)

export const replacementMap = signal<Map<string, string> | null>(null)
