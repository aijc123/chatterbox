import { join } from 'node:path'

import { projectRoot, run } from './lib/release-checks.ts'

interface Step {
  name: string
  fn: () => void | Promise<void>
}

interface StepResult {
  name: string
  ok: boolean
  durationMs: number
  error?: Error
}

const skipInstall = process.env.SKIP_INSTALL === '1'

const steps: Step[] = [
  ...(skipInstall
    ? []
    : [
        {
          name: 'Install dependencies (frozen lockfile)',
          fn: () => {
            run(['bun', 'install', '--frozen-lockfile'])
          },
        },
      ]),
  {
    name: 'Lint and format check (biome ci)',
    fn: () => {
      run(['bun', 'x', 'biome', 'ci', '.'])
    },
  },
  {
    // Fails fast (no install / build cost upstream of it) if anyone drops
    // `--isolate` from a `bun test` invocation. Cross-file mock.module leaks
    // silently produce wrong test results — see `scripts/check-test-isolate.ts`.
    name: 'Test isolation guard (--isolate present on every bun test)',
    fn: () => {
      run(['bun', 'scripts/check-test-isolate.ts'])
    },
  },
  {
    name: 'Unit tests (bun test)',
    fn: () => {
      // Scope to tests/ — server/ has its own vitest pool-workers suite that
      // bun cannot run (it imports the virtual `cloudflare:test` module).
      run(['bun', 'test', '--isolate', 'tests'])
    },
  },
  {
    name: 'Server tests (vitest pool-workers)',
    fn: () => {
      run(['bun', 'run', 'test'], { cwd: join(projectRoot, 'server') })
    },
  },
  {
    name: 'Version consistency (pre)',
    fn: () => {
      run(['bun', 'scripts/check-version-consistency.ts'])
    },
  },
  {
    name: 'Build (tsc + vite)',
    fn: () => {
      run(['bun', 'run', 'build'])
    },
  },
  {
    name: 'Validate userscript artifact',
    fn: () => {
      run(['bun', 'scripts/validate-artifact.ts', '--no-bundle-analysis'])
    },
  },
  {
    name: 'Bundle size budget',
    fn: () => {
      run(['node', 'scripts/analyze-bundle.mjs'])
    },
  },
]

const results: StepResult[] = []
for (const step of steps) {
  const start = Date.now()
  console.log(`\n=== ${step.name} ===`)
  try {
    await step.fn()
    results.push({ name: step.name, ok: true, durationMs: Date.now() - start })
  } catch (err) {
    const durationMs = Date.now() - start
    const error = err instanceof Error ? err : new Error(String(err))
    results.push({ name: step.name, ok: false, durationMs, error })
    break
  }
}

console.log('\n=== Summary ===')
for (const r of results) {
  const status = r.ok ? '✓' : '✗'
  console.log(`${status} ${r.name} (${(r.durationMs / 1000).toFixed(1)}s)`)
}
const failed = results.find(r => !r.ok)
if (failed) {
  console.error(`\nFailed at: ${failed.name}`)
  if (failed.error) console.error(failed.error.message)
  process.exit(1)
}
console.log('\nAll release checks passed.')
