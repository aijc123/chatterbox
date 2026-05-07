/**
 * live-meme-radar 客户端。
 *
 * radar 是 chatterbox 的传感器侧项目:消化 50-100 个直播间的 ws 流,聚类成
 * 跨房间 meme,把"trending"信号开放出来给 userscript 用。
 *
 * Week 8 范围:
 *  - queryClusterRank(text, roomId?) — auto-blend 软门用,问"这条文本属于
 *    radar 已经识别的某簇吗,且该簇当下 isTrending 吗"。
 *  - fetchTodayRadar(limit?) — 备用列表 view(可能用于 settings 调试或将来
 *    UI),拉今天 trending 的簇。
 *  - fetchTopAmplifiers(area?) — 同上,拉"早期跟进"主播榜。
 *  - reportRadarObservation(payload) — Week 9-10 才上线。endpoint 还不存在
 *    的情况下打开 toggle 也只会静默失败(opt-in,默认关闭)。
 *
 * 走 GM_xmlhttpRequest 而不是 `fetch`:虽然 radar Worker 设了
 * `Access-Control-Allow-Origin: *`,但走 GM 与 cb-backend-client / sbhzm-client
 * 一致,以后想给 radar 加身份/速率限制也能复用同一条管线;调试时也能直接打
 * `http://localhost:8788`(浏览器 fetch 跨 protocol 会被 mixed-content 拒绝)。
 *
 * radar URL 必须在 `vite.config.ts` 的 `connect` 列表里,vite-plugin-monkey
 * 据此生成 `// @connect`。
 */

import { BASE_URL } from './const'
import { type GmFetchResponse, gmFetch } from './gm-fetch'
import { appendLog } from './log'
import { radarBackendUrlOverride } from './store-radar'

// ─── 类型定义(与 live-meme-radar/server/src/types.ts 对齐) ─────────────────
// 这些类型是从 radar 服务端 types.ts 复制过来的,故意不 cross-import:
// chatterbox 是 userscript,radar 是 Worker,两边 build/deploy 节奏完全独立,
// 编译期耦合反而会让 chatterbox 的 type-check 卡在 radar 的 d.ts 上。

/** 簇的对外摘要(列表页用)。 */
export interface RadarClusterSummary {
  id: number
  representativeText: string
  memberCount: number
  distinctRoomCount: number
  distinctUidCount: number
  heatScore: number
  slopeScore: number
  firstSeenTs: number
  lastSeenTs: number
  status: 'active' | 'dormant' | 'retired'
}

/** /radar/cluster-rank 返回:userscript 跟车决策用。 */
export interface ClusterRankResult {
  clusterId: number
  similarity: number
  currentRankToday: number | null
  heatScore: number
  slopeScore: number
  isTrending: boolean
}

/** Live Amplifier 排行的一行(主播视角)。 */
export interface AmplifierSummary {
  channelUid: number
  channelName: string | null
  avgLagSeconds: number
  amplificationCount24h: number
  trendScore: number
}

// ─── URL 解析 ───────────────────────────────────────────────────────────────

/**
 * 校验并归一化 radarBackendUrlOverride。和 cb-backend-client.normalizeCbBackendUrl
 * 同规则:只放行 https + http://(localhost|127.0.0.1|[::1])。失败返回 ''。
 *
 * 复制粘贴而不抽公共 helper:两个签名本来就长得一模一样,但 cb 和 radar 是两
 * 个独立项目,以后任一侧改规则都不会污染另一侧。
 */
export function normalizeRadarBackendUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return ''
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''
  if (parsed.protocol === 'http:') {
    const host = parsed.hostname
    const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
    const isLoopback = bare === 'localhost' || bare === '127.0.0.1' || bare === '::1'
    if (!isLoopback) return ''
  }
  return trimmed
}

/**
 * 解析当前生效的 radar URL。先看 override,失败回退到 BASE_URL.RADAR_BACKEND。
 * 末尾保证不带斜杠。
 */
