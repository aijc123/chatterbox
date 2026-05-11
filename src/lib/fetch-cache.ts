/**
 * 网络层通用 TTL 缓存 + in-flight dedup 工具。
 *
 * 解决两类浪费:
 *  1. **TTL 缓存**:同 key 在 ttlMs 内重复请求,直接返回上次结果(避免 30s 轮询窗口
 *     内 panel 反复打开造成的多次 round-trip)。
 *  2. **in-flight dedup**:同 key 已经有未完成的请求时,后到的调用方共享同一个 promise
 *     (避免 panel mount + 30s timer 同时触发产生两个相同请求)。
 *
 * 跟 sbhzm-client.ts 内嵌的 30 分钟缓存是同一思路,只是抽出来给 cb / laplace / 其他
 * 客户端复用,统一行为。
 *
 * 失败语义:fetcher reject 不进入缓存(下次调用会重新尝试),并清除 in-flight 记录。
 */

interface CacheEntry<T> {
  ts: number
  data: T
}

export interface FetchCacheGetOptions<T> {
  /** 缓存键。建议直接用 URL 或 URL+param 拼成的字符串。 */
  key: string
  /** TTL 毫秒。命中且 `Date.now() - ts < ttlMs` 直接返回。 */
  ttlMs: number
  /** 真正发起网络请求的函数;只有缓存未命中且没有 in-flight 时才会被调用。 */
  fetcher: () => Promise<T>
}

/** 默认每个 cache 实例最多保留 128 个 key,LRU 替换。够大于实际工作集
 *  (一个 panel session 一般也就 ~20 个不同 query/url),但小到能保证长会话
 *  下不会无界增长。可以通过构造参数调高/调低。 */
const DEFAULT_MAX_ENTRIES = 128

export class FetchCache<T> {
  // Map 的迭代顺序 = 插入顺序,所以"删除并重新插入"实现 LRU 重置很简单
  // (set 已存在的 key 不改变 iteration order,所以读命中时显式 delete+set)。
  private cache = new Map<string, CacheEntry<T>>()
  private inFlight = new Map<string, Promise<T>>()
  private readonly maxEntries: number

  constructor(opts?: { maxEntries?: number }) {
    const m = opts?.maxEntries
    this.maxEntries = typeof m === 'number' && m > 0 ? Math.floor(m) : DEFAULT_MAX_ENTRIES
  }

  async get(opts: FetchCacheGetOptions<T>): Promise<T> {
    const { key, ttlMs, fetcher } = opts

    // 1) fresh cache hit (顺便把 entry 移到 LRU 尾部:删了再插)
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.ts < ttlMs) {
      this.cache.delete(key)
      this.cache.set(key, cached)
      return cached.data
    }
    // 1b) stale hit:清掉过期项以免它继续占 LRU 名额
    if (cached) this.cache.delete(key)

    // 2) in-flight dedup —— 同 key 共享一个 promise
    const pending = this.inFlight.get(key)
    if (pending) return pending

    // 3) 真正发请求,成功写缓存(可能触发 LRU 驱逐),失败清掉 in-flight 但不写缓存
    const promise = fetcher().then(
      data => {
        this.cache.set(key, { ts: Date.now(), data })
        // LRU 驱逐:超过 maxEntries 时从头(最久未用)开始删
        while (this.cache.size > this.maxEntries) {
          const oldest = this.cache.keys().next().value
          if (oldest === undefined) break
          this.cache.delete(oldest)
        }
        this.inFlight.delete(key)
        return data
      },
      err => {
        this.inFlight.delete(key)
        throw err
      }
    )
    this.inFlight.set(key, promise)
    return promise
  }

  /** 主动让某个 key (或全部) 失效。下次 get 必然重新 fetch。 */
  invalidate(key?: string): void {
    if (key === undefined) {
      this.cache.clear()
    } else {
      this.cache.delete(key)
    }
  }

  /** 测试 / 诊断用。 */
  get _sizeForTests(): number {
    return this.cache.size
  }

  /** 测试用:清空缓存和 in-flight 记录。 */
  _clearForTests(): void {
    this.cache.clear()
    this.inFlight.clear()
  }
}
