/**
 * chatterbox-cloud entry。
 *
 * Phase C 状态:
 *  - 公开:GET /memes(聚合 cb+LAPLACE+SBHZM,带 ?source=&tag= 过滤),
 *    GET /memes/random, GET /tags, POST /memes(submit pending),POST /memes/:id/copy
 *  - 管理:Bearer-token-gated /admin/* + 静态 /admin 页面 + /admin/refresh-sbhzm 手动触发
 *  - GET /health
 *  - 定时任务:cron 每 15 分钟拉一次 SBHZM 写入 D1 缓存表
 *
 * 数据流详见 lib/upstream-laplace.ts、lib/upstream-sbhzm.ts、lib/merge.ts。
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

import type { AppBindings, AppEnv } from './types'

import { ADMIN_HTML } from './admin-ui'
import { pullSbhzmIntoCache } from './lib/upstream-sbhzm'
import { adminRoutes } from './routes/admin'
import { publicRoutes } from './routes/public'

const app = new Hono<AppEnv>()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.get('/health', async c => {
  // Phase D:不再 fetch LAPLACE 上游。upstreams.laplace=true 表示 mirror 库里
  // 已有 LAPLACE 来源的行(由 userscript 用户经 bulk-mirror 推上来)。
  const sbhzmCacheRow = await c.env.DB.prepare(
    'SELECT fetched_at FROM upstream_sbhzm_cache ORDER BY fetched_at DESC LIMIT 1'
  ).first<{ fetched_at: string }>()
  const sbhzmAgeMin = sbhzmCacheRow ? (Date.now() - new Date(sbhzmCacheRow.fetched_at).getTime()) / 60_000 : null

  const counts = await c.env.DB.prepare(
    "SELECT source_origin, COUNT(*) AS n FROM memes WHERE status = 'approved' GROUP BY source_origin"
  ).all<{ source_origin: string; n: number }>()
  const mirror = { cb: 0, laplace: 0, sbhzm: 0 }
  for (const r of counts.results ?? []) {
    if (r.source_origin === 'cb' || r.source_origin === 'laplace' || r.source_origin === 'sbhzm') {
      mirror[r.source_origin] = r.n
    }
  }

  return c.json({
    ok: true,
    phase: 'D',
    upstreams: {
      laplace: mirror.laplace > 0,
      sbhzm: mirror.sbhzm > 0 || sbhzmCacheRow !== null,
      cb: true,
    },
    mirror,
    sbhzm_cache: sbhzmCacheRow
      ? { fetched_at: sbhzmCacheRow.fetched_at, age_minutes: Math.round(sbhzmAgeMin ?? 0) }
      : null,
  })
})

app.get('/admin', c => c.html(ADMIN_HTML))

app.route('/', publicRoutes)
app.route('/admin', adminRoutes)

app.notFound(c => c.json({ error: 'not_found', path: new URL(c.req.url).pathname }, 404))

app.onError((err, c) => {
  console.error('[chatterbox-cloud]', err)
  return c.json({ error: 'internal', message: err.message }, 500)
})

/**
 * Worker 入口。除了 fetch 还要导出 scheduled 才能拿到 cron 触发。
 *
 * `wrangler dev --local` 不会自动跑 cron;手动触发用:
 *   curl 'http://localhost:8787/__scheduled?cron=*+%2F+15+*+*+*+*'
 * 或者直接调用 admin 端的 /admin/refresh-sbhzm(更易用,带鉴权)。
 */
export default {
  fetch: app.fetch.bind(app),
  async scheduled(_event: ScheduledEvent, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const t0 = Date.now()
        const result = await pullSbhzmIntoCache(env.DB)
        const elapsed = Date.now() - t0
        console.log(`[cron sbhzm] ${result.ok ? 'ok' : 'failed'} count=${result.count} elapsed=${elapsed}ms`)
      })()
    )
  },
}
