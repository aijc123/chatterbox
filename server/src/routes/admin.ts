/**
 * 管理员 endpoint(全部要 Bearer token):
 *   GET    /admin/pending          — 待审列表(分页)
 *   POST   /admin/memes/:id/approve — 批准 + 可改 tag/note
 *   POST   /admin/memes/:id/reject  — 拒绝
 *   PATCH  /admin/memes/:id        — 改 content / 重新 normalize hash
 *   GET    /admin/stats            — 统计
 *
 * 鉴权由 requireAdmin 中间件统一拦,这里专心写业务。
 * 每次状态变更都写一行 contributions(action, actor, payload_json)审计日志。
 */

import { Hono } from 'hono'

import type { AppEnv } from '../types'

import { requireAdmin } from '../lib/auth'
import { fetchMemesWithTags, isLikelyValidContent, type MemeRow, setMemeTags, upsertTagByName } from '../lib/db'
import { contentHash, normalizeContent } from '../lib/hash'
import { pullSbhzmIntoCache } from '../lib/upstream-sbhzm'

export const adminRoutes = new Hono<AppEnv>()
adminRoutes.use('*', requireAdmin)

/** 手动触发 SBHZM 上游拉取,不必等 cron。本地开发和应急场景都用得着。 */
adminRoutes.post('/refresh-sbhzm', async c => {
  const t0 = Date.now()
  const result = await pullSbhzmIntoCache(c.env.DB)
  return c.json({ ...result, elapsedMs: Date.now() - t0 })
})

const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 200

adminRoutes.get('/pending', async c => {
  const url = new URL(c.req.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const perPageRaw = Number(url.searchParams.get('perPage') ?? String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, perPageRaw))

  const totalRow = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memes WHERE status = 'pending'").first<{
    n: number
  }>()
  const result = await c.env.DB.prepare(
    "SELECT * FROM memes WHERE status = 'pending' ORDER BY created_at ASC LIMIT ? OFFSET ?"
  )
    .bind(perPage, (page - 1) * perPage)
    .all<MemeRow>()

  const items = await fetchMemesWithTags(c.env.DB, result.results ?? [])
  return c.json({ items, total: totalRow?.n ?? 0, page, perPage })
})

interface ApproveBody {
  tagNames?: unknown
  note?: unknown
}

adminRoutes.post('/memes/:id/approve', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_request', detail: 'invalid id' }, 400)

  let body: ApproveBody = {}
  try {
    body = await c.req.json<ApproveBody>()
  } catch {
    // 空 body 是合法的 —— 直接批准、不改 tag。
  }

  const tagNames = Array.isArray(body.tagNames) ? body.tagNames.filter((s): s is string => typeof s === 'string') : null
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null

  const existing = await c.env.DB.prepare('SELECT id, status FROM memes WHERE id = ?').bind(id).first<{
    id: number
    status: string
  }>()
  if (!existing) return c.json({ error: 'not_found' }, 404)
  if (existing.status === 'rejected') {
    return c.json({ error: 'conflict', detail: 'meme already rejected; PATCH it back to pending first' }, 409)
  }

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    "UPDATE memes SET status = 'approved', reviewed_at = ?, reviewer_note = ?, updated_at = ? WHERE id = ?"
  )
    .bind(now, note, now, id)
    .run()

  if (tagNames) {
    const tagIds: number[] = []
    for (const name of tagNames) {
      try {
        tagIds.push(await upsertTagByName(c.env.DB, name))
      } catch {
        // 跳过空名等异常 tag
      }
    }
    await setMemeTags(c.env.DB, id, tagIds)
  }

  const actor = c.get('actor')
  await c.env.DB.prepare(`INSERT INTO contributions (meme_id, action, actor, payload_json) VALUES (?, 'approve', ?, ?)`)
    .bind(id, actor.label, JSON.stringify({ tagNames, note }))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM memes WHERE id = ?').bind(id).first<MemeRow>()
  if (!row) return c.json({ error: 'not_found' }, 404)
  const [withTags] = await fetchMemesWithTags(c.env.DB, [row])
  return c.json(withTags)
})

interface RejectBody {
  note?: unknown
}

