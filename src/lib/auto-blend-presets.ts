import { type AutoBlendPreset, getAutoBlendPresetValues } from './auto-blend-preset-config'
import {
  autoBlendBurstSettleMs,
  autoBlendCooldownSec,
  autoBlendMinDistinctUsers,
  autoBlendPreset,
  autoBlendRateLimitStopThreshold,
  autoBlendRateLimitWindowMin,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
  lastAppliedPresetBaseline,
} from './store'

export function applyAutoBlendPreset(preset: AutoBlendPreset): void {
  const p = getAutoBlendPresetValues(preset)
  autoBlendPreset.value = preset
  autoBlendWindowSec.value = p.windowSec
  autoBlendThreshold.value = p.threshold
  autoBlendCooldownSec.value = p.cooldownSec
  autoBlendRoutineIntervalSec.value = p.routineIntervalSec
  autoBlendBurstSettleMs.value = p.burstSettleMs
  autoBlendRateLimitWindowMin.value = p.rateLimitWindowMin
  autoBlendRateLimitStopThreshold.value = p.rateLimitStopThreshold
  // includeReply 字段已废弃（auto-blend.ts 永远不跟 @ 回复）。
  autoBlendRequireDistinctUsers.value = p.requireDistinctUsers
  autoBlendMinDistinctUsers.value = p.minDistinctUsers
  autoBlendSendCount.value = p.sendCount
  autoBlendSendAllTrending.value = p.sendAllTrending
  autoBlendUseReplacements.value = p.useReplacements
  // Remember which preset is the baseline for any subsequent drift to 'custom'.
  lastAppliedPresetBaseline.value = preset
}
