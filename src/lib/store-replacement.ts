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

export const localGlobalRules = gmSignal<Array<{ from?: string; to?: string }>>('localGlobalRules', [])
export const localRoomRules = gmSignal<Record<string, Array<{ from?: string; to?: string }>>>('localRoomRules', {})
export const remoteKeywords = gmSignal<{
  global?: { keywords?: Record<string, string> }
  rooms?: Array<{ room: string; keywords?: Record<string, string> }>
} | null>('remoteKeywords', null)
export const remoteKeywordsLastSync = gmSignal<number | null>('remoteKeywordsLastSync', null)

export const replacementMap = signal<Map<string, string> | null>(null)
