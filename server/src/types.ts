/**
 * Hono Bindings —— `c.env` 的类型。Workers 运行时依据 wrangler.jsonc 注入。
 */
export interface AppBindings {
  DB: D1Database
  /** 用于 hashIp 的 salt(避免 IP 直接落库被关联)。在 wrangler dev 里用默认值;生产用 secret put。 */
  IP_HASH_SALT?: string
}

export type AppEnv = { Bindings: AppBindings }

/**
 * 后端响应的梗形态。字段对齐 userscript 端 `LaplaceInternal.HTTPS.Workers.MemeWithUser`,
 * 这样 userscript 直接复用现有渲染逻辑,不需要再做归一。
 *
 * 这里手写一份是为了避免在 Workers 里直接吃 `@laplace.live/internal` 的 Node 依赖。
 * Phase B 会把这份 + 客户端的 `LaplaceMemeWithSource` 抽到仓库根的 shared/ 目录。
 */
export interface CbTag {
  id: number
  name: string
  color: string | null
  emoji: string | null
  icon: string | null
  description: string | null
  count: number
}

export interface CbMeme {
  id: number
  uid: number
  content: string
  tags: CbTag[]
  copyCount: number
  lastCopiedAt: string | null
  createdAt: string
  updatedAt: string
  username: string | null
  avatar: string | null
  room: unknown | null
  _source: 'cb' | 'laplace' | 'sbhzm'
}

export interface CbMemeListResponse {
  items: CbMeme[]
  total: number
  page: number
  perPage: number
  /** 各源本次是否成功(false 表示该源被跳过/降级)。Phase A 永远是 cb=true 其他=false。 */
  sources: { laplace: boolean; sbhzm: boolean; cb: boolean }
}