export function getRadarBackendBaseUrl(): string {
  const overrideRaw = radarBackendUrlOverride.value
  const overrideOk = normalizeRadarBackendUrl(overrideRaw)
  if (overrideOk) return overrideOk
  return BASE_URL.RADAR_BACKEND.replace(/\/+$/, '')
}

// ─── /radar/cluster-rank ────────────────────────────────────────────────────

/**
 * 给 auto-blend 的"软门":问 radar"这条候选属于已知 trending 簇吗"。
 *
 * 服务端形态(摘自 radar/src/routes/radar-public.ts):
 *  - 入参:`text`(必),`room_id`(目前后端忽略,仍然带上以备将来 per-room 过滤)
 *  - 出参 200:`{ matched: true, ...ClusterRankResult }` 或
 *               `{ matched: false, similarity: 0, isTrending: false }`
 *  - 出参 4xx/5xx → 客户端按 null 处理,调用方应 fallback 到老逻辑
 *
 * 任何错误一律 return null,绝不抛(auto-blend 不能因为雷达挂了就停摆)。
 */
export async function queryClusterRank(text: string, roomId?: number): Promise<ClusterRankResult | null> {
  const trimmed = text.trim()
  if (!trimmed) return null
  // radar 服务端会拒掉 >500 的 query,客户端先短路一下避免无谓 round-trip。
  if (trimmed.length > 500) return null

  const base = getRadarBackendBaseUrl()
  if (!base) return null

  const params = new URLSearchParams()
  params.set('text', trimmed)
  if (typeof roomId === 'number' && Number.isFinite(roomId) && roomId > 0) {
    params.set('room_id', String(roomId))
  }
  const url = `${base}/radar/cluster-rank?${params.toString()}`

  let resp: GmFetchResponse
  try {
    resp = await gmFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      // 比 fetchCbMergedMemes(10s)更短:这是同步阻塞 auto-blend 决策路径,不能
      // 让一次慢请求拖住"刚刷起来"那一波的发送时机。
      timeoutMs: 4_000,
    })
  } catch {
    return null
  }
  if (!resp.ok) return null

  let body: {
    matched?: unknown
    clusterId?: unknown
    similarity?: unknown
    currentRankToday?: unknown
    heatScore?: unknown
    slopeScore?: unknown
    isTrending?: unknown
  }
  try {
    body = resp.json()
  } catch {
    return null
  }

  if (body.matched !== true) return null
  if (typeof body.clusterId !== 'number') return null

  return {
    clusterId: body.clusterId,
    similarity: typeof body.similarity === 'number' ? body.similarity : 0,
    currentRankToday: typeof body.currentRankToday === 'number' ? body.currentRankToday : null,
    heatScore: typeof body.heatScore === 'number' ? body.heatScore : 0,
    slopeScore: typeof body.slopeScore === 'number' ? body.slopeScore : 0,
    isTrending: body.isTrending === true,
  }
}

// ─── /radar/clusters/today ──────────────────────────────────────────────────

/**
 * 拉今天的 trending 簇列表。返回空数组(而不是 throw)以便调用方用 ??[] 风格。
 * 网络/JSON 失败一律返回 [],并打一行 log。
 *
 * 默认服务端 cross_room_only=true,我们不暴露 include_single_room 选项给
 * userscript —— single-room 噪声对 chatterbox 的"跨房间 meme 提示"没价值。
 */
