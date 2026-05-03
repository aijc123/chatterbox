/**
 * 智能辅助驾驶（hzm-auto-drive）相关持久状态。
 *
 * - 全局：模式、dryRun、间隔、限速、暂停关键词、LLM 配置（key/model/...）
 * - 按房间：勾选 tag、黑名单 tag、最近发送、每日统计
 *
 * "按房间"用 `Record<string, ...>` 而非 Map，因为 gmSignal 序列化用 JSON。
 * 房间号统一以字符串作为 key（与 store-meme.ts 等已有模块一致）。
 */

import { effect, signal } from '@preact/signals'

import { GM_deleteValue, GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'

// ---------------------------------------------------------------------------
// 全局
// ---------------------------------------------------------------------------

export type HzmDriveMode = 'heuristic' | 'llm'

const VALID_MODES: HzmDriveMode[] = ['heuristic', 'llm']
const isValidMode = (v: unknown): v is HzmDriveMode => typeof v === 'string' && (VALID_MODES as string[]).includes(v)

/**
 * One-shot migration: legacy `hzmDriveMode='off'` is split into `mode='heuristic' + enabled=false`.
 * The new gmSignal below validates strictly, so we must scrub the persisted value first.
 *
 * Exported (with injectable get/set) so it's testable without relying on module-import order
 * or bun's '$' mock — both of which are flaky when multiple test files share a process.
 */
export const HZM_DRIVE_MODE_MIGRATION_KEY = 'hzmDriveModeOffSplitMigrated'
export function migrateLegacyHzmDriveMode(io: {
  get: <T>(key: string, defaultValue: T) => T
  set: (key: string, value: unknown) => void
}): void {
  if (io.get(HZM_DRIVE_MODE_MIGRATION_KEY, false)) return
  if (io.get('hzmDriveMode', 'heuristic') === 'off') io.set('hzmDriveMode', 'heuristic')
  io.set(HZM_DRIVE_MODE_MIGRATION_KEY, true)
}
migrateLegacyHzmDriveMode({ get: GM_getValue, set: GM_setValue })

/**
 * 智驾模式：
 * - heuristic：纯启发式（弹幕关键词 → tag → 随机选条）
 * - llm：每 N 次 tick 用 LLM 选条（其它 tick 仍走启发式）
 *
 * 此 signal 仅表示"模式偏好"。开关由 `hzmDriveEnabled` 控制。
 */
export const hzmDriveMode = gmSignal<HzmDriveMode>('hzmDriveMode', 'heuristic', { validate: isValidMode })

/**
 * 是否开车（运行时状态）。
 * 用 signal（非 gmSignal），刷新后默认 false——避免离开页面后仍在自动发送。
 * 与 `autoBlendEnabled` 的策略一致。
 */
export const hzmDriveEnabled = signal(false)

/** 状态文本（运行时 signal，由 hzm-auto-drive.ts 更新）。 */
export const hzmDriveStatusText = signal('已关闭')

/** 面板展开状态（持久化）。默认收起，与自动跟车一致。 */
export const hzmPanelOpen = gmSignal('hzmPanelOpen', false)

/** 用户已确认过"非试运行直接开车会真发弹幕"提醒。 */
export const hasConfirmedHzmRealFire = gmSignal('hasConfirmedHzmRealFire', false)

/**
 * 试运行：选了梗但不真发，只 appendLog。
 * 默认 true，避免新用户开机就开始往别人房间发。
 */
export const hzmDryRun = gmSignal<boolean>('hzmDryRun', true)

/** Tick 基础间隔（秒），加 0.7×–1.5× jitter。默认 8s。 */
export const hzmDriveIntervalSec = gmSignal<number>('hzmDriveIntervalSec', 8)

/** 每分钟最多发送条数。默认 6（与参考插件一致）。 */
export const hzmRateLimitPerMin = gmSignal<number>('hzmRateLimitPerMin', 6)

/** LLM 调用频率（每 N tick 一次）。1 = 每次都调；3 = 每 3 次调一次（其余走启发式）。 */
export const hzmLlmRatio = gmSignal<number>('hzmLlmRatio', 3)

export type HzmLlmProvider = 'anthropic' | 'openai' | 'openai-compat'
const VALID_PROVIDERS: HzmLlmProvider[] = ['anthropic', 'openai', 'openai-compat']
const isValidProvider = (v: unknown): v is HzmLlmProvider =>
  typeof v === 'string' && (VALID_PROVIDERS as string[]).includes(v)

/** LLM provider。默认 anthropic（推荐 Haiku 4.5 做选梗）。 */
export const hzmLlmProvider = gmSignal<HzmLlmProvider>('hzmLlmProvider', 'anthropic', { validate: isValidProvider })

/**
 * 是否把 API key 持久化到 GM 存储。
 *
 * 默认开（保持老用户既有行为）。关掉后切换为"仅本会话"——key 留在内存，刷新页
 * 面后清空，且 GM 存储里的旧值立即抹掉。这是缓解 GM 存储明文风险的用户级开关：
 * 共用电脑、备份导出、其它扩展都不再能从盘上读到。
 */
export const hzmLlmApiKeyPersist = gmSignal<boolean>('hzmLlmApiKeyPersist', true)

/**
 * API key（运行时 signal）。
 *
 * 不直接用 gmSignal，因为持久化由 hzmLlmApiKeyPersist 决定。冷启动时若上次
 * 选了"持久"就从 GM 读回；否则从空字符串起步（用户需手动重新粘贴）。
 */
export const hzmLlmApiKey = signal<string>(
  GM_getValue<boolean>('hzmLlmApiKeyPersist', true) ? GM_getValue<string>('hzmLlmApiKey', '') : ''
)

// 唯一会写盘的地方——持久模式下落盘；切到非持久模式立刻删除 GM 里的旧值，
// 这样用户从持久切到非持久时不会留下一个孤儿副本。
let _isFirstPersistEffectRun = true
effect(() => {
  const persist = hzmLlmApiKeyPersist.value
  const key = hzmLlmApiKey.value
  if (_isFirstPersistEffectRun) {
    _isFirstPersistEffectRun = false
    return
  }
  if (persist) {
    GM_setValue('hzmLlmApiKey', key)
  } else {
    GM_deleteValue('hzmLlmApiKey')
  }
})

/**
 * 显式清空 API key（运行时 + GM 存储）。
 * UI 的"清除"按钮调用这个，避免 UI 自己直接 setValue('')。
 */
export function clearHzmLlmApiKey(): void {
  hzmLlmApiKey.value = ''
  GM_deleteValue('hzmLlmApiKey')
}

/** 模型名。默认 Haiku 4.5（最便宜的 Anthropic 选梗模型）。 */
export const hzmLlmModel = gmSignal<string>('hzmLlmModel', 'claude-haiku-4-5-20251001')

/**
 * OpenAI 兼容 base URL（仅 provider='openai-compat' 时使用）。
 * 例如 DeepSeek `https://api.deepseek.com`、Moonshot `https://api.moonshot.cn`。
 * 第三方域可能不在 @connect 列表，Tampermonkey 会弹窗确认；UI 上提示。
 */
export const hzmLlmBaseURL = gmSignal<string>('hzmLlmBaseURL', '')

/**
 * 暂停关键词（每行一条），匹配时 60s 内不发智驾弹幕。
 * 默认从内置梗源的 pauseKeywords 起步，但用户可在 UI 编辑覆盖。
 * 空字符串 = 用所在房间梗源里的默认值。
 */
export const hzmPauseKeywordsOverride = gmSignal<string>('hzmPauseKeywordsOverride', '')

// ---------------------------------------------------------------------------
// 按房间
// ---------------------------------------------------------------------------

const isRecordOfStringArrays = (v: unknown): v is Record<string, string[]> =>
  typeof v === 'object' &&
  v !== null &&
  Object.values(v as Record<string, unknown>).every(arr => Array.isArray(arr) && arr.every(s => typeof s === 'string'))

/** roomId(string) → 当前直播间用户勾选的 tag 列表（智驾选梗时只看这些 tag）。 */
export const hzmSelectedTagsByRoom = gmSignal<Record<string, string[]>>(
  'hzmSelectedTagsByRoom',
  {},
  {
    validate: isRecordOfStringArrays,
  }
)

/** roomId(string) → 黑名单 tag（命中即跳过）。 */
export const hzmBlacklistTagsByRoom = gmSignal<Record<string, string[]>>(
  'hzmBlacklistTagsByRoom',
  {},
  {
    validate: isRecordOfStringArrays,
  }
)

/** roomId(string) → 最近发送的 N 条梗 content（去重避免连发同条）。 */
export const hzmRecentSentByRoom = gmSignal<Record<string, string[]>>(
  'hzmRecentSentByRoom',
  {},
  {
    validate: isRecordOfStringArrays,
  }
)

export interface HzmDailyStats {
  /** YYYY-MM-DD（本地时区）。 */
  date: string
  /** 今日已发送条数（不含 dryRun）。 */
  sent: number
  /** 今日 LLM 调用次数。 */
  llmCalls: number
}

const isDailyStats = (v: unknown): v is HzmDailyStats =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as HzmDailyStats).date === 'string' &&
  typeof (v as HzmDailyStats).sent === 'number' &&
  typeof (v as HzmDailyStats).llmCalls === 'number'

