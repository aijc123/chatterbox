import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'
import { beforeAll } from 'vitest'

import { applyD1Migrations, env } from 'cloudflare:test'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
    IP_HASH_SALT: string
    TEST_MIGRATIONS: D1Migration[]
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})
