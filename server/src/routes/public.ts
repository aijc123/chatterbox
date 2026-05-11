/**
 * 公开 endpoint(无鉴权,但带基础限流和审计):
 *   GET  /memes              — 已批准列表(分页)
 *   GET  /memes/random       — 随机一条已批准
 *   POST /memes              — 提交贡献(进 pending 队列,等管理员审核)
 *   POST /memes/:id/copy     — 自建 meme 的复制计数(单个,旧客户端兼容)
 *   POST /memes/copy/batch   — 批量复制计数(新客户端,N+1 → 1 round-trip)
 *
 * Phase B 阶段 GET /memes 只返回自建库;Phase C 才在这里聚合 LAPLACE/SBHZM。
 */

import { Hono } from 'hono'

import type { AppEnv, CbMeme, CbMemeListResponse } from '../types'

import {
  attachTagsByHash,
  fetchMemesWithTags,
  findMemeByHash,
  isLikelyValidContent,
  type MemeRow,
  type TagMeta,
  upsertTagsWithMeta,
} from '../lib/db'
import { contentHash, hashIp, normalizeContent } from '../lib/hash'
import { mergeMemes, parseSortBy, sortMemes } from '../lib/merge'
import { parsePositiveRoomId, shouldIncludeSbhzmSource } from '../lib/room-sources'
import { readSbhzmFromCache } from '../lib/upstream-sbhzm'

export const publicRoutes = new Hono<AppEnv>()

const DEFAULT_PER_PAGE = 100
const MAX_PER_PAGE = 500

/**
 * GET /memes 内查 own 表的硬上限。merge/dedup/sort 当前发生在内存里(因为要和
 * SBHZM cron cache 合并),所以 SQL 级 LIMIT/OFFSET 不能直接换成"按页只拿一页",
 * 否则跨页排序会乱。这里设一个保守的上限,挡住 own 表无限增长导致每次请求都
 * materialize 整张表的 worst case。
 *
 * 命中上限时只取最新 INNER_FETCH_LIMIT 行(ORDER BY id DESC),并打 warn log
 * 让我们知道何时该把 merge/sort 真正下沉到 SQL(详见 audit Phase 3)。
 */
const INNER_FETCH_LIMIT = 5000

/**
 * Phase D 主入口:返回 cb 自建库内容(已包含被 userscript 用户经 bulk-mirror
 * 投喂上来的 LAPLACE/SBHZM 镜像) + SBHZM 当前 cron 快照(过渡用,等 mirror 库
 * 充分覆盖之后可以下线)。
 *
 * 关键变化:**后端不再主动 fetch LAPLACE 上游**。所有 LAPLACE 内容都靠 userscript
 * 用户在自己 fetch 后通过 POST /memes/bulk-mirror 推上来。这意味着:
 *  - LAPLACE 不再看到你后端的请求(LAPLACE 站长视角:你后端不存在)
 *  - 自建库的 LAPLACE 覆盖度随用户活跃度自然增长,冷启动期 sources.laplace=false
 *  - 客户端在 sources.laplace=false 时会本地直拉 LAPLACE 兜底,顺便 mirror 推一份
 *
 * 任一源缺失只会让 `sources.<src>=false`,不会让端点失败。
 *
 * 查询参数:
 *  - sortBy: 'lastCopiedAt' | 'copyCount' | 'createdAt' (默认 lastCopiedAt)
 *  - tag:    只返回带这个 tag 名的梗(post-merge 内存过滤)
 *  - source: 'cb' | 'laplace' | 'sbhzm' | 'all'(默认 'all')—— 调试/分源浏览
 *  - roomId: 当前直播间 real room id；只有登记了 SBHZM 专属源的房间才返回 SBHZM
 *  - page / perPage: 标准分页
 */
