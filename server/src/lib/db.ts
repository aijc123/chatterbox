/**
 * D1 helpers:把"取一行 / 取多行 / 写一行"这些套路抽到这里,业务路由里只关心 SQL。
 *
 * 不引入 ORM —— Phase B 的 schema 很小,直接写 SQL 反而更可读、更好优化。
 */

import type { CbMeme, CbTag } from '../types'

import { normalizeContent } from './hash'

/** 数据库行 → API 形状的 meme(尚未带 tags;tags 在调用方 join 进来)。 */
export interface MemeRow {
  id: number
  uid: number
  content: string
  status: 'pending' | 'approved' | 'rejected'
  copy_count: number
  last_copied_at: string | null
  room_id: number | null
  username: string | null
  avatar: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  reviewer_note: string | null
  content_hash: string
  /** Phase D:行的最初来源('cb'=自建/手工 / 'laplace' / 'sbhzm')。 */
  source_origin: 'cb' | 'laplace' | 'sbhzm'
  /** Phase D:上游(LAPLACE/SBHZM)的原始 id,便于 dedup 和反查。 */
  external_id: number | null
}

/**
 * 把 source_origin 字段从字符串 narrow 到 union。D1 实测可能返回任意字符串,
 * 不在 union 里时降级为 'cb'(最保守,不会假装来自上游)。
 */
function narrowSource(s: string | null | undefined): 'cb' | 'laplace' | 'sbhzm' {
  return s === 'laplace' || s === 'sbhzm' ? s : 'cb'
}

export function rowToCbMeme(row: MemeRow, tags: CbTag[] = []): CbMeme {
  return {
    id: row.id,
    uid: row.uid,
    content: row.content,
    tags,
    copyCount: row.copy_count,
    lastCopiedAt: row.last_copied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    username: row.username,
    avatar: row.avatar,
    room: null,
    _source: narrowSource(row.source_origin),
  }
}

/**
 * 一次性 join 拉一批 meme + 它们的 tags。比 N+1 查询(每条 meme 单独查 tags)
 * 在 100 条数量级就快一个数量级。
 */
export async function fetchMemesWithTags(db: D1Database, memeRows: MemeRow[]): Promise<CbMeme[]> {
  if (memeRows.length === 0) return []
  const ids = memeRows.map(r => r.id)
  const placeholders = ids.map(() => '?').join(',')
  const tagRows = await db
    .prepare(
      `SELECT mt.meme_id, t.id, t.name, t.color, t.emoji, t.icon, t.description
       FROM meme_tags mt
       JOIN tags t ON t.id = mt.tag_id
       WHERE mt.meme_id IN (${placeholders})`
    )
    .bind(...ids)
    .all<{
      meme_id: number
      id: number
      name: string
      color: string | null
      emoji: string | null
      icon: string | null
      description: string | null
    }>()

  const byMemeId = new Map<number, CbTag[]>()
  for (const t of tagRows.results ?? []) {
    const list = byMemeId.get(t.meme_id) ?? []
    list.push({
      id: t.id,
      name: t.name,
      color: t.color,
      emoji: t.emoji,
      icon: t.icon,
      description: t.description,
      count: 0, // count 现阶段不维护,UI 不依赖。
    })
    byMemeId.set(t.meme_id, list)
  }
  return memeRows.map(r => rowToCbMeme(r, byMemeId.get(r.id) ?? []))
}

/**
 * 给已有 tag 名做 upsert(没有就创建,有就返回 id)。
 *
 * 用 `INSERT OR IGNORE` + 二次 SELECT 而不是 `INSERT ... RETURNING`,因为 D1 在
 * 多语句一次发的批处理里 RETURNING 行为不稳定(实测 wrangler 会吞返回值)。两次
 * round-trip 在 D1 边缘节点延迟可忽略。
 */
export async function upsertTagByName(db: D1Database, name: string): Promise<number> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('tag name empty')
  await db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(trimmed).run()
  const row = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(trimmed).first<{ id: number }>()
  if (!row) throw new Error('tag insert succeeded but lookup returned null')
  return row.id
}

/** 把一组 tag 写入 meme_tags(先清后插,适合 patch 场景)。 */
export async function setMemeTags(db: D1Database, memeId: number, tagIds: number[]): Promise<void> {
  await db.prepare('DELETE FROM meme_tags WHERE meme_id = ?').bind(memeId).run()
  for (const tagId of tagIds) {
    await db.prepare('INSERT OR IGNORE INTO meme_tags (meme_id, tag_id) VALUES (?, ?)').bind(memeId, tagId).run()
  }
}

/**
 * 防同质刷库:相同 normalize 后的 content 视为重复,直接复用既有 row。
 * 返回 `{ row, created }`:created=false 表示拿到了 already-existing。
 */
export async function findMemeByHash(db: D1Database, hash: string): Promise<MemeRow | null> {
  const row = await db.prepare('SELECT * FROM memes WHERE content_hash = ?').bind(hash).first<MemeRow>()
  return row ?? null
}

/** content 归一化后是否合法 —— 暴露给路由层做提前 422,不必到 D1 才发现。 */
export function isLikelyValidContent(content: string): boolean {
  const norm = normalizeContent(content)
  return norm.length >= 1 && norm.length <= 200
}
