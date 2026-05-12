// Step ⑥ 精确去重 + 频次统计 —— TS 移植自 Chatfilter `dedup_store.py`。
//
// 用 Map<canonical, DedupRecord>：
//   - is_new 判断：首次出现返回 true（normalize 决定要不要去算 simhash）
//   - 频次累加：相同 canonical 的 count 直接合并
//   - 原始示例链：每个 canonical 下存少量原文样本（"内容穿透"）

export interface DedupRecord {
  canonical: string
  count: number
  /** 该 canonical 的若干原始示例（按时间倒序，最多 maxSamples 条）。 */
  samples: string[]
  /** 首次见到的时间戳。 */
  firstSeenAt: number
  /** 最近一次见到的时间戳。 */
  lastSeenAt: number
}

export interface DedupResult {
  isNew: boolean
  count: number
  record: DedupRecord
}

export interface DedupStoreOptions {
  maxEntries?: number
  maxSamplesPerEntry?: number
  /** 提供当前时间戳的函数，方便测试注入。默认 Date.now。 */
  now?: () => number
}

export class DedupStore {
  private store = new Map<string, DedupRecord>()
  readonly maxEntries: number
  readonly maxSamplesPerEntry: number
  private readonly now: () => number

  constructor(opts: DedupStoreOptions = {}) {
    this.maxEntries = opts.maxEntries ?? 5000
    this.maxSamplesPerEntry = opts.maxSamplesPerEntry ?? 5
    this.now = opts.now ?? (() => Date.now())
  }

  size(): number {
    return this.store.size
  }

  has(canonical: string): boolean {
    return this.store.has(canonical)
  }

  get(canonical: string): DedupRecord | undefined {
    return this.store.get(canonical)
  }

  /**
   * 摄入一对 (canonical, raw)。第一次见到 canonical 时 isNew = true，count = 1；
   * 否则累加。原始示例去重后加到 samples 头部。
   */
  ingest(canonical: string, raw: string): DedupResult {
    const ts = this.now()
    let record = this.store.get(canonical)
    if (record) {
      record.count += 1
      record.lastSeenAt = ts
      if (raw && !record.samples.includes(raw)) {
        record.samples.unshift(raw)
        if (record.samples.length > this.maxSamplesPerEntry) record.samples.pop()
      }
      // 移到尾部以实现 LRU-style 淘汰
      this.store.delete(canonical)
      this.store.set(canonical, record)
      return { isNew: false, count: record.count, record }
    }
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    record = {
      canonical,
      count: 1,
      samples: raw ? [raw] : [],
      firstSeenAt: ts,
      lastSeenAt: ts,
    }
    this.store.set(canonical, record)
    return { isNew: true, count: 1, record }
  }

  clear(): void {
    this.store.clear()
  }

  /** 给外部（log panel、replacement-feed）只读迭代。 */
  entries(): IterableIterator<[string, DedupRecord]> {
    return this.store.entries()
  }
}