export async function fetchTodayRadar(limit = 20): Promise<RadarClusterSummary[]> {
  const base = getRadarBackendBaseUrl()
  if (!base) return []

  const n = Math.floor(Number(limit))
  const safeLimit = Number.isFinite(n) ? Math.max(1, Math.min(100, n)) : 20
  const url = `${base}/radar/clusters/today?limit=${safeLimit}`

  try {
    const resp = await gmFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: 8_000,
    })
    if (!resp.ok) {
      appendLog(`⚠️ live-meme-radar HTTP ${resp.status}(/clusters/today)`)
      return []
    }
    const body = resp.json<{ items?: unknown }>()
    if (!Array.isArray(body.items)) return []
    return body.items.filter(isRadarClusterSummary)
  } catch (err) {
    appendLog(`⚠️ live-meme-radar 网络错误(/clusters/today):${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

function isRadarClusterSummary(x: unknown): x is RadarClusterSummary {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'number' && typeof r.representativeText === 'string' && typeof r.memberCount === 'number'
}

// ─── /radar/amplifiers/today ────────────────────────────────────────────────

/**
 * 拉"今天最早跟进"主播榜。area 留空 = 全 area。
 * 错误一律 [](与 fetchTodayRadar 一致)。
 */
export async function fetchTopAmplifiers(area?: string): Promise<AmplifierSummary[]> {
  const base = getRadarBackendBaseUrl()
  if (!base) return []

  const params = new URLSearchParams()
  if (area?.trim()) params.set('area', area.trim())
  const qs = params.toString()
  const url = `${base}/radar/amplifiers/today${qs ? `?${qs}` : ''}`

  try {
    const resp = await gmFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: 8_000,
    })
    if (!resp.ok) {
      appendLog(`⚠️ live-meme-radar HTTP ${resp.status}(/amplifiers/today)`)
      return []
    }
    const body = resp.json<{ items?: unknown }>()
    if (!Array.isArray(body.items)) return []
    return body.items.filter(isAmplifierSummary)
  } catch (err) {
    appendLog(`⚠️ live-meme-radar 网络错误(/amplifiers/today):${err instanceof Error ? err.message : String(err)}`)
    return []
  }
}

function isAmplifierSummary(x: unknown): x is AmplifierSummary {
  if (!x || typeof x !== 'object') return false
  const r = x as Record<string, unknown>
  return typeof r.channelUid === 'number' && typeof r.amplificationCount24h === 'number'
}

// ─── /radar/report (Week 9-10 才上线) ───────────────────────────────────────

/**
 * 双源数据上报:把本房间窗口内的聚合观察值送给 radar。
 *
 * !! endpoint 在 radar Worker 上还没实现 — 计划在 Week 9-10 上线 !!
 * 在那之前打开 radarReportEnabled 也只会拿到 404 然后被静默吞掉。
 *
 * 隐私契约:
 *  - sampledTexts 是本房间窗口内 dedupe 后的文本数组(每条已经在 ws 流里被
 *    至少 N 个不同 uid 说过 — 调用方负责保证),不带逐条 timestamp/uid
 *  - 调用方如果一定要传 uid,先 SHA-256(salt + uid),不传明文
 *  - 失败一律静默(fire-and-forget),不能影响 auto-blend 主流程
 */
export interface RadarReportPayload {
  roomId: number
  channelUid: number
  /** 已 dedupe 的样本短文本(单条不超过 200 字),建议 ≤30 条 */
  sampledTexts: string[]
  windowStartTs: number
  windowEndTs: number
}

export async function reportRadarObservation(payload: RadarReportPayload): Promise<void> {
  const base = getRadarBackendBaseUrl()
  if (!base) return
  if (!Number.isFinite(payload.roomId) || payload.roomId <= 0) return
  if (!Array.isArray(payload.sampledTexts) || payload.sampledTexts.length === 0) return

  // 客户端兜底裁剪 — 哪怕调用方忘了,也不让大 payload 滚出去。
  const sampled = payload.sampledTexts
    .filter(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 200)
    .slice(0, 30)
  if (sampled.length === 0) return

  const body = {
    roomId: payload.roomId,
    channelUid: payload.channelUid,
    sampledTexts: sampled,
    windowStartTs: payload.windowStartTs,
    windowEndTs: payload.windowEndTs,
  }

  try {
    await gmFetch(`${base}/radar/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      timeoutMs: 8_000,
    })
    // 完全不看结果:endpoint 还没上线时一律 404,正确实现后我们也不需要回执。
  } catch {
    // 静默
  }
}