publicRoutes.get('/memes', async c => {
  const url = new URL(c.req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const perPageRaw = Number(url.searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, perPageRaw))
  const sortBy = parseSortBy(url.searchParams.get('sortBy'))
  const tag = url.searchParams.get('tag')
  const sourceFilter = url.searchParams.get('source') ?? 'all'
  const roomId = parsePositiveRoomId(url.searchParams.get('roomId'))

  // 1) 自建表的所有已批准行(包含 source_origin='cb'/'laplace'/'sbhzm' 三种)。
  //    rowToCbMeme 会把 source_origin 翻译成 _source,merge 层据此区分来源。
  //    bounded by INNER_FETCH_LIMIT —— 命中上限时取最新行,merge/sort 走内存。
  const ownResult = await c.env.DB.prepare("SELECT * FROM memes WHERE status = 'approved' ORDER BY id DESC LIMIT ?")
    .bind(INNER_FETCH_LIMIT)
    .all<MemeRow>()
  const ownRows = ownResult.results ?? []
  if (ownRows.length === INNER_FETCH_LIMIT) {
    // 库已经长到要下沉 SQL 排序的规模了。打 warn 让我们不会无声漂过这个临界点。
    console.warn(
      `[public/memes] ownRows hit INNER_FETCH_LIMIT=${INNER_FETCH_LIMIT}; results may exclude older approved memes`
    )
  }
  const ownAll = await fetchMemesWithTags(c.env.DB, ownRows)

  // 2) SBHZM cron 快照(过渡机制) —— 即便 mirror 库还没覆盖到 SBHZM,这里也
  //    能兜底返回。等用户们经 bulk-mirror 把 SBHZM 内容也推得差不多了,可以下掉这个。
  const wantSbhzm = shouldIncludeSbhzmSource(sourceFilter, roomId)
  const sbhzmCache = wantSbhzm ? await readSbhzmFromCache(c.env.DB) : { items: [] as CbMeme[], ok: false }

  // 3) 把 own 按 source_origin 拆成三组,merge 时优先级 cb > laplace > sbhzm。
  const cbItems = ownAll.filter(m => m._source === 'cb')
  const laplaceItems = ownAll.filter(m => m._source === 'laplace')
  const sbhzmItemsFromOwn = ownAll.filter(m => m._source === 'sbhzm')

  const wantCb = sourceFilter === 'all' || sourceFilter === 'cb'
  const wantLaplace = sourceFilter === 'all' || sourceFilter === 'laplace'

  let merged = await mergeMemes(
    {
      own: wantCb ? cbItems : [],
      laplace: wantLaplace ? laplaceItems : [],
      // SBHZM:优先取 mirror 库里已批准的;它和 cron 快照同 hash 会被去重一次。
      sbhzm: wantSbhzm ? [...sbhzmItemsFromOwn, ...sbhzmCache.items] : [],
    },
    sortBy
  )

  if (tag) merged = merged.filter(m => m.tags.some(t => t.name === tag))
  if (sourceFilter !== 'all') merged = merged.filter(m => m._source === sourceFilter)

  const sorted = sortMemes(merged, sortBy)
  const total = sorted.length
  const items = sorted.slice((page - 1) * perPage, page * perPage)

  const body: CbMemeListResponse = {
    items,
    total,
    page,
    perPage,
    sources: {
      // 各源是否"有数据可用"(不是"是否成功 fetch")。
      // sources.laplace=false 是给客户端的信号:本次请求里没拿到 LAPLACE 内容,
      // 你应该自己直拉 LAPLACE 然后 bulk-mirror 推回来填库。
      laplace: wantLaplace && laplaceItems.length > 0,
      sbhzm: wantSbhzm && (sbhzmItemsFromOwn.length > 0 || sbhzmCache.ok),
      cb: wantCb,
    },
  }
  // s-maxage 让 CF 边缘缓存吸收重复请求(60s 容忍审核延迟);浏览器侧不缓存避免拿到陈旧分页。
  c.header('Cache-Control', 'public, s-maxage=60, max-age=0')
  return c.json(body)
})

publicRoutes.get('/memes/random', async c => {
  // SQLite 的 RANDOM() 在 ~1k 条数量级足够快;Phase C 库膨胀后再换成 OFFSET-by-id 方案。
  const row = await c.env.DB.prepare(
    "SELECT * FROM memes WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1"
  ).first<MemeRow>()
  if (!row) return c.json({ error: 'empty', detail: 'no approved memes' }, 404)
  const [withTags] = await fetchMemesWithTags(c.env.DB, [row])
  // 随机 endpoint 故意不缓存:每次请求要给不同结果。
  c.header('Cache-Control', 'no-store')
  return c.json(withTags)
})

