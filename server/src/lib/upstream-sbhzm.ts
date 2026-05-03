/**
 * SBHZM 上游聚合。
 *
 * 与 LAPLACE 不同:SBHZM(sbhzm.cn)分页贵、没 ETag、没边缘缓存。Phase D 之前是
 * 后端 cron 每 15 分钟主动扒整库写 D1 cache 表;Phase D.1 之后转成"前端为主、
 * 后端兜底"模型:
 *
 *  1. **前端是保鲜主力** —— userscript 用户每次打开梗库面板时,通过
 *     `mirrorToCbBackend` 把 SBHZM 首页(~100 条最新)推到 POST /memes/bulk-mirror,
 *     后端 INSERT OR IGNORE 进 memes 表,自然吸纳新增内容。
 *  2. **后端 cron 是兜底** —— 每 6 小时跑一次 `pullSbhzmIfStale`,先查
 *     contributions 表:若过去 12 小时有任何 actor != 'cron' 的 mirror 记录,
 *     就跳过(说明用户活跃,前端正在干活)。否则才低频拉首 N 页直接写
 *     memes 表 —— 跟 bulk-mirror 走同一路径,不再写 upstream_sbhzm_cache。
 *  3. **upstream_sbhzm_cache 表被退役** —— 不再写新行,旧行由 GC 在 7 天后清掉;
 *     `readSbhzmFromCache` 留作冷启动期(memes 表里 SBHZM 数据少)的兜底读路径,
 *     但权重越来越低。
 *
 * 设计原因(为什么前端比后端 cron 更好):
 *  - SBHZM 站长视角看到的是真实用户的浏览器请求(分散 IP、自然分布),而不是
 *    Cloudflare 出口 IP 每 15 分钟扫一次全库 —— 显著降低被 SBHZM 站方屏蔽的风险
 *  - 前端的 30 分钟内存缓存 + 后端 60 次/小时/IP 限速天然限流
 *  - 后端只在"客户端没在线"的时候才出手,流量峰值平摊到全天
 */

import type { CbMeme, CbTag } from '../types'

import { contentHash } from './hash'

const SBHZM_LIST = 'https://sbhzm.cn/api/public/memes'
const PAGE_SIZE = 100
const DEFAULT_MIRROR_PAGES = 10
const ADMIN_FORCE_PAGES = 50
const STALE_THRESHOLD_HOURS = 12
const CACHE_FRESH_HOURS = 24 // 老 cache 表的旧逻辑保留:>24h 旧 → ok=false
const CACHE_GC_RETAIN_DAYS = 7

interface RawSbhzmMeme {
  id?: number | string
  content?: string
  tags?: Array<string | { name?: string; emoji?: string }>
  copy_count?: number
  created_at?: string
  updated_at?: string
}

interface PageResponse {
  items?: RawSbhzmMeme[]
  data?: RawSbhzmMeme[] | { items?: RawSbhzmMeme[] }
  results?: RawSbhzmMeme[]
  total?: number
}

const TAG_COLOR_NAMES = ['red', 'yellow', 'fuchsia', 'emerald', 'blue', 'orange', 'purple', 'pink', 'cyan', 'green']
function hashTagColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return TAG_COLOR_NAMES[Math.abs(h) % TAG_COLOR_NAMES.length] ?? 'blue'
}

function normalizeTag(rawTag: string | { name?: string; emoji?: string }): CbTag {
  const name = (typeof rawTag === 'string' ? rawTag : (rawTag.name ?? '')).trim()
  const emoji = typeof rawTag === 'string' ? null : (rawTag.emoji ?? null)
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return {
    id: -Math.abs(h) - 1,
    name,
    color: hashTagColor(name),
    emoji,
    icon: null,
    description: null,
    count: 0,
  }
}

function normalizeSbhzmMeme(raw: RawSbhzmMeme): CbMeme | null {
  const content = (raw.content ?? '').trim()
  if (!content) return null
  let synthId: number
  const rid = typeof raw.id === 'number' ? raw.id : Number(raw.id)
  if (Number.isFinite(rid) && rid > 0) {
    synthId = -rid
  } else {
    let h = 0
    for (let i = 0; i < content.length; i++) h = ((h << 5) - h + content.charCodeAt(i)) | 0
    synthId = -Math.abs(h) - 1_000_000
  }
  const tags = Array.isArray(raw.tags) ? raw.tags.map(normalizeTag).filter(t => t.name) : []
  const created = raw.created_at ?? new Date(0).toISOString()
  return {
    id: synthId,
    uid: 0,
    content,
    tags,
    copyCount: raw.copy_count ?? 0,
    // SBHZM 不返回 lastCopiedAt;前端 sbhzm-client 用 created_at 当代理(否则 NULL
    // 全沉底)。后端 mirror 同一选择。
    lastCopiedAt: created || null,
    createdAt: created,
    updatedAt: raw.updated_at ?? created,
    username: null,
    avatar: null,
    room: null,
    _source: 'sbhzm',
  }
}

