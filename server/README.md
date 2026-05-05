# chatterbox-cloud

chatterbox userscript 的第三方烂梗后端。Cloudflare Workers + Hono + D1。

> 当前阶段:**Phase D.1**
> GET /memes 返回的所有内容都来自自建 `memes` 表(`source_origin` 字段标 `cb` / `laplace` / `sbhzm`)。
> LAPLACE 数据由 userscript 用户经 `POST /memes/bulk-mirror` 推上来,SBHZM 数据由前端常态 mirror + 后端 6h cron 兜底获得。
> 后端**不再主动 fetch LAPLACE 上游**,SBHZM cron 也只在 12h 内没有用户 mirror 活动时才出手(liveness gate)。
> 任一源在本次响应里没拿到内容只把 `sources.<src>` 标 false,不会让端点失败。

## API

### 公开
- `GET  /health` — 状态探测,运维用。响应:`{ ok, phase, upstreams: {laplace, sbhzm, cb}, mirror: {cb, laplace, sbhzm}, sbhzm_cache }`。`mirror.<src>` 是 memes 表里该 source_origin 的当前条数;`sbhzm_cache` 是 legacy `upstream_sbhzm_cache` 表的最新行 age(若表已退役清空则为 null)。
- `GET  /memes` — 已合并的三源聚合列表(全部来自 `memes` 表,SBHZM legacy cache 仅作冷启动兜底)
  - 参数:`?page=1&perPage=100&sortBy=lastCopiedAt|copyCount|createdAt&tag=&source=cb|laplace|sbhzm|all&roomId=`
  - 响应里 `sources: { laplace, sbhzm, cb }` 表示各源本次是否有数据可返回;客户端据此决定要不要本地兜底直拉(然后通过 bulk-mirror 推回)
  - 去重按 `content_hash`,优先级 自建 > LAPLACE > SBHZM
- `GET  /memes/random` — 随机一条已批准
- `GET  /tags` — 全量 tag 字典(带计数)。Phase D.1 起由 bulk-mirror 和 SBHZM cron 自动 upsert
- `POST /memes` — 提交贡献,进 `pending` 队列;同 `content_hash` 自动 dedup;同 IP hash 每小时 ≤30 次,过限 429
- `POST /memes/:id/copy` — 复制计数 +1(单条,旧客户端兼容)
- `POST /memes/copy/batch` — 批量复制计数(新客户端 debounce 聚合,N+1 → 1 round-trip)
- `POST /memes/bulk-mirror` — userscript 镜像投喂。客户端把自己刚 fetch 到的 LAPLACE/SBHZM 数据 INSERT OR IGNORE 进 `memes`,顺便 upsert 上游 tags。让自建库逐步覆盖三个源
  - body:`{ source: 'laplace' | 'sbhzm', items: MirrorItem[] }`
  - `MirrorItem` 至少需要 `content`,可选 `id`、`uid`、`copyCount`、`lastCopiedAt`、`createdAt`、`updatedAt`、`username`、`avatar`、`tags`
  - `tags` 形态:`Array<string | { name: string; color?: string; emoji?: string }>`;每条 meme 最多 8 个 tag,name ≤40 字、color ≤32、emoji ≤16,超出/不合规静默丢
  - 服务端用 `content_hash` 反查现有行 attach tag,**也回填**之前已经在库里但缺 tag 的旧梗
  - 限制:单次最多 200 条 → 413;每个 IP hash 每小时最多 60 次 → 429;`source` 缺失或非法 → 422;非 JSON body → 400
  - 响应:`{ inserted, skipped, invalid, tagsLinked, total }`;`content_hash` UNIQUE 决定 inserted vs skipped,`tagsLinked` 包含新插行 + 旧行回填
  - 鉴权:无,但每次调用都会按 IP hash 计数

### 管理(Bearer token)
- `GET   /admin/pending` — 待审列表
- `POST  /admin/memes/:id/approve` — 批准(可附 `tagNames`、`note`)
- `POST  /admin/memes/:id/reject`  — 拒绝(可附 `note`)
- `PATCH /admin/memes/:id`         — 改 content / status / tag / note
- `GET   /admin/stats`             — 各状态计数 + 24h 提交频率
- `POST  /admin/refresh-sbhzm`     — 手动触发 SBHZM 拉取,直接写 `memes` 表(50 页 ≈ 5000 条);**绕过 6h cron 的 12h liveness gate**,带 admin 鉴权
- `GET   /admin`                   — 静态管理页(HTML+vanilla JS)

### 定时任务(Phase D.1)
- 每 6 小时跑一次 `pullSbhzmIfStale`(cron `0 */6 * * *`):
  - 先 GC `upstream_sbhzm_cache` 里 1 天前的旧行(legacy 表收尾,Phase D.1 已不再写入)
  - 查 `contributions` 表:若过去 12h 有任意非-cron 的 SBHZM mirror → 跳过(用户活跃,前端在保鲜)
  - 否则拉首 10 页 SBHZM,归一后 INSERT OR IGNORE 进 `memes`,顺便 upsert tags 关系
