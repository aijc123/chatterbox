import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { beforeAll } from 'vitest'

// `applyD1Migrations` + `env` still ship from `cloudflare:test` in
// pool-workers 0.16 (the latter is marked `@deprecated` in the new types;
// canonical replacement is `import { env } from 'cloudflare:workers'`).
// We keep the `cloudflare:test` imports here for now so this PR stays
// surgical — the rest of the test suite (admin/public/upstream-sbhzm) also
// still uses `cloudflare:test`, and the deprecation re-exports mean every
// test keeps working without a sweep. A follow-up PR can migrate the
// suite to the canonical imports.
import { applyD1Migrations, env } from 'cloudflare:test'

// `Cloudflare.Env` is the new global env-binding interface that both
// `cloudflare:workers` and (via deprecated re-export) `cloudflare:test`
// resolve to in pool-workers 0.13+. Augment it here with the test-only
// bindings declared in `vitest.config.ts` → `miniflare.bindings`.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      IP_HASH_SALT: string
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})
