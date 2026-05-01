import { autoBlendUserBlacklist } from './store'

export function isAutoBlendBlacklistedUid(uid: string | null): boolean {
  return !!uid && uid in autoBlendUserBlacklist.value
}
