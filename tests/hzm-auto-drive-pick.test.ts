import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { LaplaceInternal } from '@laplace.live/internal'

const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_info: { script: { version: 'test' } },
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const { buildCandidatePool, pickByHeuristic } = await import('../src/lib/hzm-auto-drive')
const { getMemeSourceForRoom } = await import('../src/lib/meme-sources')
const { hzmBlacklistTagsByRoom, hzmRecentSentByRoom, hzmSelectedTagsByRoom } = await import('../src/lib/store-hzm')

import type { LaplaceMemeWithSource } from '../src/lib/sbhzm-client'

const ROOM = 1713546334
const source = getMemeSourceForRoom(ROOM)
if (!source) throw new Error(`Expected meme source for room ${ROOM}`)

function tag(name: string): LaplaceInternal.HTTPS.Workers.TagWithCount {
  return { id: 0, name, color: 'blue', emoji: null, icon: null, description: null, count: 0 }
}

function meme(content: string, tagNames: string[] = []): LaplaceMemeWithSource {
  return {
    id: -1,
    uid: 0,
    content,
    tags: tagNames.map(tag),
    copyCount: 0,
    lastCopiedAt: null,
    createdAt: '',
    updatedAt: '',
    username: null,
    avatar: null,
    room: null,
    _source: 'sbhzm',
  }
}

const A = meme('冲耳朵啊医生', ['满弟', '医生'])
const B = meme('好困想睡觉', ['略弥'])
const C = meme('骂绿冻路人', ['骂绿冻'])
const D = meme('普通弹幕', ['通用'])
const E = meme('') // empty content — should always be filtered out

const POOL: LaplaceMemeWithSource[] = [A, B, C, D, E]

describe('buildCandidatePool', () => {
  test('drops empty content', () => {
    const out = buildCandidatePool({ roomId: ROOM, memes: POOL, recentSent: [], blacklistTags: [] })
    expect(out).not.toContain(E)
    expect(out.length).toBe(4)
  })

  test('drops recently-sent contents', () => {
    const out = buildCandidatePool({ roomId: ROOM, memes: POOL, recentSent: ['好困想睡觉'], blacklistTags: [] })
    expect(out).not.toContain(B)
    expect(out.length).toBe(3)
  })

  test('drops memes with any blacklisted tag', () => {
    const out = buildCandidatePool({
      roomId: ROOM,
      memes: POOL,
      recentSent: [],
      blacklistTags: ['略弥', '骂绿冻'],
    })
    expect(out).not.toContain(B)
    expect(out).not.toContain(C)
    expect(out.length).toBe(2)
  })

  test('reads from store when explicit args omitted', () => {
    hzmRecentSentByRoom.value = { [String(ROOM)]: ['普通弹幕'] }
    hzmBlacklistTagsByRoom.value = { [String(ROOM)]: ['略弥'] }
    const out = buildCandidatePool({ roomId: ROOM, memes: POOL })
    expect(out).not.toContain(B)
    expect(out).not.toContain(D)
    // cleanup
    hzmRecentSentByRoom.value = {}
    hzmBlacklistTagsByRoom.value = {}
  })
})

