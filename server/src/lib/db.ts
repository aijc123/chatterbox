/**
 * D1 helpers:把"取一行 / 取多行 / 写一行"这些套路抽到这里,业务路由里只关心 SQL。
 *
 * 不引入 ORM —— Phase B 的 schema 很小,直接写 SQL 反而更可读、更好优化。
 */

import type { CbMeme, CbTag } from '../types'

import { normalizeContent } from './hash'

const TAG_LOOKUP_CHUNK_SIZE = 90

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
  const byMemeId = new Map<number, CbTag[]>()

  for (let offset = 0; offset < ids.length; offset += TAG_LOOKUP_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + TAG_LOOKUP_CHUNK_SIZE)
    const placeholders = chunk.map(() => '?').join(',')
    const tagRows = await db
      .prepare(
        `SELECT mt.meme_id, t.id, t.name, t.color, t.emoji, t.icon, t.description
         FROM meme_tags mt
         JOIN tags t ON t.id = mt.tag_id
         WHERE mt.meme_id IN (${placeholders})`
      )
      .bind(...chunk)
      .all<{
        meme_id: number
        id: number
        name: string
        color: string | null
        emoji: string | null
        icon: string | null
        description: string | null
      }>()

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
  }
  return memeRows.map(r => rowToCbMeme(r, byMemeId.get(r.id) ?? []))
}

/**
 * 把一组 tag 写入 meme_tags(先清后插,适合 patch 场景)。
 *
 * 用 D1 batch:DELETE + 全部 INSERT 在一个 round-trip 里走,避免每个 tag 一次
 * sub-request(Workers 的 50 sub-request 上限会被多 tag 行为撞到)。
 */
export async function setMemeTags(db: D1Database, memeId: number, tagIds: number[]): Promise<void> {
  const stmts: D1PreparedStatement[] = [db.prepare('DELETE FROM meme_tags WHERE meme_id = ?').bind(memeId)]
  for (const tagId of tagIds) {
    stmts.push(db.prepare('INSERT OR IGNORE INTO meme_tags (meme_id, tag_id) VALUES (?, ?)').bind(memeId, tagId))
  }
  await db.batch(stmts)
}

/**
 * 批量 upsert 一组 tag 名,返回 name → id 的 Map。
 *
 * 单次 round-trip:一个 batch 把 N 个 INSERT OR IGNORE 推下去,再用一个 IN(...)
 * 查回所有 id。空名 / 全空白名静默跳过;不抛异常(调用方通常有"忽略坏 tag"的语义)。
 *
 * 用 `INSERT OR IGNORE` + 后续 SELECT 而不是 `INSERT ... RETURNING`,因为 D1 的
 * batch 里 RETURNING 行为实测不稳定(wrangler 偶发吞返回值)。
 */
export async function upsertTagsByNames(db: D1Database, names: string[]): Promise<Map<string, number>> {
  const trimmed = Array.from(new Set(names.map(n => n.trim()).filter(n => n.length > 0)))
  if (trimmed.length === 0) return new Map()
  const inserts = trimmed.map(name => db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(name))
  await db.batch(inserts)
  const placeholders = trimmed.map(() => '?').join(',')
  const rows = await db
    .prepare(`SELECT id, name FROM tags WHERE name IN (${placeholders})`)
    .bind(...trimmed)
    .all<{ id: number; name: string }>()
  const out = new Map<string, number>()
  for (const r of rows.results ?? []) out.set(r.name, r.id)
  return out
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
