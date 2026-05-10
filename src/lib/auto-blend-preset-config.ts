export type AutoBlendPreset = 'safe' | 'normal' | 'hot'

export interface AutoBlendPresetConfig {
  label: string
  hint: string
  windowSec: number
  threshold: number
  cooldownSec: number
  routineIntervalSec: number
  minDistinctUsers: number
  burstSettleMs: number
  rateLimitWindowMin: number
  rateLimitStopThreshold: number
}

export interface AutoBlendPresetValues extends AutoBlendPresetConfig {
  // `includeReply` 已经废除（@ 回复一律不入候选,见 auto-blend.ts 中
  // recordDanmaku 注释 + upstream chatterbox 624de4e）。Preset 不再需要写它。
  requireDistinctUsers: boolean
  sendCount: number
  sendAllTrending: boolean
  useReplacements: boolean
}

export const AUTO_BLEND_PRESETS: Record<AutoBlendPreset, AutoBlendPresetConfig> = {
  safe: {
    label: '稳一点',
    hint: '少跟，适合挂机',
    windowSec: 25,
    threshold: 5,
    cooldownSec: 45,
    routineIntervalSec: 75,
    minDistinctUsers: 3,
    burstSettleMs: 1800,
    rateLimitWindowMin: 10,
    rateLimitStopThreshold: 3,
  },
  normal: {
    label: '正常',
    hint: '推荐，比较克制',
    windowSec: 20,
    threshold: 4,
    cooldownSec: 35,
    routineIntervalSec: 60,
    minDistinctUsers: 3,
    burstSettleMs: 1500,
    rateLimitWindowMin: 10,
    rateLimitStopThreshold: 3,
  },
  hot: {
    label: '热闹',
    hint: '跟得更快，但会自动刹车',
    windowSec: 15,
    threshold: 3,
    cooldownSec: 20,
    routineIntervalSec: 40,
    minDistinctUsers: 2,
    burstSettleMs: 1200,
    rateLimitWindowMin: 10,
    rateLimitStopThreshold: 2,
  },
}

export function getAutoBlendPresetValues(preset: AutoBlendPreset): AutoBlendPresetValues {
  return {
    ...AUTO_BLEND_PRESETS[preset],
    requireDistinctUsers: true,
    sendCount: 1,
    sendAllTrending: false,
    useReplacements: true,
  }
}
