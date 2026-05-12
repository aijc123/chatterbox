// 场景 C：把 chatfilter 高频 alias 命中（variant → canonical）作为候选规则
// 喂给 replacement.ts 的 learn 路径。
//
// 设计：
//   - 不直接写入 localRoomRules；只维护一个**候选**列表，让用户在 log panel
//     里看到并主动「采纳」后才晋升。原因：chatfilter 字典是为"识别同一句话"
//     设计的，里面有"南亭 → 难听"这种谐音，直接当替换规则发出去会被 B 站
//     当成不同弹幕——所以晋升必须由用户判断。
//   - 候选按 (roomId, variant→canonical) 维度计数；同房间命中 ≥ threshold 次
//     才进候选列表。
//   - 候选状态非持久化（重启清空）；采纳后写入持久化的 localRoomRules。

import { signal } from '@preact/signals'

import type { NormalizeResult } from './chatfilter'

import { subscribeNormalizeEvents } from './chatfilter-runtime'
import { cachedRoomId } from './store'
import { chatfilterFeedReplacementLearn } from './store-chatfilter'
import { localRoomRules } from './store-replacement'

const PROMOTE_THRESHOLD = 10

interface CandidateKey {
  roomId: string
  variant: string
  canonical: string
}

function keyOf(k: CandidateKey): string {
  return `${k.roomId}\x01${k.variant}\x01${k.canonical}`
}

interface CandidateEntry extends CandidateKey {
  count: number
  lastSeenAt: number
}

const counter = new Map<string, CandidateEntry>()

/** 公开给 UI 的候选列表 signal（达 PROMOTE_THRESHOLD 的条目）。 */
export const replacementFeedCandidates = signal<CandidateEntry[]>([])

function rebuildCandidates(): void {
  const visible: CandidateEntry[] = []
  for (const e of counter.values()) {
    if (e.count >= PROMOTE_THRESHOLD) visible.push(e)
  }
  // 按计数倒序，便于优先展示
  visible.sort((a, b) => b.count - a.count)
  replacementFeedCandidates.value = visible
}

function onNormalize(result: NormalizeResult): void {
  if (!chatfilterFeedReplacementLearn.value) return
  if (result.filtered || result.aliasHits.length === 0) return
  const roomId = cachedRoomId.value
  if (roomId === null) return
  const roomKey = String(roomId)
  const ts = Date.now()
  let mutated = false
  for (const hit of result.aliasHits) {
    const k: CandidateKey = { roomId: roomKey, variant: hit.variant, canonical: hit.canonical }
    const id = keyOf(k)
    const entry = counter.get(id)
    if (entry) {
      const wasBelow = entry.count < PROMOTE_THRESHOLD
      entry.count += 1
      entry.lastSeenAt = ts
      if (wasBelow && entry.count >= PROMOTE_THRESHOLD) mutated = true
    } else {
      counter.set(id, { ...k, count: 1, lastSeenAt: ts })
    }
  }
  if (mutated) rebuildCandidates()
}

let unsubscribe: (() => void) | null = null

export function startReplacementFeed(): void {
  if (unsubscribe) return
  unsubscribe = subscribeNormalizeEvents(onNormalize)
}

export function stopReplacementFeed(): void {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

/**
 * 用户在 log panel 点「采纳」时调用：把 (variant → canonical) 写入当前
 * roomId 的 localRoomRules，并把候选条目从计数表里移除。
 */
export function adoptReplacementCandidate(c: CandidateEntry): void {
  const rules = { ...localRoomRules.value }
  const room = rules[c.roomId] ?? []
  const exists = room.some(r => r.from === c.variant && r.to === c.canonical)
  if (!exists) {
    rules[c.roomId] = [...room, { from: c.variant, to: c.canonical }]
    localRoomRules.value = rules
  }
  counter.delete(keyOf(c))
  rebuildCandidates()
}

/** 忽略一个候选：从计数表移除，下次再观察到从 0 重新计。 */
export function dismissReplacementCandidate(c: CandidateEntry): void {
  counter.delete(keyOf(c))
  rebuildCandidates()
}

/** 测试用。 */
export function _resetReplacementFeedForTests(): void {
  counter.clear()
  replacementFeedCandidates.value = []
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
