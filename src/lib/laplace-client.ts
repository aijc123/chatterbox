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

/**
 * 给 LAPLACE 源的某条梗回报一次复制。返回最新的 copyCount;失败返回 null
 * (对齐 cb-backend-client 的 reportCbMemeCopy 风格)。
 *
 * **不缓存** —— 写操作天然不该缓存,且后端会即时 +1 计数。
 */
export async function reportLaplaceMemeCopy(memeId: number): Promise<number | null> {
  if (memeId <= 0) return null
  try {
    const resp = await fetch(`${BASE_URL.LAPLACE_MEME_COPY}/${memeId}`, { method: 'POST' })
    if (!resp.ok) return null
    const json: LaplaceInternal.HTTPS.Workers.MemeCopyResponse = await resp.json()
    return json.copyCount
  } catch {
    return null
  }
}

/** 测试用:清空 LAPLACE 列表缓存。 */
export function _clearLaplaceCacheForTests(): void {
  listCache._clearForTests()
}
