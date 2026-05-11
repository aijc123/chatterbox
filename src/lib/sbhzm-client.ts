/**
 * sbhzm.cn 烂梗库 API 客户端。
 *
 * 实测的 API 形态（来自社区逆向）：
 *  - `GET /api/public/memes?page=N&page_size=N` → `{ items, total, page, page_size }`
 *  - `GET /api/public/memes/random` → 单条随机梗
 *  - `GET /api/public/tags` → `[{ id, name }, ...]` 全量 tag 字典
 *  - `POST /api/admin/memes` JSON `{ content, tag_ids: number[] }` → 200 + 新插入对象
 *    （路径写着 admin 但实际未鉴权——是站点的 broken-access-control，我们利用之
 *    把"自动挖掘待贡献梗"直接上传，不用人工 window.open 网页）
 *
 * - 走 GM_xmlhttpRequest（gm-fetch.ts），因为 sbhzm.cn 不允许浏览器 CORS。
 * - 列表分页去重 + 按 copy_count 降序，归一为 LAPLACE `MemeWithUser` 形态（id 强制
 *   合成成负数防撞 LAPLACE 的正 id）；30 分钟内存缓存。
 */

import type { LaplaceInternal } from '@laplace.live/internal'

import type { MemeSource } from './meme-sources'

import { BASE_URL } from './const'
import { type GmFetchResponse, gmFetch } from './gm-fetch'
import { appendLog, notifyUser } from './log'

type LaplaceMeme = LaplaceInternal.HTTPS.Workers.MemeWithUser

/** sbhzm 服务返回的原始梗形态（推测 + 兼容多种 wrapping）。 */
interface RawSbhzmMeme {
  id?: number | string
  content?: string
  tags?: Array<string | { name?: string; emoji?: string }>
  copy_count?: number
  created_at?: string
  updated_at?: string
}

/**
 * 把 tag 名稳定 hash 到 LAPLACE 的颜色调色板的某个 key（如 'red' / 'blue'）。
 * 同一 tag 名总是落到同一个颜色，这样多次刷新视觉一致。
 */
const TAG_COLOR_NAMES = ['red', 'yellow', 'fuchsia', 'emerald', 'blue', 'orange', 'purple', 'pink', 'cyan', 'green']
function hashTagColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return TAG_COLOR_NAMES[Math.abs(h) % TAG_COLOR_NAMES.length] ?? 'blue'
}

/**
 * 把 sbhzm tag 字符串归一成 LAPLACE 的 TagWithCount 形态。
 * tag id 用名字 hash 到一个负数（防止和 LAPLACE 真实 tag id 撞）。
 */
function normalizeTag(rawTag: string | { name?: string; emoji?: string }): LaplaceInternal.HTTPS.Workers.TagWithCount {
  const name = (typeof rawTag === 'string' ? rawTag : (rawTag.name ?? '')).trim()
  const emoji = typeof rawTag === 'string' ? null : (rawTag.emoji ?? null)
  // 用名字 hash 生成稳定负 id；同名 tag 总是同一 id。
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  const tagId = -Math.abs(h) - 1 // 保证负数，且 ≠ 0
  return {
    id: tagId,
    name,
    color: hashTagColor(name),
    emoji,
    icon: null,
    description: null,
    count: 0,
  }
}

/**
 * 把 sbhzm 返回的原始一条归一成 LAPLACE MemeWithUser。
 * - id 转成 **负数** 防撞 LAPLACE 正 id。
 * - 缺失字段填空字符串/null/0。
 * - 注入 `_source: 'sbhzm'` 用于后续 UI 来源 badge（通过类型扩展声明）。
 */
