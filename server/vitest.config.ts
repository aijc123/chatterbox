import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'))
  return {
    test: {
      pool: '@cloudflare/vitest-pool-workers',
      setupFiles: ['./test/apply-migrations.ts'],
      poolOptions: {
        workers: {
          singletonScript: true,
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            // Production wrangler.jsonc deliberately omits `nodejs_compat`,
            // but @cloudflare/vitest-pool-workers requires it (its host
            // worker imports node:* internals). Add it for tests only —
            // production deploys still ship without it.
            compatibilityFlags: ['nodejs_compat'],
            bindings: {
              TEST_MIGRATIONS: migrations,
              IP_HASH_SALT: 'test-salt',
            },
          },
        },
      },
    },
  }
})