interface SubmitBody {
  content?: unknown
  tagNames?: unknown
  roomId?: unknown
  uid?: unknown
  username?: unknown
}

// `POST /memes` 也需要应用层限流,否则单一 attacker 能无限灌 pending 行,
// 撑爆审核队列和 D1 storage。复用 bulk-mirror 用的 ip_hash + created_at 计数模式。
// 30/小时是慎重值:一个真用户审核期间手动提交 30 条已经罕见。
const SUBMIT_RATE_LIMIT_PER_HOUR = 30

publicRoutes.post('/memes', async c => {
  let body: SubmitBody
  try {
    body = await c.req.json<SubmitBody>()
  } catch {
    return c.json({ error: 'bad_request', detail: 'invalid JSON' }, 400)
  }
  const content = typeof body.content === 'string' ? body.content : ''
  if (!isLikelyValidContent(content)) {
    return c.json({ error: 'bad_request', detail: 'content must be 1-200 chars after normalize' }, 422)
  }
  const norm = normalizeContent(content)
  const hash = await contentHash(norm)

  // 同 hash 已存在 → 不重复入库,直接返回原状态,但仍在审计日志里记一笔
  // (能区分"机器人扫库"和"用户重复点击")。
  const existing = await findMemeByHash(c.env.DB, hash)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip') ?? 'unknown'
  const ipHashed = await hashIp(ip, c.env.IP_HASH_SALT ?? 'dev-salt')
  const ua = c.req.header('user-agent') ?? ''

  // 限流:同 ip_hash 过去 1 小时的 submit(含 dedup) >= 上限 → 429,带 Retry-After。
  // 用 contributions 表的 action='submit' 行做计数,跟 bulk-mirror 一样的存储模式,
  // 不需要新增表。读一行 COUNT 比维护内存计数器更接近"分布式无状态"的 Workers 模型。
  const since = new Date(Date.now() - 3600_000).toISOString()
  const recentSubmit = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM contributions WHERE action = 'submit' AND ip_hash = ? AND created_at >= ?"
  )
    .bind(ipHashed, since)
    .first<{ n: number }>()
  if ((recentSubmit?.n ?? 0) >= SUBMIT_RATE_LIMIT_PER_HOUR) {
    c.header('Retry-After', '3600')
    return c.json({ error: 'rate_limited', detail: 'too many submissions in past hour' }, 429)
  }

  if (existing) {
    await c.env.DB.prepare(
      `INSERT INTO contributions (meme_id, action, actor, ip_hash, user_agent, payload_json)
       VALUES (?, 'submit', 'public', ?, ?, ?)`
    )
      .bind(existing.id, ipHashed, ua, JSON.stringify({ content, dedup: true }))
      .run()
    return c.json({ id: existing.id, status: existing.status, dedup: true }, 200)
  }

  const uid = typeof body.uid === 'number' ? body.uid : 0
  const username = typeof body.username === 'string' ? body.username.slice(0, 64) : null
  const roomId = typeof body.roomId === 'number' ? body.roomId : null
  // 显式传 created_at/updated_at 才能让 CHECK 默认值之外的逻辑(比如审核时间)对齐时区。
  // D1 的 strftime 默认 UTC,我们也固定 UTC 字符串。
  const now = new Date().toISOString()
  const insert = await c.env.DB.prepare(
    `INSERT INTO memes (uid, content, status, content_hash, room_id, username, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`
  )
    .bind(uid, content.trim(), hash, roomId, username, now, now)
    .run()

  // D1 的 RowsModified API 不一定有 last_row_id,我们再查一次最稳。
  const newRow = await c.env.DB.prepare('SELECT id FROM memes WHERE content_hash = ?').bind(hash).first<{
    id: number
  }>()
  const newId = newRow?.id ?? Number(insert.meta.last_row_id ?? 0)

  // tagNames 是可选,Phase B 只插能匹配的 tag(不存在的不创建,避免被刷垃圾 tag)。
  const tagNames = Array.isArray(body.tagNames) ? body.tagNames.filter((s): s is string => typeof s === 'string') : []
  if (newId > 0 && tagNames.length > 0) {
    const placeholders = tagNames.map(() => '?').join(',')
    const existingTags = await c.env.DB.prepare(`SELECT id, name FROM tags WHERE name IN (${placeholders})`)
      .bind(...tagNames)
      .all<{ id: number; name: string }>()
    const tagRows = existingTags.results ?? []
    if (tagRows.length > 0) {
      // 一次 batch 把所有 meme_tags 关联推下去,避免 N 次 sub-request。
      const stmts = tagRows.map(t =>
        c.env.DB.prepare('INSERT OR IGNORE INTO meme_tags (meme_id, tag_id) VALUES (?, ?)').bind(newId, t.id)
      )
      await c.env.DB.batch(stmts)
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO contributions (meme_id, action, actor, ip_hash, user_agent, payload_json)
     VALUES (?, 'submit', 'public', ?, ?, ?)`
  )
    .bind(newId, ipHashed, ua, JSON.stringify({ content, tagNames, roomId, uid, username }))
    .run()

  return c.json({ id: newId, status: 'pending', dedup: false }, 201)
})

publicRoutes.post('/memes/:id/copy', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id) || id <= 0) {
    return c.json({ error: 'bad_request', detail: 'invalid id' }, 400)
  }
  const now = new Date().toISOString()
  const result = await c.env.DB.prepare(
    "UPDATE memes SET copy_count = copy_count + 1, last_copied_at = ?, updated_at = ? WHERE id = ? AND status = 'approved'"
  )
    .bind(now, now, id)
    .run()
  if (!result.meta.changes) {
    return c.json({ error: 'not_found', detail: 'meme not found or not approved' }, 404)
  }
  const row = await c.env.DB.prepare('SELECT copy_count FROM memes WHERE id = ?')
    .bind(id)
    .first<{ copy_count: number }>()
  return c.json({ copyCount: row?.copy_count ?? 0 })
})

// ---------------------------------------------------------------------------
// POST /memes/copy/batch
//
// 客户端把 debounce 窗口内的多次"复制"调用聚合成一次请求。N 次单 POST → 1 次
// 批量 POST。后端聚合 id → 累加次数,在一个 db.batch 里跑全部 UPDATE。
//
// 请求:`{ items: number[] }` —— meme id 列表;允许重复(同 id 重复 = 计数 +N)。
// 响应:`{ updated, missing, results: [{ id, copyCount }] }`
//   - updated:实际生效的 unique id 数(行存在且 status='approved')
//   - missing:请求里出现但库里找不到 / 未批准的 id 个数
//   - results:每个 updated id 的最新 copyCount(顺序不保证,客户端按 id 索引)
//
// 为什么不需要鉴权 / 审计:写计数器跟旧的 /memes/:id/copy 一样轻、一样幂等
// (重复请求只是 +N,语义清晰),没引入新的攻击面 —— 单 endpoint 上能做的
// 事这里也能做,反过来也成立。
// ---------------------------------------------------------------------------

const MAX_COPY_BATCH = 100

publicRoutes.post('/memes/copy/batch', async c => {
  let body: { items?: unknown }
  try {
    body = await c.req.json<{ items?: unknown }>()
  } catch {
    return c.json({ error: 'bad_request', detail: 'invalid JSON' }, 400)
  }
  if (!Array.isArray(body.items)) {
    return c.json({ error: 'bad_request', detail: 'items must be an array of numbers' }, 422)
  }
  if (body.items.length === 0) {
    return c.json({ updated: 0, missing: 0, results: [] })
  }
  if (body.items.length > MAX_COPY_BATCH) {
    return c.json({ error: 'too_large', detail: `max ${MAX_COPY_BATCH} ids per call` }, 413)
  }

  // 聚合:同 id 多次 = 累加。无效 id(非正整数)直接丢弃,不抛错(客户端可能
  // 在 SBHZM 合成的负 id 上不小心调用,我们容忍)。
  const counts = new Map<number, number>()
  for (const raw of body.items) {
    const id = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  if (counts.size === 0) return c.json({ updated: 0, missing: 0, results: [] })

  const now = new Date().toISOString()
  // 每个 unique id 一条 UPDATE,db.batch 一次 round-trip 全发。
  const updateStmts = [...counts.entries()].map(([id, delta]) =>
    c.env.DB.prepare(
      "UPDATE memes SET copy_count = copy_count + ?, last_copied_at = ?, updated_at = ? WHERE id = ? AND status = 'approved'"
    ).bind(delta, now, now, id)
  )
  const updateResults = await c.env.DB.batch(updateStmts)

  // changes=0 表示行不存在或不是 approved → missing。
  const idsList = [...counts.keys()]
  let updated = 0
  let missing = 0
  const updatedIds: number[] = []
  for (let i = 0; i < idsList.length; i++) {
    const r = updateResults[i]
    if (r?.meta?.changes && r.meta.changes > 0) {
      updated++
      const id = idsList[i]
      if (id !== undefined) updatedIds.push(id)
    } else {
      missing++
    }
  }

  // 回查最新 copy_count。一次 SELECT IN(...) 拉所有 updated id。
  let results: Array<{ id: number; copyCount: number }> = []
  if (updatedIds.length > 0) {
    const placeholders = updatedIds.map(() => '?').join(',')
    const rows = await c.env.DB.prepare(`SELECT id, copy_count FROM memes WHERE id IN (${placeholders})`)
      .bind(...updatedIds)
      .all<{ id: number; copy_count: number }>()
    results = (rows.results ?? []).map(r => ({ id: r.id, copyCount: r.copy_count }))
  }

  return c.json({ updated, missing, results })
})

publicRoutes.get('/tags', async c => {
  const result = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.color, t.emoji, t.icon, t.description, COUNT(mt.meme_id) AS count
     FROM tags t
     LEFT JOIN meme_tags mt ON mt.tag_id = t.id
     LEFT JOIN memes m ON m.id = mt.meme_id AND m.status = 'approved'
     GROUP BY t.id
     ORDER BY count DESC, t.name ASC`
  ).all<{
    id: number
    name: string
    color: string | null
    emoji: string | null
    icon: string | null
    description: string | null
    count: number
  }>()
  // tag 列表变化频率比 meme 列表更低,5 分钟边缘缓存足够。
  c.header('Cache-Control', 'public, s-maxage=300, max-age=0')
  return c.json({ items: result.results ?? [] })
})

