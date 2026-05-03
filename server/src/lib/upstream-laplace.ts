/**
 * LAPLACE 上游聚合。
 *
 * 策略:每次 GET /memes 调用时,如果距离上次成功拉取超过 TTL,就 fetch 一次 LAPLACE
 * 并把结果写到 Workers 边缘缓存(`caches.default`,免费、自动跨节点共享)。下次同
 * roomId+sortBy 的请求就直接命中缓存,延迟 ~5ms。
 *
 * 不写 D1 因为:
 *  1. LAPLACE 自己就在 Cloudflare Workers 上,可用性已经很高
 *  2. 边缘缓存就在响应路径上,无需 cron 维护
 *  3. D1 写次数有配额,LAPLACE 数据"5 分钟新"对烂梗用例完全够
 *
 * 失败统统 swallow:返回 `{ items: [], ok: false }`,让上层 merge 跳过这个源、
 * 在响应里把 `sources.laplace` 标 false 让客户端能软降级。
 */

import type { CbMeme, CbTag } from '../types'

const LAPLACE_LIST = 'https://workers.vrp.moe/laplace/memes'
const CACHE_TTL_SEC = 5 * 60

interface LaplaceTagShape {
  id?: number
  name?: string
  color?: string | null
  emoji?: string | null
  icon?: string | null
  description?: string | null
  count?: number
}

interface LaplaceMemeShape {
  id?: number
  uid?: number
  content?: string
  tags?: LaplaceTagShape[]
  copyCount?: number
  lastCopiedAt?: string | null
  createdAt?: string
  updatedAt?: string
  username?: string | null
  avatar?: string | null
  room?: unknown
}

interface LaplaceListResponse {
  data?: LaplaceMemeShape[]
}

export interface UpstreamResult {
  items: CbMeme[]
  ok: boolean
}

function normalizeTag(t: LaplaceTagShape): CbTag {
  return {
    id: typeof t.id === 'number' ? t.id : 0,
    name: typeof t.name === 'string' ? t.name : '',
    color: t.color ?? null,
    emoji: t.emoji ?? null,
    icon: t.icon ?? null,
    description: t.description ?? null,
    count: typeof t.count === 'number' ? t.count : 0,
  }
}

function normalizeLaplaceMeme(m: LaplaceMemeShape): CbMeme | null {
  const content = (m.content ?? '').trim()
  if (!content) return null
  // LAPLACE id 是正整数,直接复用 —— 不会和 cb 自建冲突,因为我们的 cb 库用
  // AUTOINCREMENT 从 1 起跳,LAPLACE 使用更大的命名空间(实测 id > 5000)。
  // 万一未来撞上,merge 层会按 content_hash 兜底去重。
  const id = typeof m.id === 'number' && m.id > 0 ? m.id : 0
  return {
    id,
    uid: typeof m.uid === 'number' ? m.uid : 0,
    content,
    tags: Array.isArray(m.tags) ? m.tags.map(normalizeTag).filter(t => t.name) : [],
    copyCount: typeof m.copyCount === 'number' ? m.copyCount : 0,
    lastCopiedAt: typeof m.lastCopiedAt === 'string' ? m.lastCopiedAt : null,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(0).toISOString(),
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date(0).toISOString(),
    username: typeof m.username === 'string' ? m.username : null,
    avatar: typeof m.avatar === 'string' ? m.avatar : null,
    room: null,
    _source: 'laplace',
  }
}

/**
 * 拉取 LAPLACE 已合并(roomId 维度)的烂梗。
 *
 * @param roomId 直播间号(LAPLACE 用它做按房间排序)
 * @param sortBy LAPLACE 同样支持 lastCopiedAt/copyCount/createdAt
 */
export async function fetchLaplaceFromUpstream(
  roomId: number | null,
  sortBy: 'lastCopiedAt' | 'copyCount' | 'createdAt'
): Promise<UpstreamResult> {
  const params = new URLSearchParams()
  if (roomId !== null) params.set('roomId', String(roomId))
  params.set('sortBy', sortBy)
  params.set('sort', 'desc')
  const url = `${LAPLACE_LIST}?${params.toString()}`

  // caches.default 用 Request 作为 key。我们手工 cf-cache 头让 LAPLACE 的缓存策略
  // 不影响这里(避免重复 304 round-trip)。
  const cacheKey = new Request(url, { method: 'GET' })
  const cache = caches.default
  let resp = await cache.match(cacheKey)
  if (!resp) {
    try {
      const upstream = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          // workers.vrp.moe 上挂了 Cloudflare Bot Fight Mode,无 UA 直接吃 challenge。
          // 实测加 UA 即可正常返回 JSON。
          'User-Agent': 'chatterbox-cloud/1.0 (+https://github.com/aijc123/bilibili-live-wheel-auto-follow)',
        },
        // LAPLACE 也是 Workers,通常 < 100ms,3s 已经是有问题。
        signal: AbortSignal.timeout(3_000),
      })
      if (!upstream.ok) return { items: [], ok: false }
      // clone:body 只能读一次,我们既要返回也要给 cache.put 写。
      resp = new Response(upstream.body, upstream)
      resp.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SEC}`)
      // 故意不 await put —— 写缓存失败不该阻塞响应路径。
      // (Cloudflare 自动 reject 不能缓存的响应,比如 5xx)
      cache.put(cacheKey, resp.clone()).catch(() => {})
    } catch {
      return { items: [], ok: false }
    }
  }

  let body: LaplaceListResponse
  try {
    body = (await resp.json()) as LaplaceListResponse
  } catch {
    return { items: [], ok: false }
  }
  const items = (body.data ?? []).map(normalizeLaplaceMeme).filter((m): m is CbMeme => m !== null)
  return { items, ok: true }
}
