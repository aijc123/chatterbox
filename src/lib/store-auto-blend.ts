import { signal } from '@preact/signals'

import { GM_getValue, GM_setValue } from '$'
import { gmSignal, numericGmSignal } from './gm-signal'

// 自动跟车 (auto-blend internally): send when any message hits N repeats within W seconds,
// then freeze the detector for C seconds. A routine timer picks from active candidates
// by weighted random choice for sustained multi-topic trends.
// Optional: require N distinct users for a stricter social-consensus trigger.
export const autoBlendWindowSec = numericGmSignal('autoBlendWindowSec', 20, { min: 1, max: 600 })
export const autoBlendThreshold = numericGmSignal('autoBlendThreshold', 4, { min: 1, max: 100, integer: true })
export const autoBlendCooldownSec = numericGmSignal('autoBlendCooldownSec', 35, { min: 1, max: 3600 })
// 自动冷却：开启后按当前房间弹幕速率(CPM)动态算冷却。冷场拉长到上限,
// 高峰压到下限——避免一刀切的固定冷却在两种极端下都不合适。开启时上面的
// autoBlendCooldownSec 数值被忽略。从 upstream chatterbox 76cc1ba 移植。
export const autoBlendCooldownAuto = gmSignal('autoBlendCooldownAuto', false)
export const autoBlendRoutineIntervalSec = numericGmSignal('autoBlendRoutineIntervalSec', 60, { min: 5, max: 3600 })
export const autoBlendBurstSettleMs = numericGmSignal('autoBlendBurstSettleMs', 1500, { min: 100, max: 60000 })
export const autoBlendRateLimitWindowMin = numericGmSignal('autoBlendRateLimitWindowMin', 10, { min: 1, max: 1440 })
export const autoBlendRateLimitStopThreshold = numericGmSignal('autoBlendRateLimitStopThreshold', 3, {
  min: 1,
  max: 100,
  integer: true,
})
export const autoBlendPreset = gmSignal<'safe' | 'normal' | 'hot' | 'custom'>('autoBlendPreset', 'normal')
export const autoBlendAdvancedOpen = gmSignal('autoBlendAdvancedOpen', false)
const autoBlendDryRunMigrationKey = 'autoBlendDryRunVisibleDefaultMigrated'
if (!GM_getValue(autoBlendDryRunMigrationKey, false)) {
  if (GM_getValue('autoBlendDryRun', false) === true) GM_setValue('autoBlendDryRun', false)
  GM_setValue(autoBlendDryRunMigrationKey, true)
}
export const autoBlendDryRun = gmSignal('autoBlendDryRun', false)
export const autoBlendAvoidRisky = gmSignal('autoBlendAvoidRisky', true)
export const autoBlendBlockedWords = gmSignal('autoBlendBlockedWords', '抽奖\n加群\n私信\n房管\n举报')
export const autoBlendIncludeReply = gmSignal('autoBlendIncludeReply', false)
export const autoBlendUseReplacements = gmSignal('autoBlendUseReplacements', true)
// 不重复上次自动发送：开启后,与上一次自动跟车发出去的弹幕完全相同的新弹幕
// 不再计入候选,避免冷却结束后被同一句话立刻再次刷上去。仅作用于一次
// startAutoBlend 周期(stop 时清空)。从 upstream chatterbox 32b9b84 移植。
export const autoBlendAvoidRepeat = gmSignal('autoBlendAvoidRepeat', false)
export const autoBlendRequireDistinctUsers = gmSignal('autoBlendRequireDistinctUsers', true)
export const autoBlendMinDistinctUsers = numericGmSignal('autoBlendMinDistinctUsers', 3, {
  min: 1,
  max: 100,
  integer: true,
})
export const autoBlendSendCount = numericGmSignal('autoBlendSendCount', 1, { min: 1, max: 50, integer: true })
export const autoBlendUserBlacklist = gmSignal<Record<string, string>>('autoBlendUserBlacklist', {})
// When enabled, a burst trigger sends ALL currently-trending messages (sorted by
// count) instead of just the one that crossed the threshold first.
// The routine timer always picks one message per tick (weighted random).
export const autoBlendSendAllTrending = gmSignal('autoBlendSendAllTrending', false)

export const autoBlendEnabled = signal(false)
export const autoBlendStatusText = signal('已关闭')
export const autoBlendCandidateText = signal('暂无')
export const autoBlendLastActionText = signal('暂无')
