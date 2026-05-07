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
import { pullSbhzmIfStale, resolveSbhzmListUrl, resolveSbhzmStaleHours } from './lib/upstream-sbhzm'
import { adminRoutes } from './routes/admin'
import { publicRoutes } from './routes/public'

const app = new Hono<AppEnv>()

// 公开 endpoint(`/memes` 等)需要被 Bilibili 页面里的 userscript 跨域调用,
// 所以保留 wildcard CORS。但 `/admin/*` 故意不挂 CORS:管理 UI 是同源的(由
// `app.get('/admin', ...)` 直接吐 HTML),浏览器原生 same-origin 就能用 fetch,
// 不需要任何 `Access-Control-Allow-Origin`。这样即便 admin 的 Bearer token 真泄了,
// 也不能从 attacker.example 直接调用 admin API —— 浏览器会被 CORS 拦下来。
const publicCors = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
})
app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  // /admin 自身和 /admin/* 都跳过 CORS,其他 path 走 wildcard。
  if (path === '/admin' || path.startsWith('/admin/')) return next()
  return publicCors(c, next)
})

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
  // err.message 可能含 D1 query / 上游 fetch 细节,直接返给客户端会泄露内部结构。
  // 走日志,响应只回一个稳定的错误码。
  console.error('[chatterbox-cloud]', err)
  return c.json({ error: 'internal' }, 500)
})

/**
 * Worker 入口。除了 fetch 还要导出 scheduled 才能拿到 cron 触发。
 *
 * Phase D.1 起 cron 走 `pullSbhzmIfStale`:
 *  - 先查 contributions 表,若过去 12h 有用户级 SBHZM mirror → 跳过(用户在线,
 *    前端正在贡献,后端不必出手)
 *  - 否则才低频拉首 10 页 INSERT OR IGNORE 进 memes 表
 *  - 每次顺便 GC 1 天前的旧 upstream_sbhzm_cache 行
 *
 * `wrangler dev --local` 不会自动跑 cron;手动触发用:
 *   curl 'http://localhost:8787/__scheduled?cron=0+*%2F6+*+*+*'
 * 或者直接调用 admin 端的 /admin/refresh-sbhzm(更易用,带鉴权,绕过 gate)。
 */
export default {
  fetch: app.fetch.bind(app),
  async scheduled(_event: ScheduledEvent, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const t0 = Date.now()
        // 包一层 try/catch:cron 内部任一抛错(D1 throttle、上游 fetch 异常、解析失败)
        // 都得显式打印,否则会被 Workers runtime 静默吞掉,只在 dashboard 的 invocation
        // logs 里留个红条,我们看不到根因。
        try {
          const result = await pullSbhzmIfStale(env.DB, {
            listUrl: resolveSbhzmListUrl(env),
            staleThresholdHours: resolveSbhzmStaleHours(env),
          })
          const elapsed = Date.now() - t0
          if (result.skipped) {
            // Cloudflare Workers cron — console is the only sink visible to dashboard logs.
            // skipcq: JS-0002
            console.log(
              `[cron sbhzm] skipped reason=${result.reason} actor=${result.recentActivity?.actor} elapsed=${elapsed}ms`
            )
          } else {
            const p = result.pull
            const ok = p?.ok === true
            const level = ok ? 'log' : 'error'
            console[level](
              `[cron sbhzm] ran ok=${ok} fetched=${p?.fetched ?? 0} inserted=${p?.inserted ?? 0} elapsed=${elapsed}ms`
            )
          }
        } catch (err) {
          const elapsed = Date.now() - t0
          console.error('[cron sbhzm] threw', {
            elapsed,
            err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
          })
        }
      })()
    )
  },
}