// ---------------------------------------------------------------------------
// Phase D:bulk-mirror —— userscript 用户把自己刚 fetch 到的 LAPLACE/SBHZM 数据
// 推到这里,后端 INSERT OR IGNORE 进 memes 表,从此被 GET /memes 当自有内容返回。
//
// 防滥刷:
//  - 单次最多 MAX_BATCH 条
//  - 每个 IP_HASH 每小时最多 RATE_LIMIT_PER_HOUR 次调用
//  - content_hash UNIQUE 兜底:就算混入垃圾,同 hash 只占一行,管理员可手动改 status='rejected'
//
// 单次调用用 D1 batch,避免 Worker 50 sub-request 限制。
// ---------------------------------------------------------------------------

const MAX_MIRROR_BATCH = 200
const MIRROR_RATE_LIMIT_PER_HOUR = 60

interface MirrorItem {
  content?: unknown
  id?: unknown
  uid?: unknown
  copyCount?: unknown
  lastCopiedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  username?: unknown
  avatar?: unknown
  /**
   * Phase E:跟内容一起带过来的 tag 列表。形态对齐 LaplaceInternal TagWithCount /
   * sbhzm-client.normalizeTag —— `{name, color?, emoji?, icon?, description?, ...}`。
   * 客户端 mirrorToCbBackend 把上游的 tags 字段透传过来,服务端在这里 upsert 进
   * tags + meme_tags 两张表,顺便回填既有 1944 条没 tag 的旧数据。
   *
   * 安全:tag 名 / color / emoji 都是从 LAPLACE/SBHZM 拉来的(用户脚本无法本地伪造,
   * 因为同时被 content_hash dedup 卡住);即便伪造,UPDATE 不会发生(INSERT OR IGNORE),
   * 攻击面只能是"塞噪音 tag",管理员可后续清理。
   */
  tags?: unknown
}

