import { type AutoBlendPreset, getAutoBlendPresetValues } from './auto-blend-preset-config'
import {
  autoBlendCooldownSec,
  autoBlendIncludeReply,
  autoBlendMinDistinctUsers,
  autoBlendPreset,
  autoBlendRequireDistinctUsers,
  autoBlendRoutineIntervalSec,
  autoBlendSendAllTrending,
  autoBlendSendCount,
  autoBlendThreshold,
  autoBlendUseReplacements,
  autoBlendWindowSec,
} from './store'

export function applyAutoBlendPreset(preset: AutoBlendPreset): void {
  const p = getAutoBlendPresetValues(preset)
  autoBlendPreset.value = preset
  autoBlendWindowSec.value = p.windowSec
  autoBlendThreshold.value = p.threshold
  autoBlendCooldownSec.value = p.cooldownSec
  autoBlendRoutineIntervalSec.value = p.routineIntervalSec
  autoBlendIncludeReply.value = p.includeReply
  autoBlendRequireDistinctUsers.value = p.requireDistinctUsers
  autoBlendMinDistinctUsers.value = p.minDistinctUsers
  autoBlendSendCount.value = p.sendCount
  autoBlendSendAllTrending.value = p.sendAllTrending
  autoBlendUseReplacements.value = p.useReplacements
}
