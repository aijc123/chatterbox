import { effect } from '@preact/signals'

import { cachedRoomId, localGlobalRules, localRoomRules, remoteKeywords, replacementMap } from './store'

/**
 * Builds the replacement map from remote and local rules.
 * Priority: remote global < remote room < local global < local room.
 *
 * Skips the write when `cachedRoomId` is mid-resolution (null) so we don't
 * clobber a previously-correct map with one missing the room-specific rules.
 * The effect below re-runs when the room id resolves.
 */
export function buildReplacementMap(): void {
  const rid = cachedRoomId.value
  if (rid === null && replacementMap.value !== null) return

  const map = new Map<string, string>()

  const rk = remoteKeywords.value
  if (rk) {
    const globalKeywords = rk.global?.keywords ?? {}
    for (const [from, to] of Object.entries(globalKeywords)) {
      if (from) map.set(from, to)
    }

    if (rid !== null) {
      const roomData = rk.rooms?.find(r => String(r.room) === String(rid))
      const roomKeywords = roomData?.keywords ?? {}
      for (const [from, to] of Object.entries(roomKeywords)) {
        if (from) map.set(from, to)
      }
    }
  }

  for (const rule of localGlobalRules.value) {
    if (rule.from) map.set(rule.from, rule.to ?? '')
  }

  if (rid !== null) {
    const roomRules = localRoomRules.value[String(rid)] ?? []
    for (const rule of roomRules) {
      if (rule.from) map.set(rule.from, rule.to ?? '')
    }
  }

  replacementMap.value = map
}

// Auto-rebuild whenever the cached room id, remote keywords, or local rules
// change. This makes manual `buildReplacementMap()` calls idempotent and
// guarantees the map tracks the active room across SPA navigation.
effect(() => {
  cachedRoomId.value
  remoteKeywords.value
  localGlobalRules.value
  localRoomRules.value
  buildReplacementMap()
})

/**
 * Applies all replacement rules to the given text using the cached map.
 */
export function applyReplacements(text: string): string {
  if (replacementMap.value === null) {
    buildReplacementMap()
  }
  let result = text
  for (const [from, to] of (replacementMap.value ?? new Map<string, string>()).entries()) {
    result = result.split(from).join(to)
  }
  return result
}