describe('pickByHeuristic', () => {
  beforeEach(() => {
    hzmSelectedTagsByRoom.value = {}
    hzmBlacklistTagsByRoom.value = {}
    hzmRecentSentByRoom.value = {}
  })

  test('returns null when memes pool is empty', () => {
    const out = pickByHeuristic({ roomId: ROOM, source, memes: [], recentDanmuText: '' })
    expect(out).toBeNull()
  })

  test('returns null when all memes are filtered out (recent + blacklist)', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: [A, B],
      recentDanmuText: '',
      recentSent: ['冲耳朵啊医生', '好困想睡觉'],
      blacklistTags: [],
    })
    expect(out).toBeNull()
  })

  test('keyword regex match → forces meme with matching tag', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      // 灰泽满 source 里 "冲耳朵|耳朵痛|实习医生|医生|住院" → "满弟"
      recentDanmuText: '哈哈这个医生太逗了',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
    })
    expect(out).toBe(A) // A 有 "满弟" tag
  })

  test('keyword regex match → falls through to general pool when no meme has that tag (strict=false)', () => {
    const customSource = {
      ...source,
      keywordToTag: { 牛奶: '不存在的标签' },
    }
    const out = pickByHeuristic({
      roomId: ROOM,
      source: customSource,
      memes: [B, D], // 没有 '不存在的标签' 的梗
      recentDanmuText: '想喝牛奶',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      strict: false,
    })
    expect(out).toBe(B) // 退回 pool 第一条
  })

  test('selectedTags filter applied when no keyword match', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '今天天气真好',
      recentSent: [],
      blacklistTags: [],
      selectedTags: ['略弥'],
      randomFn: () => 0,
    })
    expect(out).toBe(B) // B 是唯一带 略弥 的
  })

  test('selectedTags ignored when no meme matches selected (strict=false → general pool)', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '今天天气真好',
      recentSent: [],
      blacklistTags: [],
      selectedTags: ['完全不存在的标签'],
      randomFn: () => 0, // 随机第一条
      strict: false,
    })
    // 退回完整候选池（按原顺序）
    expect(out).toBe(A)
  })

  test('blacklist takes precedence over keyword match (strict=false → general pool)', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      // 命中 "医生" → matchedTag '满弟' → 但 A 有 满弟，被 blacklist 屏蔽
      recentDanmuText: '医生救命',
      recentSent: [],
      blacklistTags: ['满弟'],
      selectedTags: [],
      randomFn: () => 0,
      strict: false,
    })
    // A 被屏蔽 → 因为 matchedTag '满弟' 在剩余池中找不到，退回完整剩余池第一条
    expect(out).not.toBe(A)
    expect([B, C, D]).toContain(out as LaplaceMemeWithSource)
  })

  test('randomFn drives selection deterministically (strict=false)', () => {
    const memes = [A, B, C, D]
    const out0 = pickByHeuristic({
      roomId: ROOM,
      source,
      memes,
      recentDanmuText: '',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      strict: false,
    })
    const out1 = pickByHeuristic({
      roomId: ROOM,
      source,
      memes,
      recentDanmuText: '',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0.99,
      strict: false,
    })
    expect(out0).toBe(A)
    expect(out1).toBe(D)
  })

  // ---------------------------------------------------------------------------
  // 新增：trending-first 选梗 + strict 短路
  // ---------------------------------------------------------------------------

  test('trending-first: 高频公屏文本对应的 keyword 优先匹配', () => {
    // 没有任何关键词出现在 recentDanmuText 整体里，但 detectTrend 会从 recentDanmu
    // 里挑出高频条 "医生救救我"，然后用它去匹配 keywordToTag（'医生' → '满弟'）。
    // 用 A（满弟 tag）验证 trending → tag → meme 的链路。
    const recentDanmu = [
      { ts: 100, text: '医生救救我', uid: 'u1' },
      { ts: 110, text: '医生救救我', uid: 'u2' },
      { ts: 120, text: '别的话题', uid: 'u3' },
    ]
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '别的话题', // 故意不让整体 join 命中
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      recentDanmu,
      strict: true,
    })
    expect(out).toBe(A) // A 有 '满弟' tag
  })

  test('trending threshold 默认 2：单条 trending 不算', () => {
    // 高频文本只出现 1 次 → trend.text = null → 走不到 trending 分支
    // recentDanmuText 也不命中 → strict=true → 返回 null
    const recentDanmu = [{ ts: 100, text: '医生', uid: 'u1' }]
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '别的',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      recentDanmu,
      strict: true,
    })
    expect(out).toBeNull()
  })

  test('strict=true: 没匹配到任何信号 → null（不再随机兜底）', () => {
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '今天天气真好',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      strict: true,
    })
    expect(out).toBeNull()
  })

  test('strict=true: 即使 trending 命中、但对应 tag 没梗 → 仍然 null', () => {
    const customSource = { ...source, keywordToTag: { 医生: '不存在的标签' } }
    const recentDanmu = [
      { ts: 100, text: '医生', uid: 'u1' },
      { ts: 110, text: '医生', uid: 'u2' },
    ]
    const out = pickByHeuristic({
      roomId: ROOM,
      source: customSource,
      memes: POOL,
      recentDanmuText: '医生',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
      recentDanmu,
      strict: true,
    })
    expect(out).toBeNull()
  })

  test('strict 默认值跟随 store 的 hzmStrictHeuristic（true）', async () => {
    // 不显式传 strict，让函数读 store 默认值 true → 没信号时应当 null
    const out = pickByHeuristic({
      roomId: ROOM,
      source,
      memes: POOL,
      recentDanmuText: '完全不相关',
      recentSent: [],
      blacklistTags: [],
      selectedTags: [],
      randomFn: () => 0,
    })
    expect(out).toBeNull()
  })

  test('malformed regex in keywordToTag is ignored (no throw)', () => {
    const customSource = {
      ...source,
      keywordToTag: { '[bad regex': '满弟', 医生: '满弟' },
    }
    expect(() =>
      pickByHeuristic({
        roomId: ROOM,
        source: customSource,
        memes: POOL,
        recentDanmuText: '医生在吗',
        recentSent: [],
        blacklistTags: [],
        selectedTags: [],
        randomFn: () => 0,
      })
    ).not.toThrow()
  })
})