/**
 * 从 MirrorItem.tags 这种 unknown 里提一份 TagMeta[](最多 MAX_TAGS_PER_ITEM 条,
 * 名字 trim + 长度 1..40,color/emoji 长度兜底)。任何不合规的元素静默丢。
 *
 * 上限 8 个 tag/条:LAPLACE 实际很少超过 3,SBHZM 几乎都是 1~2,8 留余量但挡住
 * 恶意 mirror 塞 100 个 tag 把 meme_tags 表撑爆的攻击向量。
 */
const MAX_TAGS_PER_ITEM = 8
function extractTagMetas(raw: unknown): TagMeta[] {
  if (!Array.isArray(raw)) return []
  const out: TagMeta[] = []
  for (const t of raw) {
    if (out.length >= MAX_TAGS_PER_ITEM) break
    if (!t) continue
    let name = ''
    let color: string | null = null
    let emoji: string | null = null
    if (typeof t === 'string') {
      name = t
    } else if (typeof t === 'object') {
      const obj = t as { name?: unknown; color?: unknown; emoji?: unknown }
      if (typeof obj.name === 'string') name = obj.name
      if (typeof obj.color === 'string') color = obj.color.slice(0, 32) || null
      if (typeof obj.emoji === 'string') emoji = obj.emoji.slice(0, 16) || null
    }
    name = name.trim().slice(0, 40)
    if (!name) continue
    out.push({ name, color, emoji })
  }
  return out
}

