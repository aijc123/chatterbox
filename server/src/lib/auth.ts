/**
 * Bearer-token 鉴权。
 *
 * 流程:
 *  1. 客户端在 Authorization 头里送 `Bearer <plaintext-token>`
 *  2. 服务端 sha256(plaintext) 后比对 `api_keys.key_hash`
 *  3. 命中且未 revoke → 注入 actor 到 context,放行
 *
 * 故意不把 token 写到 cookie:cookie 容易被同源 XSS 抓到。让 admin UI 把 token
 * 存在 localStorage,每个请求手动塞 Authorization。这样泄露面更小。
 */

import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'

import { hashIp, tokenHash } from './hash'

export interface AuthedActor {
  id: number
  label: string
  scopes: string[]
}

declare module 'hono' {
  interface ContextVariableMap {
    actor: AuthedActor
  }
}

/**
 * 把鉴权失败写一行 contributions(action='auth_fail'),便于事后回溯被探测的频率
 * 和来源。故意不回写完整 token —— 只记 hash 前 8 位,凭它能判断"是不是同一把钥匙
 * 被反复试",但即便审计表泄露也不能反推 plaintext。
 */
async function logAuthFail(c: Context<AppEnv>, reason: string, hashPrefix: string | null) {
  try {
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip') ?? 'unknown'
    const ipHashed = await hashIp(ip, c.env.IP_HASH_SALT ?? 'dev-salt')
    const ua = c.req.header('user-agent') ?? ''
    const path = new URL(c.req.url).pathname
    await c.env.DB.prepare(
      `INSERT INTO contributions (action, actor, ip_hash, user_agent, payload_json) VALUES ('auth_fail', 'public', ?, ?, ?)`
    )
      .bind(ipHashed, ua, JSON.stringify({ reason, path, hashPrefix }))
      .run()
  } catch (err) {
    // 审计写入失败不能阻断 401 响应,只打日志。
    console.error('[auth] failed to write auth_fail row', err)
  }
}

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.req.header('authorization') ?? c.req.header('Authorization') ?? ''
  const m = /^Bearer\s+(.+)$/.exec(auth.trim())
  const plaintext = m?.[1]?.trim() ?? ''
  if (!plaintext) {
    await logAuthFail(c, 'missing_bearer', null)
    return c.json({ error: 'unauthorized', detail: 'missing bearer token' }, 401)
  }

  const hash = await tokenHash(plaintext)
  const row = await c.env.DB.prepare('SELECT id, label, scopes FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL')
    .bind(hash)
    .first<{ id: number; label: string; scopes: string }>()

  if (!row) {
    await logAuthFail(c, 'unknown_or_revoked', hash.slice(0, 8))
    return c.json({ error: 'unauthorized', detail: 'invalid or revoked' }, 401)
  }

  const actor: AuthedActor = {
    id: row.id,
    label: row.label,
    scopes: row.scopes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  }
  if (!actor.scopes.includes('admin')) {
    await logAuthFail(c, 'missing_admin_scope', hash.slice(0, 8))
    return c.json({ error: 'forbidden', detail: 'admin scope required' }, 403)
  }
  c.set('actor', actor)
  await next()
  return undefined
})