function extractList(body: unknown): { items: RawSbhzmMeme[]; total: number | null } {
  if (Array.isArray(body)) return { items: body, total: null }
  if (body && typeof body === 'object') {
    const obj = body as PageResponse
    const total = typeof obj.total === 'number' ? obj.total : null
    if (Array.isArray(obj.items)) return { items: obj.items, total }
    if (Array.isArray(obj.data)) return { items: obj.data, total }
    if (Array.isArray(obj.results)) return { items: obj.results, total }
    if (obj.data && typeof obj.data === 'object' && Array.isArray((obj.data as { items?: unknown }).items)) {
      return { items: (obj.data as { items: RawSbhzmMeme[] }).items, total }
    }
  }
  return { items: [], total: null }
}

/**
 * 分页拉取 SBHZM 列表。失败时把已收集的项原样返回(让 caller 决定要不要写)。
 *
 * fetchImpl 是为测试预留的注入点;生产路径走全局 fetch。
 */
async function fetchSbhzmPages(
  maxPages: number,
  fetchImpl: typeof fetch = fetch
): Promise<{ items: RawSbhzmMeme[]; ok: boolean }> {
  const collected: RawSbhzmMeme[] = []
  const seen = new Set<string | number>()
  let knownTotal: number | null = null
  let anyPageSucceeded = false

  for (let page = 1; page <= maxPages; page++) {
    let resp: Response
    try {
      resp = await fetchImpl(`${SBHZM_LIST}?page=${page}&page_size=${PAGE_SIZE}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      })
    } catch (err) {
      console.warn('[sbhzm] page', page, 'network error', err)
      break
    }
    if (!resp.ok) {
      console.warn('[sbhzm] page', page, 'http', resp.status)
      break
    }
    let body: unknown
    try {
      body = await resp.json()
    } catch {
      break
    }
    anyPageSucceeded = true
    const { items, total } = extractList(body)
    if (total !== null) knownTotal = total
    if (items.length === 0) break
    let added = 0
    for (const item of items) {
      if (!item?.content) continue
      const key = item.id ?? item.content
      if (seen.has(key)) continue
      seen.add(key)
      collected.push(item)
      added++
    }
    if (knownTotal !== null && collected.length >= knownTotal) break
    if (added === 0) break
  }

  return { items: collected, ok: anyPageSucceeded }
}

export interface PullMirrorOptions {
  /** 拉取的最大页数。默认 10(=最近 1000 条);admin 强制刷新时传 50。 */
  pages?: number
  /** 写入 contributions 审计日志的 actor。默认 'cron';admin 路由传管理员 label。 */
  actor?: string
  /** 测试注入点:不传则用全局 fetch。 */
  fetchImpl?: typeof fetch
}

export interface PullMirrorResult {
  ok: boolean
  fetched: number
  inserted: number
  skipped: number
  pages: number
}

/**
 * 直接把 SBHZM 上游内容 INSERT OR IGNORE 进 memes 表 —— 跟 bulk-mirror 走同一路径,
 * 不再写 upstream_sbhzm_cache 表。
 *
 * 失败(任一页都没成功 fetch 到)时仍写一行 contributions(`ok=false` 标记),
 * 让 liveness gate 能据此判断"刚才尝试过但拉不到"。
 */
export async function pullSbhzmIntoMirror(db: D1Database, options: PullMirrorOptions = {}): Promise<PullMirrorResult> {
  const maxPages = options.pages ?? DEFAULT_MIRROR_PAGES
  const actor = options.actor ?? 'cron'

  const { items: collected, ok: fetchOk } = await fetchSbhzmPages(maxPages, options.fetchImpl)
  const normalized = collected.map(normalizeSbhzmMeme).filter((m): m is CbMeme => m !== null)

  if (normalized.length === 0) {
    await db
      .prepare(`INSERT INTO contributions (action, actor, payload_json) VALUES ('mirror', ?, ?)`)
      .bind(actor, JSON.stringify({ source: 'sbhzm', ok: fetchOk, fetched: 0, inserted: 0, pages: maxPages }))
      .run()
    return { ok: false, fetched: 0, inserted: 0, skipped: 0, pages: maxPages }
  }

  const reviewedAt = new Date().toISOString()
  const stmts: D1PreparedStatement[] = []
  for (const meme of normalized) {
    const hash = await contentHash(meme.content)
    const externalIdRaw = -meme.id // normalizeSbhzmMeme 把上游 id 取负;还原成正数
    const externalId = externalIdRaw > 0 && externalIdRaw < 1_000_000 ? externalIdRaw : null
    stmts.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO memes
             (uid, content, status, content_hash, source_origin, external_id,
              copy_count, last_copied_at, username, avatar, created_at, updated_at, reviewed_at)
           VALUES (0, ?, 'approved', ?, 'sbhzm', ?, ?, ?, NULL, NULL, ?, ?, ?)`
        )
        .bind(
          meme.content,
          hash,
          externalId,
          meme.copyCount,
          meme.lastCopiedAt,
          meme.createdAt,
          meme.updatedAt,
          reviewedAt
        )
    )
  }

  let inserted = 0
  if (stmts.length > 0) {
    const results = await db.batch(stmts)
    for (const r of results) {
      if (r.meta?.changes && r.meta.changes > 0) inserted++
    }
  }
  const skipped = normalized.length - inserted

  await db
    .prepare(`INSERT INTO contributions (action, actor, payload_json) VALUES ('mirror', ?, ?)`)
    .bind(
      actor,
      JSON.stringify({ source: 'sbhzm', ok: true, fetched: normalized.length, inserted, skipped, pages: maxPages })
    )
    .run()

  return { ok: true, fetched: normalized.length, inserted, skipped, pages: maxPages }
}

