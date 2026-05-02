/**
 * 智能辅助驾驶（HzmAutoDrive）运行时。
 *
 * 这是参考插件 `Bilibili-Live-Spamer_sbhzm` 的 `HzmAutoDrive` 类的 chatterbox 移植：
 * - 监听最近 60 秒的公屏弹幕（**走 chatterbox 已有的 `subscribeDanmaku`**，不再
 *   单独挂 MutationObserver）
 * - 自调度 jitter tick（基础间隔 × 0.7~1.5）
 * - 每 tick：
 *   1. 检查每日统计是否需要按日期重置
 *   2. 检查暂停关键词（命中则 60s 内不发）
 *   3. 检查每分钟限速
 *   4. 选梗：默认启发式；mode='llm' 时每 N 次 tick 一次 LLM（其余仍走启发式）
 *   5. dryRun=true 只 appendLog；否则走 `enqueueDanmaku(SendPriority.AUTO)`
 *
 * 与已有 auto-blend 共存：两者都通过同一个全局发送队列 (`send-queue.ts`)，
 * 不会冲突。但同时启用会叠加每分钟发送量；UI 上提示用户。
 *
 * 与文字独轮车（loop.ts）共存：同上，只是日志多一条提示。
 */

import type { MemeSource } from './meme-sources'
import type { LaplaceMemeWithSource } from './sbhzm-client'

import { ensureRoomId, getCsrfToken } from './api'
import { subscribeDanmaku } from './danmaku-stream'
import { appendLog, notifyUser } from './log'
import { enqueueDanmaku, SendPriority } from './send-queue'
import {
  bumpDailyLlmCalls,
  bumpDailySent,
  getBlacklistTags,
  getRecentSent,
  getSelectedTags,
  hzmDriveIntervalSec,
  hzmDriveMode,
  hzmDryRun,
  hzmLlmApiKey,
  hzmLlmBaseURL,
  hzmLlmModel,
  hzmLlmProvider,
  hzmLlmRatio,
  hzmPauseKeywordsOverride,
  hzmRateLimitPerMin,
  pushRecentSent,
} from './store-hzm'

const RECENT_DANMU_TTL_MS = 30_000
const RECENT_DANMU_MAX = 200
const PAUSE_HOLD_MS = 60_000
const MIN_TICK_DELAY_MS = 2_000

interface DanmuRecord {
  ts: number
  text: string
}

let recentDanmu: DanmuRecord[] = []
let unsubscribe: (() => void) | null = null
let tickTimer: ReturnType<typeof setTimeout> | null = null
let pausedUntil = 0
const sentTimestamps: number[] = []
let heuristicTickCount = 0
let activeRoomId: number | null = null
let activeSource: MemeSource | null = null
let memesProvider: (() => LaplaceMemeWithSource[]) | null = null

/** 重置全部运行时状态（停车时调用）。 */
function resetRuntime(): void {
  recentDanmu = []
  pausedUntil = 0
  sentTimestamps.length = 0
  heuristicTickCount = 0
  activeRoomId = null
  activeSource = null
  memesProvider = null
}

function getRecentDanmuTexts(): string[] {
  const cutoff = Date.now() - RECENT_DANMU_TTL_MS
  recentDanmu = recentDanmu.filter(d => d.ts >= cutoff)
  return recentDanmu.map(d => d.text)
}

function getEffectivePauseKeywords(source: MemeSource): RegExp[] {
  const override = hzmPauseKeywordsOverride.value.trim()
  const lines = override
    ? override
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    : (source.pauseKeywords ?? [])
  const patterns: RegExp[] = []
  for (const p of lines) {
    try {
      patterns.push(new RegExp(p))
    } catch {
      // ignore malformed pattern
    }
  }
  return patterns
}

function shouldPauseFromKeywords(source: MemeSource): boolean {
  const recent = getRecentDanmuTexts().join(' ')
  for (const re of getEffectivePauseKeywords(source)) {
    if (re.test(recent)) {
      pausedUntil = Date.now() + PAUSE_HOLD_MS
      appendLog(`⏸ 智驾：检测到暂停关键词，60s 内不发`)
      return true
    }
  }
  return Date.now() < pausedUntil
}

function withinRateLimit(): boolean {
  const cutoff = Date.now() - 60_000
  while (sentTimestamps.length > 0 && sentTimestamps[0] < cutoff) {
    sentTimestamps.shift()
  }
  return sentTimestamps.length < hzmRateLimitPerMin.value
}

/**
 * 候选池：从给定梗集里过滤掉
 *  - 最近发送过的
 *  - 命中黑名单 tag 的
 * 仅保留有内容的条。导出供测试用。
 */
