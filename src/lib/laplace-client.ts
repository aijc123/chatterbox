/**
 * LAPLACE 烂梗库 API 客户端。
 *
 * LAPLACE 走标准 CORS,不需要 GM_xmlhttpRequest;留在原生 fetch 即可。
 * 之前这两个调用直接散落在 components/memes-list.tsx 里,违反了"组件不该自己 fetch
 * 外部 API"的边界:UI 层无法做 in-flight dedup / 缓存 / 重试 / 熔断,且新增 LAPLACE
 * 调用方就必须重复一份相同代码。统一封装到这里之后:
 *  - 30s TTL 缓存 + in-flight dedup(走 fetch-cache.ts),与 cb / sbhzm 客户端一致
 *  - 单点改超时、加重试、加日志都只动一个文件
 *  - 测试时只需 mock 这个模块,不再去 stub `fetch`
 */

import type { LaplaceInternal } from '@laplace.live/internal'

import { BASE_URL } from './const'
import { FetchCache } from './fetch-cache'

type LaplaceMeme = LaplaceInternal.HTTPS.Workers.MemeWithUser
export type LaplaceMemeSortBy = NonNullable<LaplaceInternal.HTTPS.Workers.MemeListQuery['sortBy']>

/**
 * 30 秒。和 memes-list 的 30s polling 间隔对齐:同一窗口内 panel 反复打开 / 多
 * tab 同房间不会重复打到 LAPLACE,polling 触发的下一轮才真正穿透到上游。
 */
const LAPLACE_LIST_TTL_MS = 30_000

const listCache = new FetchCache<LaplaceMeme[]>()

function sortMemesInPlace(memes: LaplaceMeme[], sortBy: LaplaceMemeSortBy): void {
  memes.sort((a, b) => {
    if (sortBy === 'lastCopiedAt') {
      if (a.lastCopiedAt === null && b.lastCopiedAt === null) return 0
      if (a.lastCopiedAt === null) return 1
      if (b.lastCopiedAt === null) return -1
      return b.lastCopiedAt.localeCompare(a.lastCopiedAt)
    }
    if (sortBy === 'copyCount') return b.copyCount - a.copyCount
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/**
 * 拉取 LAPLACE 烂梗列表(已按 sortBy 排序)。
 *
 * 失败抛错(让调用方自己决定是 toast 还是静默兜底)。
 */
export async function fetchLaplaceMemes(roomId: number, sortBy: LaplaceMemeSortBy): Promise<LaplaceMeme[]> {
  const url = `${BASE_URL.LAPLACE_MEMES}?roomId=${roomId}&sortBy=${sortBy}&sort=desc`
  // key 包含 sortBy:不同排序的视图分开缓存,避免互相覆盖。
  const key = `${roomId}|${sortBy}`
  return listCache.get({
    key,
    ttlMs: LAPLACE_LIST_TTL_MS,
    fetcher: async () => {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
      const json: LaplaceInternal.HTTPS.Workers.MemeListResponse = await resp.json()
      const items = json.data ?? []
      sortMemesInPlace(items, sortBy)
      return items
    },
  })
  // 调用方约定不直接 mutate 返回的数组(同 sbhzm/cb 客户端);需要 transform 时
  // 用 .map / [...arr] / .concat 等不可变操作产生新数组。
}

// LAPLACE 没有批量接口,只能客户端做窗口内去重。按钮 UX 自身已有 1.5s 的"已复制"
// 锁定,这里加 2s 兜底:再快的双击 / 同一 id 来自不同代码路径的重复 fire 不会触发
// 第二次 POST。完整批处理需要 LAPLACE 改 endpoint,目前不在我们手里。
const LAPLACE_COPY_DEDUP_MS = 2_000
const recentLaplaceCopies = new Map<number, number>() // id → ts

/**
 * 给 LAPLACE 源的某条梗回报一次复制。返回最新的 copyCount;失败 / 重复短窗口
 * 返回 null(对齐 cb-backend-client 的 reportCbMemeCopy 风格)。
 *
 * **不缓存** —— 写操作天然不该缓存,且后端会即时 +1 计数。
 */
export async function reportLaplaceMemeCopy(memeId: number): Promise<number | null> {
  if (memeId <= 0) return null
  const now = Date.now()
  const last = recentLaplaceCopies.get(memeId)
  if (last !== undefined && now - last < LAPLACE_COPY_DEDUP_MS) {
    // 窗口内重复 → 静默丢弃,UI 不更新计数(避免发两次 POST 让 LAPLACE 视作刷量)。
    return null
  }
  recentLaplaceCopies.set(memeId, now)
  // 顺手 GC:Map 最大量级不会很大(短窗口),但仍然清理过期项保险。
  if (recentLaplaceCopies.size > 64) {
    for (const [id, ts] of recentLaplaceCopies) {
      if (now - ts >= LAPLACE_COPY_DEDUP_MS) recentLaplaceCopies.delete(id)
    }
  }
  try {
    const resp = await fetch(`${BASE_URL.LAPLACE_MEME_COPY}/${memeId}`, { method: 'POST' })
    if (!resp.ok) return null
    const json: LaplaceInternal.HTTPS.Workers.MemeCopyResponse = await resp.json()
    return json.copyCount
  } catch {
    return null
  }
}

/** 测试用:清空 LAPLACE 列表缓存 + copy 去重窗口。 */
export function _clearLaplaceCacheForTests(): void {
  listCache._clearForTests()
  recentLaplaceCopies.clear()
}
