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
 * Hard upper bound on the post-replacement string length. Bilibili danmaku
 * have a low character cap (≤ 30 in normal rooms, slightly higher with
 * privileges), so this 4096-char ceiling is roughly 100× the longest message
 * a user could realistically want — it only fires when overlapping rules
 * (e.g. "a" → "aa") cause exponential growth, and is far below any size that
 * would freeze the UI or exhaust GM storage.
 */
export const REPLACEMENT_MAX_OUTPUT_LENGTH = 4096

/**
 * Applies all replacement rules to the given text using the cached map.
 *
 * Bails out early if the output exceeds {@link REPLACEMENT_MAX_OUTPUT_LENGTH}.
 * Without this guard, a user-authored map containing pathological rules
 * (`from` is a substring of its `to`, or two rules form a cycle) can amplify
 * a short input into a multi-megabyte string in a few iterations, freezing
 * the loop and the send queue. The caller still sees a string, just one
 * truncated to the cap — `processMessages` will then chunk it normally.
 */
export function applyReplacements(text: string): string {
  if (replacementMap.value === null) {
    buildReplacementMap()
  }
  let result = text
  for (const [from, to] of (replacementMap.value ?? new Map<string, string>()).entries()) {
    if (!from) continue
    result = result.split(from).join(to)
    if (result.length > REPLACEMENT_MAX_OUTPUT_LENGTH) {
      return result.slice(0, REPLACEMENT_MAX_OUTPUT_LENGTH)
    }
  }
  return result
}