publicRoutes.post('/memes/bulk-mirror', async c => {
  let body: { items?: unknown; source?: unknown }
  try {
    body = await c.req.json<{ items?: unknown; source?: unknown }>()
  } catch {
    return c.json({ error: 'bad_request', detail: 'invalid JSON' }, 400)
  }

  const source = body.source
  if (source !== 'laplace' && source !== 'sbhzm') {
    return c.json({ error: 'bad_request', detail: 'source must be "laplace" or "sbhzm"' }, 422)
  }
  const items = Array.isArray(body.items) ? (body.items as MirrorItem[]) : []
  if (items.length === 0) return c.json({ inserted: 0, skipped: 0, total: 0 })
  if (items.length > MAX_MIRROR_BATCH) {
    return c.json({ error: 'too_large', detail: `max ${MAX_MIRROR_BATCH} items per call` }, 413)
  }

  // 限流:过去 1 小时同 ip_hash 的 mirror 调用数 >= 上限 → 429。
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip') ?? 'unknown'
  const ipHashed = await hashIp(ip, c.env.IP_HASH_SALT ?? 'dev-salt')
  const since = new Date(Date.now() - 3600_000).toISOString()
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM contributions WHERE action = 'mirror' AND ip_hash = ? AND created_at >= ?"
  )
    .bind(ipHashed, since)
    .first<{ n: number }>()
  if ((recent?.n ?? 0) >= MIRROR_RATE_LIMIT_PER_HOUR) {
    return c.json({ error: 'rate_limited', detail: 'too many mirror calls in past hour' }, 429)
  }

  // 计算 hash + 准备语句(并行 hash,串行准备)。invalid 项跳过。
  // 安全:bulk-mirror 是匿名公开端点,所有 attacker-controlled 字段都按最严方式裁剪:
  //   - username / avatar / uid → 强制 NULL(不接受请求里的值)。攻击者无法
  //     往"approved"池里塞带具名归属的内容(防 username spoofing 与社工)。
  //   - external_id → 必须是正整数且 < 1_000_000(同 cron 路径)。
  //   - copyCount → 必须是非负整数且 <= 100_000(防止把热度排序顶到第一)。
  //   - lastCopiedAt → 必须能被 Date.parse 解析。
  // 内容本身仍然会以 'approved' 入库(否则前端"保鲜"完全失效);content
  // 长度上限 + isLikelyValidContent + IP/小时限流 + content_hash UNIQUE 是
  // content-poisoning 的剩余护栏。
  const reviewedAt = new Date().toISOString()
  const stmts: D1PreparedStatement[] = []
  // tag 信息按 content_hash 收集,但 *仅在该 meme 是本次新插入* 时才 attach
  // (见下方 batch 后的过滤)——否则匿名调用方可以用 content_hash 给 *任意*
  // 已审核 meme 涂上任意 tag(IDOR via hash collision)。
  const allTagMetas: TagMeta[] = []
  const tagLinksAll: Array<{ contentHash: string; tagNames: string[] }> = []
  const queuedHashes: string[] = [] // 与 stmts 一一对应,用于 batch 后比对
  let queued = 0
  let invalid = 0
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') {
      invalid++
      continue
    }
    const content = typeof raw.content === 'string' ? raw.content : ''
    if (!isLikelyValidContent(content)) {
      invalid++
      continue
    }
    const hash = await contentHash(content)
    const externalIdRaw = typeof raw.id === 'number' && Number.isFinite(raw.id) ? Math.floor(raw.id) : null
    const externalId = externalIdRaw !== null && externalIdRaw > 0 && externalIdRaw < 1_000_000 ? externalIdRaw : null
    const copyCountRaw =
      typeof raw.copyCount === 'number' && Number.isFinite(raw.copyCount) ? Math.floor(raw.copyCount) : 0
    const copyCount = copyCountRaw >= 0 && copyCountRaw <= 100_000 ? copyCountRaw : 0
    const lastCopiedAtRaw = typeof raw.lastCopiedAt === 'string' ? raw.lastCopiedAt : null
    const lastCopiedAt = lastCopiedAtRaw && Number.isFinite(Date.parse(lastCopiedAtRaw)) ? lastCopiedAtRaw : null
    const createdAtRaw = typeof raw.createdAt === 'string' ? raw.createdAt : reviewedAt
    const createdAt = Number.isFinite(Date.parse(createdAtRaw)) ? createdAtRaw : reviewedAt
    const updatedAtRaw = typeof raw.updatedAt === 'string' ? raw.updatedAt : createdAt
    const updatedAt = Number.isFinite(Date.parse(updatedAtRaw)) ? updatedAtRaw : createdAt

    const tagMetas = extractTagMetas(raw.tags)
    if (tagMetas.length > 0) {
      allTagMetas.push(...tagMetas)
      tagLinksAll.push({ contentHash: hash, tagNames: tagMetas.map(t => t.name) })
    }

    stmts.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO memes
           (uid, content, status, content_hash, source_origin, external_id,
            copy_count, last_copied_at, username, avatar, created_at, updated_at, reviewed_at)
         VALUES (0, ?, 'approved', ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`
      ).bind(content.trim(), hash, source, externalId, copyCount, lastCopiedAt, createdAt, updatedAt, reviewedAt)
    )
    queuedHashes.push(hash)
    queued++
  }

  let inserted = 0
  // 哪些 content_hash 是 *本次新插入* 的——用于后续仅给新行 attach tag。
  const insertedHashes = new Set<string>()
  if (stmts.length > 0) {
    const results = await c.env.DB.batch(stmts)
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      if (r.meta?.changes && r.meta.changes > 0) {
        inserted++
        insertedHashes.add(queuedHashes[i])
      }
    }
  }

  // tag 处理:仅给 *本次新插入* 的 meme attach tag。攻击者用已存在 meme 的
  // hash 提交带 tag 的请求 → 这里被 insertedHashes 过滤掉 → 不会涂改老行。
  // 历史回填 tag 的需求由 admin 路径或 cron `pullSbhzmIntoMirror` 完成,
  // 那两个路径走 trusted actor,不受这一限制。
  let tagsLinked = 0
  const tagLinks = tagLinksAll.filter(l => insertedHashes.has(l.contentHash))
  if (tagLinks.length > 0) {
    const nameToId = await upsertTagsWithMeta(c.env.DB, allTagMetas)
    const links = tagLinks.map(l => ({
      contentHash: l.contentHash,
      tagIds: l.tagNames.map(n => nameToId.get(n)).filter((id): id is number => typeof id === 'number'),
    }))
    tagsLinked = await attachTagsByHash(c.env.DB, links)
  }

  const skipped = queued - inserted
  const ua = c.req.header('user-agent') ?? ''

  // 审计 + 限流计数(下次同 ip 的 mirror 会查到这一行)。
  await c.env.DB.prepare(
    `INSERT INTO contributions (action, actor, ip_hash, user_agent, payload_json) VALUES ('mirror', 'public', ?, ?, ?)`
  )
    .bind(ipHashed, ua, JSON.stringify({ source, total: items.length, queued, inserted, skipped, invalid, tagsLinked }))
    .run()

  return c.json({ inserted, skipped, invalid, tagsLinked, total: items.length })
})
