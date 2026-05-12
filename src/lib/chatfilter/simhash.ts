// Step ⑤ SimHash 模糊辅助 —— TS 移植自 Chatfilter `simhash_dedup.py`。
//
// 算法：每个 n-gram 算 64-bit 哈希；每位投票（+1/-1）；最终各位 >0 则置 1。
// 相似文本汉明距离小（但音近字替换无效——"煞笔"↔"傻逼"距离 ~40——所以
// 这是字典 + 拼音的补丁，不是主力）。
//
// Python 用内置 hash()（PYTHONHASHSEED-dependent）。TS 这里换成 64-bit
// FNV-1a 以保证跨进程/跨版本的确定性；具体 bit 序无关紧要，只要分布良好。

const FNV_PRIME_64 = 0x100000001b3n
const FNV_OFFSET_64 = 0xcbf29ce484222325n
const MASK_64 = (1n << 64n) - 1n

const encoder = new TextEncoder()

function hashToken64(token: string): bigint {
  let h = FNV_OFFSET_64
  // UTF-8 byte stream 喂给 FNV-1a，与字符编码无关；JS string → UTF-8 用 TextEncoder
  const bytes = encoder.encode(token)
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i])
    h = (h * FNV_PRIME_64) & MASK_64
  }
  return h
}

/** 生成字符 n-gram。短文本降级：1 字 → 自身；2 字 → bigram。 */
function ngrams(text: string, n: number): string[] {
  // 用 Array.from 拿 code-point 序列，避免 emoji 被切坏
  const chars = Array.from(text)
  if (chars.length === 0) return []
  if (chars.length < n) {
    if (chars.length < 2) return [chars.join('')]
    const bi = 2
    const out: string[] = []
    for (let i = 0; i <= chars.length - bi; i++) out.push(chars.slice(i, i + bi).join(''))
    return out
  }
  const out: string[] = []
  for (let i = 0; i <= chars.length - n; i++) out.push(chars.slice(i, i + n).join(''))
  return out
}

export function computeSimhash(text: string, ngram = 3): bigint {
  const tokens = ngrams(text, ngram)
  if (tokens.length === 0) return 0n
  // 64 个位的票数
  const vec = new Int32Array(64)
  for (const t of tokens) {
    const h = hashToken64(t)
    for (let i = 0; i < 64; i++) {
      if ((h >> BigInt(i)) & 1n) vec[i] += 1
      else vec[i] -= 1
    }
  }
  let fp = 0n
  for (let i = 0; i < 64; i++) if (vec[i] > 0) fp |= 1n << BigInt(i)
  return fp
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = (a ^ b) & MASK_64
  let count = 0
  while (x !== 0n) {
    x &= x - 1n
    count++
  }
  return count
}

export interface SimHashLookup {
  /** 命中的已有 canonical（无命中则 null）。 */
  canonical: string | null
  /** 高置信度合并发生（≥minLen 字 + 距离 ≤highConfDistance）。 */
  autoMerged: boolean
  /** 候选（距离在 highConf 与 candidate 之间）—— UI 仅作日志，不真合并。 */
  candidate: boolean
}

export interface SimHashHelperOptions {
  highConfDistance?: number
  candidateDistance?: number
  minTextLength?: number
  maxStoreSize?: number
}

export class SimHashHelper {
  private store = new Map<string, { fp: bigint; freq: number }>()
  readonly highConfDistance: number
  readonly candidateDistance: number
  readonly minTextLength: number
  readonly maxStoreSize: number

  constructor(opts: SimHashHelperOptions = {}) {
    this.highConfDistance = opts.highConfDistance ?? 2
    this.candidateDistance = opts.candidateDistance ?? 3
    this.minTextLength = opts.minTextLength ?? 8
    this.maxStoreSize = opts.maxStoreSize ?? 2000
  }

  size(): number {
    return this.store.size
  }

  /** 写入一条 canonical 的指纹。同 canonical 再写入则 freq++。 */
  add(text: string): bigint {
    const existing = this.store.get(text)
    if (existing) {
      existing.freq += 1
      return existing.fp
    }
    if (this.store.size >= this.maxStoreSize) {
      // 简单淘汰：删除最早插入的（Map 保持插入顺序）
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
    const fp = computeSimhash(text)
    this.store.set(text, { fp, freq: 1 })
    return fp
  }

  /** 在 store 内找与 text 最相似的 canonical。 */
  find(text: string): SimHashLookup {
    if (this.store.size === 0) return { canonical: null, autoMerged: false, candidate: false }
    const fp = computeSimhash(text)
    let best: string | null = null
    let bestDist = 999
    for (const [stored, { fp: storedFp }] of this.store) {
      const d = hammingDistance(fp, storedFp)
      if (d < bestDist) {
        bestDist = d
        best = stored
        if (d === 0) break
      }
    }
    if (best === null) return { canonical: null, autoMerged: false, candidate: false }
    if (
      bestDist <= this.highConfDistance &&
      Array.from(text).length >= this.minTextLength &&
      Array.from(best).length >= this.minTextLength
    ) {
      return { canonical: best, autoMerged: true, candidate: false }
    }
    if (bestDist <= this.candidateDistance) {
      return { canonical: best, autoMerged: false, candidate: true }
    }
    return { canonical: null, autoMerged: false, candidate: false }
  }

  clear(): void {
    this.store.clear()
  }
}