const isRecordOfDailyStats = (v: unknown): v is Record<string, HzmDailyStats> =>
  typeof v === 'object' && v !== null && Object.values(v as Record<string, unknown>).every(isDailyStats)

/** roomId(string) → 当日发送/LLM 计数。每天换日期自动重置。 */
export const hzmDailyStatsByRoom = gmSignal<Record<string, HzmDailyStats>>(
  'hzmDailyStatsByRoom',
  {},
  {
    validate: isRecordOfDailyStats,
  }
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 按房间号取勾选 tag（只读）。 */
export function getSelectedTags(roomId: number | null): string[] {
  if (roomId == null) return []
  return hzmSelectedTagsByRoom.value[String(roomId)] ?? []
}

/** 按房间号写勾选 tag（替换）。 */
export function setSelectedTags(roomId: number, tags: string[]): void {
  hzmSelectedTagsByRoom.value = {
    ...hzmSelectedTagsByRoom.value,
    [String(roomId)]: tags,
  }
}

/** 按房间号取黑名单 tag。 */
export function getBlacklistTags(roomId: number | null): string[] {
  if (roomId == null) return []
  return hzmBlacklistTagsByRoom.value[String(roomId)] ?? []
}

/** 按房间号写黑名单 tag。 */
export function setBlacklistTags(roomId: number, tags: string[]): void {
  hzmBlacklistTagsByRoom.value = {
    ...hzmBlacklistTagsByRoom.value,
    [String(roomId)]: tags,
  }
}

/** 取最近 N 条已发送（roomId 维度）。 */
export function getRecentSent(roomId: number | null): string[] {
  if (roomId == null) return []
  return hzmRecentSentByRoom.value[String(roomId)] ?? []
}

/** 推一条到最近已发送，限制最近 5 条。 */
export function pushRecentSent(roomId: number, content: string, max = 5): void {
  const key = String(roomId)
  const cur = hzmRecentSentByRoom.value[key] ?? []
  const next = [...cur.filter(c => c !== content), content]
  hzmRecentSentByRoom.value = {
    ...hzmRecentSentByRoom.value,
    [key]: next.length > max ? next.slice(-max) : next,
  }
}

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 取当日统计（自动按日期重置）。 */
export function getDailyStats(roomId: number | null): HzmDailyStats {
  const today = todayLocal()
  if (roomId == null) return { date: today, sent: 0, llmCalls: 0 }
  const key = String(roomId)
  const cur = hzmDailyStatsByRoom.value[key]
  if (!cur || cur.date !== today) {
    return { date: today, sent: 0, llmCalls: 0 }
  }
  return cur
}

/** 累加当日发送计数。 */
export function bumpDailySent(roomId: number, delta = 1): void {
  const today = todayLocal()
  const key = String(roomId)
  const cur = hzmDailyStatsByRoom.value[key]
  const next: HzmDailyStats =
    !cur || cur.date !== today ? { date: today, sent: delta, llmCalls: 0 } : { ...cur, sent: cur.sent + delta }
  hzmDailyStatsByRoom.value = { ...hzmDailyStatsByRoom.value, [key]: next }
}

/** 累加当日 LLM 调用计数。 */
export function bumpDailyLlmCalls(roomId: number, delta = 1): void {
  const today = todayLocal()
  const key = String(roomId)
  const cur = hzmDailyStatsByRoom.value[key]
  const next: HzmDailyStats =
    !cur || cur.date !== today ? { date: today, sent: 0, llmCalls: delta } : { ...cur, llmCalls: cur.llmCalls + delta }
  hzmDailyStatsByRoom.value = { ...hzmDailyStatsByRoom.value, [key]: next }
}
