/**
 * SBHZM 上游聚合。
 *
 * 与 LAPLACE 不同:SBHZM(sbhzm.cn)分页贵、没 ETag、没边缘缓存。直接在响应路径
 * fetch 每次都要 ~10 页 × 100ms。所以策略改成 cron 拉一次写 D1,响应路径只读 D1。
 *
 * 数据流:
 *  1. wrangler.jsonc 里 cron `* / 15 * * * *` 触发 src/index.ts 的 scheduled handler
 *  2. handler 调 `pullSbhzmIntoCache()` 分页拉 + 写 upstream_sbhzm_cache 一行
 *  3. GET /memes 调 `readSbhzmFromCache()` 读最新一行,反序列化返回
 *
 * 旧的 cache 行不主动删 —— D1 行级 KB 级,跑一年也才几 MB。Phase D 再加 GC 也不迟。
 */

import type { CbMeme, CbTag } from '../types'

const SBHZM_LIST = 'https://sbhzm.cn/api/public/memes'
const PAGE_SIZE = 100
const MAX_PAGES = 50
const CACHE_FRESH_HOURS = 24 // 如果最新一行 > 24h 旧,认为 cron 已经挂了,降级 ok=false。

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
 * 由 cron 调用:分页拉 SBHZM 全量 → 归一 → 写一行到 upstream_sbhzm_cache。
 * 失败不抛(记录到 console),让下次 cron 周期重试。
 */
export async function pullSbhzmIntoCache(db: D1Database): Promise<{ count: number; ok: boolean }> {
  const collected: RawSbhzmMeme[] = []
  const seen = new Set<string | number>()
  let knownTotal: number | null = null
  for (let page = 1; page <= MAX_PAGES; page++) {
    let resp: Response
    try {
      resp = await fetch(`${SBHZM_LIST}?page=${page}&page_size=${PAGE_SIZE}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      })
    } catch (err) {
      console.warn('[sbhzm cron] page', page, 'network error', err)
      break
    }
    if (!resp.ok) {
      console.warn('[sbhzm cron] page', page, 'http', resp.status)
      break
    }
    let body: unknown
    try {
      body = await resp.json()
    } catch {
      break
    }
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

  if (collected.length === 0) return { count: 0, ok: false }

  const normalized = collected.map(normalizeSbhzmMeme).filter((m): m is CbMeme => m !== null)

  // 写一行新快照。旧行保留,可用于回溯/调试;如果未来积累过多再加 GC。
  await db.prepare('INSERT INTO upstream_sbhzm_cache (json) VALUES (?)').bind(JSON.stringify(normalized)).run()

  return { count: normalized.length, ok: true }
}

/**
 * GET /memes 调用:从 D1 读最新一行 SBHZM 快照。
 *
 * 返回 ok=false 的两种情况:
 *  - 缓存表完全为空(冷启动还没跑过 cron)
 *  - 最新一行已经超过 CACHE_FRESH_HOURS 没更新(cron 大概率挂了)
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
