/**
 * 跨源合并 + 去重 + 排序。
 *
 * 输入:三个 source 的 CbMeme 数组 + 排序方式
 * 输出:按 sortBy 排好序的扁平数组,每个元素带正确的 _source 标记。
 *
 * 合并优先级:**自建 > LAPLACE > SBHZM**
 *  - 同 content_hash 的多份只保留第一次出现的(优先级高的赢)
 *  - "赢"意味着它的 content / tags / copyCount 留下;来源标记跟着赢家走
 *
 * 为什么自建优先?管理员审核时可能改了 content / 加了 tag,这些手工调整不应该被
 * 上游覆盖。LAPLACE 优先于 SBHZM 只是因为 LAPLACE 更稳定、字段更完整。
 */

import type { CbMeme } from '../types'

import { contentHash } from './hash'

export type SortBy = 'lastCopiedAt' | 'copyCount' | 'createdAt'

export function sortMemes(memes: CbMeme[], sortBy: SortBy): CbMeme[] {
  const out = memes.slice()
  out.sort((a, b) => {
    if (sortBy === 'lastCopiedAt') {
      if (a.lastCopiedAt === null && b.lastCopiedAt === null) return 0
      if (a.lastCopiedAt === null) return 1
      if (b.lastCopiedAt === null) return -1
      return b.lastCopiedAt.localeCompare(a.lastCopiedAt)
    }
    if (sortBy === 'copyCount') return b.copyCount - a.copyCount
    return b.createdAt.localeCompare(a.createdAt)
  })
  return out
}

export interface MergeInputs {
  own: CbMeme[]
  laplace: CbMeme[]
  sbhzm: CbMeme[]
}

/**
 * 自建 → LAPLACE → SBHZM 顺序合并;同 hash 后到的丢弃。
 *
 * `own` 元素已经从 D1 出来,自带 content_hash(在 db.ts 持久化)。但我们这里
 * 不依赖那个值 —— 重新对 normalize 后的 content 做 hash,保证三个源用一套口径
 * (避免历史数据的 hash 算法漂移)。
 *
 * 性能注意:contentHash 是 crypto.subtle.digest 的异步调用,串行 await 会让
 * 每条 meme 多吃一次微任务。一次性 Promise.all 全部 hash 后再做"按优先级取首"。
 */
export async function mergeMemes(inputs: MergeInputs, sortBy: SortBy): Promise<CbMeme[]> {
  const ordered: CbMeme[] = [...inputs.own, ...inputs.laplace, ...inputs.sbhzm]
  const hashes = await Promise.all(ordered.map(m => contentHash(m.content)))

  const seen = new Set<string>()
  const merged: CbMeme[] = []
  for (const [i, m] of ordered.entries()) {
    // hashes 与 ordered 一一对应,长度相等;非空断言只是哄 noUncheckedIndexedAccess。
    const h = hashes[i] as string
    if (seen.has(h)) continue
    seen.add(h)
    merged.push(m)
  }

  return sortMemes(merged, sortBy)
}

/** Phase B 已经认的三种 sort key,这里用作类型守卫。 */
export function parseSortBy(s: string | null | undefined): SortBy {
  if (s === 'copyCount' || s === 'createdAt') return s
  return 'lastCopiedAt'
}
