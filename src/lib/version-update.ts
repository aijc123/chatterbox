/**
 * Decide whether to show the "🆕 已更新" badge in the About tab.
 *
 * Rules:
 *  - Empty / never-recorded `lastSeen` means this is the user's first time
 *    opening the panel ever — don't show an "updated" badge to a brand-new user.
 *  - If `lastSeen` matches the current build, nothing to announce.
 *  - Otherwise the user has upgraded since they last visited About — show it.
 */
export function shouldShowVersionUpdateBadge(lastSeen: string, current: string): boolean {
  if (!lastSeen) return false
  return lastSeen !== current
}