export function buildCandidatePool(opts: {
  roomId: number
  memes: LaplaceMemeWithSource[]
  /** 显式注入便于测试；不传则从 store 读。 */
  recentSent?: string[]
  blacklistTags?: string[]
}): LaplaceMemeWithSource[] {
  const recent = new Set(opts.recentSent ?? getRecentSent(opts.roomId))
  const blacklist = new Set(opts.blacklistTags ?? getBlacklistTags(opts.roomId))
  return opts.memes.filter(m => {
    if (!m.content) return false
    if (recent.has(m.content)) return false
    if (m.tags.some(t => blacklist.has(t.name))) return false
    return true
  })
}

/**
 * 启发式选梗（纯函数，便于测试）：
 *  1. 公屏文本 vs `source.keywordToTag` 正则映射，命中 → 优先选该 tag
 *  2. 否则若用户勾了 selectedTags，按用户勾选 tag 过滤
 *  3. 最后从候选池随机选一条
 *
 * 默认从 store 读 `selectedTags` / `blacklistTags` / `recentSent`，测试时可显式注入。
 */
export function pickByHeuristic(opts: {
  roomId: number
  source: MemeSource
  memes: LaplaceMemeWithSource[]
  recentDanmuText: string
  /** 测试时可显式覆盖；不传则从 store 读。 */
  recentSent?: string[]
  blacklistTags?: string[]
  selectedTags?: string[]
  /** 测试时可注入伪随机值（0..1）替代 Math.random，便于稳定断言。 */
  randomFn?: () => number
}): LaplaceMemeWithSource | null {
  const pool = buildCandidatePool({
    roomId: opts.roomId,
    memes: opts.memes,
    recentSent: opts.recentSent,
    blacklistTags: opts.blacklistTags,
  })
  if (pool.length === 0) return null

  let matchedTag: string | null = null
  for (const [pattern, tag] of Object.entries(opts.source.keywordToTag ?? {})) {
    try {
      if (new RegExp(pattern).test(opts.recentDanmuText)) {
        matchedTag = tag
        break
      }
    } catch {
      // skip malformed pattern
    }
  }

  let filtered = pool
  if (matchedTag) {
    const byTag = pool.filter(m => m.tags.some(t => t.name === matchedTag))
    if (byTag.length > 0) filtered = byTag
  } else {
    const selected = opts.selectedTags ?? getSelectedTags(opts.roomId)
    if (selected.length > 0) {
      const sel = new Set(selected)
      const bySelected = pool.filter(m => m.tags.some(t => sel.has(t.name)))
      if (bySelected.length > 0) filtered = bySelected
    }
  }

  const rand = opts.randomFn ?? Math.random
  return filtered[Math.floor(rand() * filtered.length)] ?? null
}

/**
 * LLM 选梗（懒加载）。失败/无 key 直接返回 null，让调用方回退启发式。
 */