function normalizeMeme(raw: RawSbhzmMeme): SbhzmMeme | null {
  const content = (raw.content ?? '').trim()
  if (!content) return null

  // 合成负数 id：优先用 raw.id，否则 hash content
  let synthId: number
  const rid = typeof raw.id === 'number' ? raw.id : Number(raw.id)
  if (Number.isFinite(rid) && rid > 0) {
    synthId = -rid
  } else {
    let h = 0
    for (let i = 0; i < content.length; i++) h = ((h << 5) - h + content.charCodeAt(i)) | 0
    synthId = -Math.abs(h) - 1_000_000 // 留给真实 id 的 -1 ~ -10^6 空间
  }

  const tags = Array.isArray(raw.tags) ? raw.tags.map(normalizeTag).filter(t => t.name) : []

  // sbhzm API 不返回 last_copied_at，但 UI 的「最近使用」排序会按 lastCopiedAt 降序。
  // 直接用 null 会让所有 sbhzm 条都排到最底（~1700 条堆底）——选了「最近使用」的用户
  // 几乎看不到任何 sbhzm 内容，体验像"sbhzm 全空"。
  // 折中方案：用 `created_at` 当 `lastCopiedAt` 的代理。"我们不知道谁最近复制了这条梗，
  // 但创建时间至少是个时间戳，最新加入的梗相对更可能被频繁使用"。
  const created = raw.created_at ?? ''
  const meme: SbhzmMeme = {
    id: synthId,
    uid: 0,
    content,
    tags,
    copyCount: raw.copy_count ?? 0,
    lastCopiedAt: created || null,
    createdAt: created,
    updatedAt: raw.updated_at ?? created,
    username: null,
    avatar: null,
    room: null,
    _source: 'sbhzm',
  }
  return meme
}

/**
 * 在标准 MemeWithUser 上扩一个 `_source` 标记区分来源。
 * memes-list.tsx 用这个字段渲染 badge（`L` / `H`）。
 * 不写到原 LAPLACE Meme 上，只用于本地视图层。
 */
export interface SbhzmMeme extends LaplaceMeme {
  _source: 'sbhzm'
}

export interface LaplaceMemeWithSource extends LaplaceMeme {
  _source?: 'laplace' | 'sbhzm' | 'cb'
}

const PAGE_SIZE = 100
const MAX_PAGES = 50
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const TAGS_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CacheEntry {
  ts: number
  data: SbhzmMeme[]
}
const memoryCache = new Map<string, CacheEntry>()

function isList(body: unknown): body is RawSbhzmMeme[] {
  return Array.isArray(body)
}

interface PageWithTotal {
  items: RawSbhzmMeme[]
  total: number | null
}

/**
 * 兼容多种返回形态：
 *  - 实测 sbhzm：`{ items, total, page, page_size }`
 *  - 兜底：`[...]` / `{ data: [...] }` / `{ data: { data: [...] } }` / `{ results: [...] }`
 * 同时尽量提取 `total`，让 fetchAllPages 能精准结束（不再依赖 `len < PAGE_SIZE` 这种脆弱信号）。
 */
function extractListAndTotal(body: unknown): PageWithTotal {
  if (isList(body)) return { items: body, total: null }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    const total = typeof obj.total === 'number' ? obj.total : null
    if (isList(obj.items)) return { items: obj.items, total }
    if (isList(obj.data)) return { items: obj.data, total }
    if (isList(obj.results)) return { items: obj.results, total }
    if (obj.data && typeof obj.data === 'object') {
      const inner = obj.data as Record<string, unknown>
      if (isList(inner.data)) return { items: inner.data, total }
      if (isList(inner.items)) return { items: inner.items, total }
    }
  }
  return { items: [], total: null }
}

async function fetchPage(source: MemeSource, page: number): Promise<PageWithTotal> {
  const url = `${source.listEndpoint}?page=${page}&page_size=${PAGE_SIZE}`
  let resp: GmFetchResponse
  try {
    resp = await gmFetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch (err) {
    appendLog(`⚠️ ${source.name} 第 ${page} 页网络错误，停止分页：${err instanceof Error ? err.message : String(err)}`)
    return { items: [], total: null }
  }
  if (!resp.ok) {
    appendLog(`⚠️ ${source.name} 第 ${page} 页 HTTP ${resp.status}，停止分页`)
    return { items: [], total: null }
  }
  try {
    return extractListAndTotal(resp.json())
  } catch (err) {
    appendLog(`⚠️ ${source.name} 第 ${page} 页 JSON 解析失败：${err instanceof Error ? err.message : String(err)}`)
    return { items: [], total: null }
  }
}

async function fetchAllPages(source: MemeSource): Promise<RawSbhzmMeme[]> {
  const collected: RawSbhzmMeme[] = []
  const seen = new Set<string | number>()
  let knownTotal: number | null = null
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, total } = await fetchPage(source, page)
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
    // 优先用 total 决定是否继续（最准）；否则回退到"页内整页都是旧的就停"。
    if (knownTotal !== null && collected.length >= knownTotal) break
    if (added === 0) break
  }
  return collected
}

