import { describe, expect, test } from 'bun:test'

import { DedupStore } from '../src/lib/chatfilter/dedup'

describe('chatfilter/dedup DedupStore', () => {
  test('首次 ingest → isNew=true, count=1', () => {
    const ds = new DedupStore()
    const r = ds.ingest('哈哈哈', '哈哈哈哈')
    expect(r.isNew).toBe(true)
    expect(r.count).toBe(1)
    expect(r.record.samples).toEqual(['哈哈哈哈'])
  })

  test('同 canonical 二次 ingest → count++', () => {
    const ds = new DedupStore()
    ds.ingest('666', '666')
    const r = ds.ingest('666', '6666')
    expect(r.isNew).toBe(false)
    expect(r.count).toBe(2)
    expect(r.record.samples).toEqual(['6666', '666']) // 最近的在头部
  })

  test('samples 去重 + cap', () => {
    const ds = new DedupStore({ maxSamplesPerEntry: 3 })
    ds.ingest('哈', '哈哈哈')
    ds.ingest('哈', '哈哈哈') // 重复，不入 samples
    ds.ingest('哈', '哈哈哈哈')
    ds.ingest('哈', '哈哈哈哈哈')
    ds.ingest('哈', '哈哈哈哈哈哈') // 第 4 个不同 sample，触发 cap
    const rec = ds.get('哈')!
    expect(rec.samples.length).toBe(3)
    expect(rec.samples[0]).toBe('哈哈哈哈哈哈') // 最新在头部
    expect(rec.count).toBe(5)
  })

  test('maxEntries 淘汰最早', () => {
    const ds = new DedupStore({ maxEntries: 3 })
    ds.ingest('a', 'a')
    ds.ingest('b', 'b')
    ds.ingest('c', 'c')
    expect(ds.size()).toBe(3)
    ds.ingest('d', 'd')
    expect(ds.size()).toBe(3)
    expect(ds.has('a')).toBe(false)
    expect(ds.has('d')).toBe(true)
  })

  test('LRU-style：再次访问把 entry 推到尾部', () => {
    const ds = new DedupStore({ maxEntries: 3 })
    ds.ingest('a', 'a')
    ds.ingest('b', 'b')
    ds.ingest('c', 'c')
    ds.ingest('a', 'a') // a 被刷新到尾
    ds.ingest('d', 'd') // 触发淘汰：现在最旧的是 b
    expect(ds.has('a')).toBe(true)
    expect(ds.has('b')).toBe(false)
    expect(ds.has('c')).toBe(true)
    expect(ds.has('d')).toBe(true)
  })

  test('注入 now 函数 → 时间戳确定可测', () => {
    let t = 1000
    const ds = new DedupStore({ now: () => t })
    const r1 = ds.ingest('x', 'x')
    expect(r1.record.firstSeenAt).toBe(1000)
    expect(r1.record.lastSeenAt).toBe(1000)
    t = 2000
    const r2 = ds.ingest('x', 'x2')
    expect(r2.record.firstSeenAt).toBe(1000) // 不变
    expect(r2.record.lastSeenAt).toBe(2000) // 更新
  })

  test('clear()', () => {
    const ds = new DedupStore()
    ds.ingest('a', 'a')
    ds.clear()
    expect(ds.size()).toBe(0)
  })
})