adminRoutes.post('/memes/:id/reject', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_request', detail: 'invalid id' }, 400)

  let body: RejectBody = {}
  try {
    body = await c.req.json<RejectBody>()
  } catch {
    /* 空 body 合法 */
  }
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null

  const existing = await c.env.DB.prepare('SELECT id FROM memes WHERE id = ?').bind(id).first<{ id: number }>()
  if (!existing) return c.json({ error: 'not_found' }, 404)

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    "UPDATE memes SET status = 'rejected', reviewed_at = ?, reviewer_note = ?, updated_at = ? WHERE id = ?"
  )
    .bind(now, note, now, id)
    .run()

  const actor = c.get('actor')
  await c.env.DB.prepare(`INSERT INTO contributions (meme_id, action, actor, payload_json) VALUES (?, 'reject', ?, ?)`)
    .bind(id, actor.label, JSON.stringify({ note }))
    .run()

  return c.json({ ok: true })
})

interface PatchBody {
  content?: unknown
  status?: unknown
  tagNames?: unknown
  note?: unknown
}

adminRoutes.patch('/memes/:id', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_request', detail: 'invalid id' }, 400)

  let body: PatchBody = {}
  try {
    body = await c.req.json<PatchBody>()
  } catch {
    return c.json({ error: 'bad_request', detail: 'invalid JSON' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT * FROM memes WHERE id = ?').bind(id).first<MemeRow>()
  if (!existing) return c.json({ error: 'not_found' }, 404)

  const updates: string[] = []
  const binds: unknown[] = []

  if (typeof body.content === 'string' && body.content !== existing.content) {
    if (!isLikelyValidContent(body.content)) {
      return c.json({ error: 'bad_request', detail: 'content must be 1-200 chars after normalize' }, 422)
    }
    const newHash = await contentHash(normalizeContent(body.content))
    // 若 hash 撞上其他行 → 422 让管理员决定合并/拒绝。不静默覆盖。
    if (newHash !== existing.content_hash) {
      const clash = await c.env.DB.prepare('SELECT id FROM memes WHERE content_hash = ? AND id != ?')
        .bind(newHash, id)
        .first<{ id: number }>()
      if (clash) {
        return c.json({ error: 'conflict', detail: `content collides with meme #${clash.id}` }, 409)
      }
    }
    updates.push('content = ?', 'content_hash = ?')
    binds.push(body.content.trim(), newHash)
  }
  if (typeof body.status === 'string' && ['pending', 'approved', 'rejected'].includes(body.status)) {
    updates.push('status = ?')
    binds.push(body.status)
    // 改状态算 review,顺便更新 reviewed_at。
    updates.push('reviewed_at = ?')
    binds.push(new Date().toISOString())
  }
  if (typeof body.note === 'string') {
    updates.push('reviewer_note = ?')
    binds.push(body.note.slice(0, 500))
  }

  if (updates.length === 0 && body.tagNames === undefined) {
    return c.json({ error: 'bad_request', detail: 'no recognized fields to update' }, 422)
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?')
    binds.push(new Date().toISOString())
    binds.push(id)
    await c.env.DB.prepare(`UPDATE memes SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...binds)
      .run()
  }

  if (Array.isArray(body.tagNames)) {
    const tagIds: number[] = []
    for (const name of body.tagNames) {
      if (typeof name !== 'string') continue
      try {
        tagIds.push(await upsertTagByName(c.env.DB, name))
      } catch {
        /* skip */
      }
    }
    await setMemeTags(c.env.DB, id, tagIds)
  }

  const actor = c.get('actor')
  await c.env.DB.prepare(`INSERT INTO contributions (meme_id, action, actor, payload_json) VALUES (?, 'edit', ?, ?)`)
    .bind(id, actor.label, JSON.stringify(body))
    .run()

  const row = await c.env.DB.prepare('SELECT * FROM memes WHERE id = ?').bind(id).first<MemeRow>()
  if (!row) return c.json({ error: 'not_found' }, 404)
  const [withTags] = await fetchMemesWithTags(c.env.DB, [row])
  return c.json(withTags)
})

adminRoutes.get('/stats', async c => {
  const counts = await c.env.DB.prepare('SELECT status, COUNT(*) AS n FROM memes GROUP BY status').all<{
    status: string
    n: number
  }>()

  const byStatus = { pending: 0, approved: 0, rejected: 0 }
  for (const r of counts.results ?? []) {
    if (r.status in byStatus) byStatus[r.status as keyof typeof byStatus] = r.n
  }

  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM contributions WHERE action = 'submit' AND created_at >= ?"
  )
    .bind(new Date(Date.now() - 24 * 3600_000).toISOString())
    .first<{ n: number }>()

  return c.json({
    counts: byStatus,
    submits24h: recent?.n ?? 0,
  })
})