async function fetchRandomFallback(source: MemeSource): Promise<RawSbhzmMeme[]> {
  if (!source.randomEndpoint) return []
  const BATCH = 20
  const tasks: Promise<RawSbhzmMeme | null>[] = []
  for (let i = 0; i < BATCH; i++) {
    tasks.push(
      gmFetch(source.randomEndpoint, { method: 'GET', headers: { Accept: 'application/json' } })
        .then(r => (r.ok ? (r.json() as RawSbhzmMeme) : null))
        .catch(() => null)
    )
  }
  const all = await Promise.all(tasks)
  return all.filter((x): x is RawSbhzmMeme => x?.content != null && x.content !== '')
}

/**
 * 拉取指定专属梗源的全部梗。
 * 返回归一后的 MemeWithUser-兼容数组（每条带 `_source: 'sbhzm'` 标记）。
 *
 * @param force 跳过缓存强制重拉。
 */
export async function fetchSbhzmMemes(source: MemeSource, force = false): Promise<SbhzmMeme[]> {
  const cacheKey = source.listEndpoint
  const cached = memoryCache.get(cacheKey)
  if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  let raw = await fetchAllPages(source)
  if (raw.length === 0) {
    raw = await fetchRandomFallback(source)
    if (raw.length === 0) {
      notifyUser('warning', `${source.name}：列表与随机接口都拉不到内容`)
    }
  }

  // 二次去重 + 归一 + 排序
  const byContent = new Map<string, RawSbhzmMeme>()
  for (const r of raw) {
    const c = (r.content ?? '').trim()
    if (!c) continue
    if (!byContent.has(c)) byContent.set(c, r)
  }
  const normalized = [...byContent.values()]
    .map(normalizeMeme)
    .filter((m): m is SbhzmMeme => m !== null)
    .sort((a, b) => b.copyCount - a.copyCount)

  memoryCache.set(cacheKey, { ts: Date.now(), data: normalized })
  return normalized
}

/**
 * 轻量保鲜探测:只拉首页(~100 条最新),让 userscript 用户每次打开梗库面板时
 * 顺手把 SBHZM 新增内容贡献给后端 mirror 库。Phase D.1 起这是后端 SBHZM 数据
 * 保鲜的**主要**机制,后端 cron 只在用户长期不在线时低频兜底。
 *
 * 与 `fetchSbhzmMemes` 的差异:
 *  - 只调一次 fetch(首页 100 条),不走 50 页全量分页
 *  - 不写入 `memoryCache`(否则全量 fetchSbhzmMemes 会拿到只有首页的"瘦版"缓存)
 *  - 失败不弹通知(背景任务,不打扰用户)
 *
 * 调用方负责把结果推到后端(`mirrorToCbBackend(items, 'sbhzm')`)。
 */
export async function fetchSbhzmFirstPage(source: MemeSource): Promise<SbhzmMeme[]> {
  const { items: raw } = await fetchPage(source, 1)
  if (raw.length === 0) return []
  const byContent = new Map<string, RawSbhzmMeme>()
  for (const r of raw) {
    const c = (r.content ?? '').trim()
    if (!c) continue
    if (!byContent.has(c)) byContent.set(c, r)
  }
  return [...byContent.values()].map(normalizeMeme).filter((m): m is SbhzmMeme => m !== null)
}

// ---------------------------------------------------------------------------
// Tag 字典 + 上传
// ---------------------------------------------------------------------------