- LAPLACE 完全不走 cron,后端不主动 fetch。所有 LAPLACE 内容靠 userscript 用户经 bulk-mirror 推上来
  - 原因:从 SBHZM/LAPLACE 站长视角看,bulk-mirror 是真实用户流量(分散 IP、自然分布),而不是 Cloudflare 出口 IP 周期扫表,显著降低被屏蔽风险

## 本地开发

> **注意**(Windows + OneDrive): 仓库在 OneDrive 路径下时 wrangler 的 miniflare
> 子依赖会被锁/截断。本仓库已经实测过用 `npm install` 在仓库外建一份隔离 wrangler
> 的方式跑通(见下方"OneDrive workaround")。Bun 直接 install + run 在 Windows
> + OneDrive 组合下不可用。

### 标准流程(Linux / macOS / Windows 非 OneDrive)

```bash
cd server
bun install                                       # 装 hono + dev deps
bunx wrangler d1 migrations apply chatterbox-cloud --local
bunx wrangler d1 execute chatterbox-cloud --local --file=seeds/dev-memes.sql   # 可选种子
bun scripts/gen-admin-key.ts owner                # 生成 admin token
# 把上一步打印的 SQL 喂给 wrangler:
bunx wrangler d1 execute chatterbox-cloud --local --command "INSERT INTO api_keys ..."
bunx wrangler dev --local --port 8787
# → http://localhost:8787 (curl /health)
# → http://localhost:8787/admin (粘 token 登录)
```

### OneDrive workaround(Windows)

```bash
# 一次性,把 wrangler 装到 OneDrive 外:
mkdir -p /tmp/cb-wrangler && cd /tmp/cb-wrangler
echo '{"name":"cb-wrangler-runner","private":true,"type":"module","dependencies":{"wrangler":"^4.0.0"}}' > package.json
npm install

# 之后所有 wrangler 命令在 server 目录里跑,但用 /tmp 的二进制:
cd /path/to/chatterbox/server
WR=/tmp/cb-wrangler/node_modules/.bin/wrangler
$WR d1 migrations apply chatterbox-cloud --local
$WR d1 execute chatterbox-cloud --local --file=seeds/dev-memes.sql
$WR dev --local --port 8787
```

`bun scripts/gen-admin-key.ts` 不受这个 workaround 影响 —— 它只用 Node 原生
crypto,不进 miniflare。

## 部署

> ⚠️ **后端不会随 userscript release 自动发布。**
> `release.yml` 只把 userscript build 推到 GitHub Pages;chatterbox-cloud 必须
> maintainer 手动 `wrangler deploy`。release.yml 在 `server/` 自上次 tag 起
> 有任何变更时会在 workflow summary 顶部贴红色提醒,但 **不阻塞** 用户脚本发布
> (有意:大多数 release 只动 userscript,后端没改的时候不能让流水线挂等
> 一个不存在的部署步骤)。

```bash
# 一次性
wrangler login
wrangler d1 create chatterbox-cloud   # 把返回的 database_id 填进 wrangler.jsonc
wrangler secret put IP_HASH_SALT      # 任意随机字符串,用于 IP 哈希盐
wrangler d1 migrations apply chatterbox-cloud --remote
bun scripts/gen-admin-key.ts owner
wrangler d1 execute chatterbox-cloud --remote --command "INSERT INTO api_keys ..."

# 之后每次发版(release.yml workflow summary 提醒命中时跑)
cd server
wrangler d1 migrations apply chatterbox-cloud --remote   # 仅当本次有新 migration
wrangler deploy
```

新加 schema 改动时:写新的 `migrations/0002_*.sql`,**永不修改已应用的 migration**,
然后 `wrangler d1 migrations apply --remote`。

### 什么时候真的需要 `wrangler deploy`?

`server/` 下任意 `.ts` / `.sql` / `wrangler.jsonc` / 路由 / lib 改动都要部署 ——
release.yml 里的 "Server deploy reminder" 步骤会自动判断,看 workflow summary 即可。

只动 `server/README.md` / `server/*.test.ts` / `seeds/` 一类纯文档或测试文件时,
按提醒文案对照变更内容判断:不影响产线行为的纯文档 / 测试改动可以跳过。

## 演进历史

- **Phase A/B**:基础 schema + 公开/管理路由 + admin token 鉴权,GET /memes 仅返回自建 cb 内容。
- **Phase C**:GET /memes 聚合三源 —— LAPLACE 走 per-request 边缘缓存,SBHZM 走 cron 每 15 分钟写 `upstream_sbhzm_cache` 表。
- **Phase D**:加 `source_origin` / `external_id` 列 + `POST /memes/bulk-mirror`。userscript 把自己 fetch 的 LAPLACE/SBHZM 数据 INSERT OR IGNORE 进 `memes`,自建库逐步覆盖三源。
- **Phase D.1**(当前):
  - 后端不再主动 fetch LAPLACE。
  - SBHZM cron 从 15min 退化成 6h + 12h liveness gate,且**直接写 memes 表**而不是 cache 表。
  - `upstream_sbhzm_cache` 表退役,旧行 1 天 GC,只保留 cold-start 兜底读路径。
  - bulk-mirror 和 cron 路径都接收上游 `tags` 字段,upsert 进 `tags` + `meme_tags` 两表;用 `content_hash` 反查 attach,既覆盖新插行也回填历史无 tag 行。
