// 极简 Map-based LRU。30 行代价远小于 lru-cache 依赖（~45 KB）。
//
// 用法：
//   const cache = new Lru<string, number>(1024)
//   cache.set('a', 1); cache.get('a') // 1
//
// 实现要点：Map 在 ES2015+ 维持插入顺序，所以 set 时先 delete 再 set 就把
// 该 key 推到尾部，最久未用的总在头部。这与 LinkedHashMap / `OrderedDict`
// move_to_end 等价，但不需要额外的链表结构。

export class Lru<K, V> {
  private map = new Map<K, V>()

  constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error(`Lru: capacity must be a positive integer, got ${capacity}`)
    }
  }

  get size(): number {
    return this.map.size
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  /** 命中时把 key 移到尾部（最近使用），返回值；未命中返回 undefined. */
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key) as V
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  /** 写入或更新；若超过 capacity 则淘汰最早的 entry. */
  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Map.keys().next().value 是迭代顺序中第一个（最旧）的 key
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    this.map.set(key, value)
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }
}