export interface SbhzmTagInfo {
  id: number
  name: string
}

let tagsCache: { ts: number; data: SbhzmTagInfo[] } | null = null

/** 测试用：清空内存缓存。 */
export function _clearSbhzmCacheForTests(): void {
  memoryCache.clear()
  tagsCache = null
}

/**
 * 拉 sbhzm 全量 tag 字典。一小时内存缓存。
 * 失败抛错——调用方决定如何降级（一般是上传时失败回退成无 tag 上传）。
 */
export async function fetchSbhzmTags(): Promise<SbhzmTagInfo[]> {
  if (tagsCache && Date.now() - tagsCache.ts < TAGS_CACHE_TTL_MS) return tagsCache.data
  const resp = await gmFetch(BASE_URL.SBHZM_TAGS, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeoutMs: 10_000,
  })
  if (!resp.ok) throw new Error(`SBHZM tags HTTP ${resp.status}`)
  const json = resp.json<unknown>()
  // 同时容忍直接数组和包装对象。
  const arr = Array.isArray(json)
    ? (json as Array<{ id?: unknown; name?: unknown }>)
    : Array.isArray((json as { data?: unknown })?.data)
      ? (json as { data: Array<{ id?: unknown; name?: unknown }> }).data
      : []
  const tags = arr
    .filter(t => typeof t?.id === 'number' && typeof t?.name === 'string')
    .map(t => ({ id: t.id as number, name: (t.name as string).trim() }))
    .filter(t => t.name.length > 0)
  tagsCache = { ts: Date.now(), data: tags }
  return tags
}

/**
 * 用 source.keywordToTag 正则映射 + sbhzm 真实 tag 字典，
 * 给一段梗内容自动推导出最合适的一组 sbhzm tag id。
 *
 * 失败（拉不到 tag 字典 / 没有命中）返回空数组——上传时空 `tag_ids` 是合法值。
 */
export async function inferSbhzmTagIds(content: string, source: MemeSource): Promise<number[]> {
  const map = source.keywordToTag
  if (!map) return []
  const matchedNames = new Set<string>()
  for (const [pattern, tagName] of Object.entries(map)) {
    try {
      if (new RegExp(pattern).test(content)) matchedNames.add(tagName)
    } catch {
      // skip malformed regex
    }
  }
  if (matchedNames.size === 0) return []
  let allTags: SbhzmTagInfo[]
  try {
    allTags = await fetchSbhzmTags()
  } catch {
    return []
  }
  return allTags.filter(t => matchedNames.has(t.name)).map(t => t.id)
}

export interface SbhzmSubmitResult {
  /** 后端返回的新插入梗 id（自增整数）。 */
  id: number
  /** 后端回显的 content（一般等于请求的 content；用于做最终一致性校验）。 */
  content: string
}

/**
 * 把一条梗上传到 sbhzm 库。
 *
 * - 走 `POST /api/admin/memes`，无鉴权（站点 broken-access-control，已经实测）
 * - body：`{ content: string, tag_ids: number[] }`
 * - 成功：返回 `{ id, content }`
 * - 失败：抛错（调用方应 try/catch 并 toast）
 *
 * 与 LAPLACE 自动贡献流程**互不干扰**：本函数只负责往 sbhzm 推；想同步 LAPLACE
 * 还得另走 LAPLACE 的"复制+贡献"按钮（保留 window.open 流程）。
 */
export async function submitSbhzmMeme(content: string, tagIds: number[] = []): Promise<SbhzmSubmitResult> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('提交内容为空')
  const resp = await gmFetch(BASE_URL.SBHZM_SUBMIT_MEME, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ content: trimmed, tag_ids: tagIds }),
    timeoutMs: 15_000,
  })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.text().slice(0, 200)}`)
  }
  const json = resp.json<{ id?: unknown; content?: unknown }>()
  const id = typeof json.id === 'number' ? json.id : Number(json.id)
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('提交成功但响应里没有 id')
  }
  const echo = typeof json.content === 'string' ? json.content : trimmed
  return { id, content: echo }
}
