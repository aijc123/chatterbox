export type AutoBlendPreset = 'safe' | 'normal' | 'hot'

export interface AutoBlendPresetConfig {
  label: string
  hint: string
  windowSec: number
  threshold: number
  cooldownSec: number
  routineIntervalSec: number
  minDistinctUsers: number
}

export interface AutoBlendPresetValues extends AutoBlendPresetConfig {
  includeReply: boolean
  requireDistinctUsers: boolean
  sendCount: number
  sendAllTrending: boolean
  useReplacements: boolean
}

export const AUTO_BLEND_PRESETS: Record<AutoBlendPreset, AutoBlendPresetConfig> = {
  safe: {
    label: '稳一点',
    hint: '少跟，适合挂机',
    windowSec: 20,
    threshold: 4,
    cooldownSec: 25,
    routineIntervalSec: 45,
    minDistinctUsers: 3,
  },
  normal: {
    label: '正常',
    hint: '推荐，比较克制',
    windowSec: 15,
    threshold: 3,
    cooldownSec: 15,
    routineIntervalSec: 30,
    minDistinctUsers: 2,
  },
  hot: {
    label: '热闹',
    hint: '跟得更快',
    windowSec: 10,
    threshold: 2,
    cooldownSec: 8,
    routineIntervalSec: 20,
    minDistinctUsers: 2,
  },
}

export function getAutoBlendPresetValues(preset: AutoBlendPreset): AutoBlendPresetValues {
  return {
    ...AUTO_BLEND_PRESETS[preset],
    includeReply: false,
    requireDistinctUsers: true,
    sendCount: 1,
    sendAllTrending: false,
    useReplacements: true,
  }
}