export interface PullIfStaleOptions {
  /** 测试注入点:不传则用全局 fetch。 */
  fetchImpl?: typeof fetch
  /** 测试注入点:覆盖默认的 STALE_THRESHOLD_HOURS。 */
  staleThresholdHours?: number
}

export interface PullIfStaleResult {
  skipped: boolean
  reason?: 'recent_user_activity' | 'fetch_failed'
  recentActivity?: { actor: string; createdAt: string }
  pull?: PullMirrorResult
}

/**
 * Cron 入口:先查 contributions 表,若过去 N 小时(默认 12h)内有任何
 * **非 cron 自身**的 mirror 活动,则跳过本次拉取(用户活跃,前端正在贡献,
 * 后端不必出手)。否则调 pullSbhzmIntoMirror 拉首 10 页兜底。
 *
 * 同时清理 7 天前的旧 upstream_sbhzm_cache 行(每次 cron 顺便 GC)。
 */
export async function pullSbhzmIfStale(db: D1Database, options: PullIfStaleOptions = {}): Promise<PullIfStaleResult> {
  const hours = options.staleThresholdHours ?? STALE_THRESHOLD_HOURS
  const since = new Date(Date.now() - hours * 3600_000).toISOString()

  // 顺便 GC 旧 cache 行,每次 cron 跑一次。
  await gcOldSbhzmCache(db)

  // 找最近一条非 cron 的 SBHZM mirror 活动。payload_json 用 LIKE 滤;
  // action+created_at 有 index,LIKE 在小集合上做剩余过滤,够用。
  const recent = await db
    .prepare(
      `SELECT actor, created_at FROM contributions
       WHERE action = 'mirror'
         AND actor != 'cron'
         AND created_at >= ?
         AND payload_json LIKE '%"source":"sbhzm"%'
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(since)
    .first<{ actor: string; created_at: string }>()

  if (recent) {
    return {
      skipped: true,
      reason: 'recent_user_activity',
      recentActivity: { actor: recent.actor, createdAt: recent.created_at },
    }
  }

  const pull = await pullSbhzmIntoMirror(db, { fetchImpl: options.fetchImpl })
  return {
    skipped: false,
    reason: pull.ok ? undefined : 'fetch_failed',
    pull,
  }
}

/** 删除 retainDays 天前的 upstream_sbhzm_cache 行;返回删除数。 */
export async function gcOldSbhzmCache(db: D1Database, retainDays = CACHE_GC_RETAIN_DAYS): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - retainDays * 24 * 3600_000).toISOString()
  const result = await db.prepare('DELETE FROM upstream_sbhzm_cache WHERE fetched_at < ?').bind(cutoff).run()
  return { deleted: result.meta.changes ?? 0 }
}

/**
 * 旧 cache 表的读路径。Phase D.1 之后不再写新行,但旧行还在(GC 退役 7 天),
 * `GET /memes` 仍合并这些数据作冷启动兜底。等 memes 表里 SBHZM 数据足够覆盖,
 * 可在未来 migration 里删表。
 *
 * 返回 ok=false 的两种情况:
 *  - 缓存表完全为空
 *  - 最新一行已经超过 CACHE_FRESH_HOURS 没更新
 */
export async function readSbhzmFromCache(db: D1Database): Promise<{ items: CbMeme[]; ok: boolean }> {
  const row = await db
    .prepare('SELECT json, fetched_at FROM upstream_sbhzm_cache ORDER BY fetched_at DESC LIMIT 1')
    .first<{ json: string; fetched_at: string }>()
  if (!row) return { items: [], ok: false }

  const ageHours = (Date.now() - new Date(row.fetched_at).getTime()) / 3600_000
  if (!Number.isFinite(ageHours) || ageHours > CACHE_FRESH_HOURS) {
    return { items: [], ok: false }
  }

  try {
    const items = JSON.parse(row.json) as CbMeme[]
    return { items: Array.isArray(items) ? items : [], ok: true }
  } catch {
    return { items: [], ok: false }
  }
}

/** Admin 强制刷新用 —— 跳过 liveness gate,拉满 50 页。 */
export const ADMIN_REFRESH_PAGES = ADMIN_FORCE_PAGES
