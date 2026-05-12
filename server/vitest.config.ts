import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Upgraded to @cloudflare/vitest-pool-workers 0.16+ (Vitest 4 era). The 0.13.0
// release of pool-workers replaced `defineWorkersConfig` + `pool: '@cloudflare/
// vitest-pool-workers'` + `poolOptions.workers` with the `cloudflareTest()`
// Vite plugin. See the 0.13.0 entry in
// https://github.com/cloudflare/workers-sdk/blob/main/packages/vitest-pool-workers/CHANGELOG.md
//
// Behavior changes vs the previous config:
//  - `singletonScript: true` is no longer a knob. The new isolation model is
//    per-test-file by default. To force the old "one worker shared across
//    files" behavior, pass `--max-workers=1 --no-isolate` on the CLI. We
//    didn't rely on singleton state — `apply-migrations.ts` is idempotent.
//  - `pool: '@cloudflare/vitest-pool-workers'` + `poolOptions.workers` are
//    replaced by adding `cloudflareTest({...})` as a Vite plugin. The same
//    `wrangler` / `miniflare` config goes inside the plugin call.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'migrations'))
  return {
    plugins: [
      cloudflareTest({
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
      }),
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
    },
  }
})