async function pickByLLM(roomId: number, source: MemeSource): Promise<LaplaceMemeWithSource | null> {
  const apiKey = hzmLlmApiKey.value.trim()
  if (!apiKey) return null
  const all = memesProvider?.() ?? []
  const pool = buildCandidatePool({ roomId, memes: all }).slice(0, 30)
  if (pool.length === 0) return null

  bumpDailyLlmCalls(roomId)
  try {
    const { chooseMemeWithLLM } = await import('./llm-driver')
    const chosenContent = await chooseMemeWithLLM({
      provider: hzmLlmProvider.value,
      apiKey,
      model: hzmLlmModel.value,
      baseURL: hzmLlmBaseURL.value.trim() || undefined,
      roomName: source.name,
      recentChat: getRecentDanmuTexts().slice(-30),
      candidates: pool.map(m => ({ id: String(m.id), content: m.content, tags: m.tags.map(t => t.name) })),
    })
    if (!chosenContent) return null
    return pool.find(m => m.content === chosenContent) ?? null
  } catch (err) {
    appendLog(`⚠️ 智驾 LLM 调用失败，回退启发式：${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function sendOne(roomId: number, meme: LaplaceMemeWithSource): Promise<void> {
  if (hzmDryRun.value) {
    appendLog(`🚗[dryRun] 智驾候选：${meme.content}`)
    pushRecentSent(roomId, meme.content)
    return
  }

  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    appendLog('❌ 智驾：未找到登录信息，已暂停发送')
    pausedUntil = Date.now() + PAUSE_HOLD_MS
    return
  }

  try {
    const result = await enqueueDanmaku(meme.content, roomId, csrfToken, SendPriority.AUTO)
    if (result.success && !result.cancelled) {
      sentTimestamps.push(Date.now())
      pushRecentSent(roomId, meme.content)
      bumpDailySent(roomId)
      appendLog(`🚗 智驾：${meme.content}`)
    } else if (result.cancelled) {
      appendLog(`⏭ 智驾被打断：${meme.content}`)
    } else {
      appendLog(`❌ 智驾发送失败：${meme.content}，原因：${result.error ?? '未知'}`)
    }
  } catch (err) {
    appendLog(`❌ 智驾发送异常：${err instanceof Error ? err.message : String(err)}`)
  }
}

async function tick(): Promise<void> {
  // 模式被 UI 改成 off / 房间号变了 → 静默退出
  if (hzmDriveMode.value === 'off' || activeRoomId === null || activeSource === null) {
    tickTimer = null
    return
  }

  try {
    const now = Date.now()
    if (shouldPauseFromKeywords(activeSource)) {
      scheduleNext(hzmDriveIntervalSec.value * 2)
      return
    }
    if (now < pausedUntil) {
      scheduleNext(hzmDriveIntervalSec.value)
      return
    }
    if (!withinRateLimit()) {
      scheduleNext(hzmDriveIntervalSec.value)
      return
    }

    heuristicTickCount++
    let meme: LaplaceMemeWithSource | null = null
    const llmRatio = Math.max(1, hzmLlmRatio.value)
    const useLLM =
      hzmDriveMode.value === 'llm' && hzmLlmApiKey.value.trim() !== '' && heuristicTickCount % llmRatio === 0
    if (useLLM) {
      meme = await pickByLLM(activeRoomId, activeSource)
    }
    if (!meme) {
      meme = pickByHeuristic({
        roomId: activeRoomId,
        source: activeSource,
        memes: memesProvider?.() ?? [],
        recentDanmuText: getRecentDanmuTexts().join(' '),
      })
    }
    if (meme) {
      await sendOne(activeRoomId, meme)
    }
  } catch (err) {
    appendLog(`⚠️ 智驾 tick 异常：${err instanceof Error ? err.message : String(err)}`)
  } finally {
    scheduleNext(hzmDriveIntervalSec.value)
  }
}

function scheduleNext(baseSec: number): void {
  if (hzmDriveMode.value === 'off') {
    tickTimer = null
    return
  }
  const jitter = baseSec * (0.7 + Math.random() * 0.8)
  const delay = Math.max(MIN_TICK_DELAY_MS, Math.round(jitter * 1000))
  tickTimer = setTimeout(() => {
    void tick()
  }, delay)
}

/**
 * 启动智驾。调用方需要传入：
 *  - 当前房间号
 *  - 该房间的梗源配置
 *  - 一个回调，每次 tick 拿到当前可用梗列表（避免我们自己再拉一次）
 *
 * 重复调用安全：会先 stop 再 start。
 */
export async function startHzmAutoDrive(opts: {
  source: MemeSource
  getMemes: () => LaplaceMemeWithSource[]
}): Promise<void> {
  stopHzmAutoDrive()

  let roomId: number
  try {
    roomId = await ensureRoomId()
  } catch (err) {
    notifyUser('error', '智驾启动失败：无法获取房间号', err instanceof Error ? err.message : String(err))
    return
  }
  if (roomId !== opts.source.roomId) {
    notifyUser('warning', `当前房间 (${roomId}) 与梗源配置 (${opts.source.roomId}) 不匹配，智驾未启动`)
    return
  }

  activeRoomId = roomId
  activeSource = opts.source
  memesProvider = opts.getMemes

  unsubscribe = subscribeDanmaku({
    onMessage: ev => {
      if (!ev.text) return
      recentDanmu.push({ ts: Date.now(), text: ev.text })
      if (recentDanmu.length > RECENT_DANMU_MAX) {
        recentDanmu.splice(0, recentDanmu.length - RECENT_DANMU_MAX)
      }
    },
  })

  appendLog(
    `🤖 智能辅助驾驶已启动（mode=${hzmDriveMode.value}，dryRun=${hzmDryRun.value ? '开' : '关'}）— 独轮车工具无罪，请合理使用`
  )
  // 立即跑第一 tick（不等 jitter）
  void tick()
}

/** 停止智驾。多次调用安全。 */
export function stopHzmAutoDrive(): void {
  if (tickTimer) {
    clearTimeout(tickTimer)
    tickTimer = null
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  resetRuntime()
}

/** 测试用：当前监听到的最近弹幕。 */
export function _getRecentDanmuForTests(): DanmuRecord[] {
  return [...recentDanmu]
}
