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

import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types'

import { tokenHash } from './hash'

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

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.req.header('authorization') ?? c.req.header('Authorization') ?? ''
  const m = /^Bearer\s+(.+)$/.exec(auth.trim())
  const plaintext = m?.[1]?.trim() ?? ''
  if (!plaintext) return c.json({ error: 'unauthorized', detail: 'missing bearer token' }, 401)

  const hash = await tokenHash(plaintext)
  const row = await c.env.DB.prepare('SELECT id, label, scopes FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL')
    .bind(hash)
    .first<{ id: number; label: string; scopes: string }>()

  if (!row) return c.json({ error: 'unauthorized', detail: 'invalid or revoked' }, 401)

  const actor: AuthedActor = {
    id: row.id,
    label: row.label,
    scopes: row.scopes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  }
  if (!actor.scopes.includes('admin')) {
    return c.json({ error: 'forbidden', detail: 'admin scope required' }, 403)
  }
  c.set('actor', actor)
  await next()
})
