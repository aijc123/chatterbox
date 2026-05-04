# chatterbox-cloud

chatterbox userscript 的第三方烂梗后端。Cloudflare Workers + Hono + D1。

> 当前阶段:**Phase C**
> GET /memes 已经聚合 cb 自建库 + LAPLACE(per-request 边缘缓存)+ SBHZM(cron 每 15 分钟拉一次写 D1)。
> 任一上游挂掉只把响应里 `sources.<src>` 标 false,不会让端点失败。

## API

### 公开
- `GET  /health` — 状态探测;Phase C 起带 `sbhzm_cache.age_minutes`,运维用
- `GET  /memes` — 已合并的三源聚合列表
  - 参数:`?page=1&perPage=100&sortBy=lastCopiedAt|copyCount|createdAt&tag=&source=cb|laplace|sbhzm|all&roomId=`
  - 响应里 `sources: { laplace, sbhzm, cb }` 表示各源本次是否成功;客户端据此决定要不要本地兜底直拉
  - 去重按 `content_hash`,优先级 自建 > LAPLACE > SBHZM
- `GET  /memes/random` — 随机一条已批准
- `GET  /tags` — 全量 tag 字典(带计数)
- `POST /memes` — 提交贡献,进 `pending` 队列;同 `content_hash` 自动 dedup
- `POST /memes/:id/copy` — 复制计数 +1(只对自建已批准生效)
- `POST /memes/bulk-mirror` — Phase D 用户镜像投喂。客户端把自己刚 fetch 到的 LAPLACE/SBHZM 数据 INSERT OR IGNORE 进 `memes`,让自建库逐步覆盖三个源
  - body:`{ source: 'laplace' | 'sbhzm', items: MirrorItem[] }`,`MirrorItem` 至少需要 `content`,可选 `id`、`uid`、`copyCount`、`lastCopiedAt`、`createdAt`、`updatedAt`、`username`、`avatar`
  - 限制:单次最多 200 条 → 413;每个 IP hash 每小时最多 60 次 → 429;`source` 缺失或非法 → 422;非 JSON body → 400
  - 响应:`{ inserted, skipped, total }`,`content_hash` UNIQUE 决定 inserted vs skipped
  - 鉴权:无,但每次调用都会按 IP hash 计数

### 管理(Bearer token)
- `GET   /admin/pending` — 待审列表
- `POST  /admin/memes/:id/approve` — 批准(可附 `tagNames`、`note`)
- `POST  /admin/memes/:id/reject`  — 拒绝(可附 `note`)
- `PATCH /admin/memes/:id`         — 改 content / status / tag / note
- `GET   /admin/stats`             — 各状态计数 + 24h 提交频率
- `POST  /admin/refresh-sbhzm`     — Phase C:手动触发 SBHZM 上游拉取(不必等 15min cron)
- `GET   /admin`                   — 静态管理页(HTML+vanilla JS)

### 定时任务(Phase C)
- 每 15 分钟自动拉一次 SBHZM 全量,归一后写入 `upstream_sbhzm_cache` 表
- LAPLACE 不走 cron,改成 GET /memes 处理路径中按需 fetch + 写 Cloudflare 边缘缓存(5min TTL)。
  原因:LAPLACE 也跑在 Workers,延迟低 + 数据稳定;边缘缓存比 cron 实时性好且零运维。

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

```bash
# 一次性
wrangler login
wrangler d1 create chatterbox-cloud   # 把返回的 database_id 填进 wrangler.jsonc
wrangler secret put IP_HASH_SALT      # 任意随机字符串,用于 IP 哈希盐
wrangler d1 migrations apply chatterbox-cloud --remote
bun scripts/gen-admin-key.ts owner
wrangler d1 execute chatterbox-cloud --remote --command "INSERT INTO api_keys ..."

# 之后每次发版
wrangler deploy
```

新加 schema 改动时:写新的 `migrations/0002_*.sql`,**永不修改已应用的 migration**,
然后 `wrangler d1 migrations apply --remote`。

## 后续阶段

**Phase C** 会在 `routes/public.ts` 的 `GET /memes` 里追加:
- 调 `lib/upstream-laplace.ts` 拉 LAPLACE,边缘 cache 5 分钟
- 读 `upstream_sbhzm_cache` 表(由 cron 每 15 分钟从 SBHZM 拉新写入)
- 走 `lib/merge.ts` 按 `content_hash` 去重 + 按源标记
- 响应里 `sources.{laplace,sbhzm,cb}` 改成实测可用性
