#!/usr/bin/env bun
/**
 * Load test for the chatterbox-cloud backend.
 *
 * Why this exists: unit tests assert correctness for individual requests.
 * They don't tell us how the service behaves under sustained load —
 * whether p99 latency stays sane, whether D1 connection limits start to
 * bite, whether anything leaks under contention. This script puts a
 * configurable concurrent load on the most-hit endpoints and asserts
 * latency / error budgets.
 *
 * Prereq: a running backend at LOAD_TARGET_URL.
 *   - Local dev: `cd server && bun run dev` then this script defaults to
 *     http://127.0.0.1:8787.
 *   - Staging: `LOAD_TARGET_URL=https://chatterbox-cloud-staging.workers.dev`.
 *
 * NEVER run this against the production deployment — it will burn through
 * your D1 read budget and trip Cloudflare WAF.
 *
 * Run:
 *   bun run loadtest:server
 *   LOAD_DURATION=30 LOAD_CONNECTIONS=20 bun run loadtest:server
 *
 * Exit code 1 when error rate > LOAD_MAX_ERROR_RATE (default 1 %) or p99
 * latency > LOAD_MAX_P99_MS (default 1000 ms). CI gate uses these.
 */

import autocannon from 'autocannon'

const TARGET = process.env.LOAD_TARGET_URL ?? 'http://127.0.0.1:8787'
const DURATION_S = Number.parseInt(process.env.LOAD_DURATION ?? '15', 10)
const CONNECTIONS = Number.parseInt(process.env.LOAD_CONNECTIONS ?? '10', 10)
const MAX_ERROR_RATE = Number.parseFloat(process.env.LOAD_MAX_ERROR_RATE ?? '0.01')
const MAX_P99_MS = Number.parseInt(process.env.LOAD_MAX_P99_MS ?? '1000', 10)

if (TARGET.includes('chatterbox-cloud.aijc-eric.workers.dev') && !process.env.I_REALLY_MEAN_PRODUCTION) {
  console.error(
    '[loadtest] Refusing to load-test the production deployment. Set ' +
      "I_REALLY_MEAN_PRODUCTION=1 to override (please don't)."
  )
  process.exit(2)
}

console.log(`[loadtest] target=${TARGET} duration=${DURATION_S}s connections=${CONNECTIONS}`)

/**
 * Each scenario hits one read-mostly endpoint. We avoid POSTs in the default
 * suite because:
 *   1. they consume D1 write budget on staging
 *   2. /memes POST is rate-limited to 30/h/IP — the load test would hit the
 *      cap in seconds and the rest of the run would just measure 429 latency
 * To stress the write path, override LOAD_SCENARIO=mirror (see below).
 */
const scenarios = {
  list: {
    method: 'GET',
    path: '/memes?perPage=20',
    description: 'paginated meme list',
  },
  random: {
    method: 'GET',
    path: '/memes/random',
    description: 'random single meme (worst-case ORDER BY RANDOM)',
  },
  mixed: {
    // Mixed read pattern — autocannon picks one per request via `requests` array.
    method: 'GET',
    path: '/memes?perPage=20',
    requests: [
      { method: 'GET', path: '/memes?perPage=20' },
      { method: 'GET', path: '/memes?perPage=50' },
      { method: 'GET', path: '/memes/random' },
      { method: 'GET', path: '/memes?source=cb&perPage=20' },
    ],
    description: 'mixed list + random + filtered',
  },
}

const scenarioName = process.env.LOAD_SCENARIO ?? 'mixed'
const scenario = scenarios[scenarioName]
if (!scenario) {
  console.error(`[loadtest] Unknown LOAD_SCENARIO=${scenarioName}. Choices: ${Object.keys(scenarios).join(', ')}`)
  process.exit(2)
}
console.log(`[loadtest] scenario=${scenarioName} (${scenario.description})`)

const result = await autocannon({
  url: TARGET,
  connections: CONNECTIONS,
  duration: DURATION_S,
  method: scenario.method,
  path: scenario.path,
  requests: scenario.requests,
  headers: {
    'user-agent': 'chatterbox-loadtest/1.0',
  },
})

const reqTotal = result.requests.total
const errorRate = reqTotal > 0 ? (result.errors + result.timeouts + result.non2xx) / reqTotal : 0

console.log('')
console.log('[loadtest] === results ===')
console.log(`  requests:    ${reqTotal} total (${result.requests.average.toFixed(1)}/s avg)`)
console.log(
  `  latency:     ${result.latency.p50.toFixed(0)}ms p50 / ${result.latency.p99.toFixed(0)}ms p99 / ${result.latency.max.toFixed(0)}ms max`
)
console.log(`  throughput:  ${(result.throughput.average / 1024).toFixed(1)} KB/s avg`)
console.log(`  errors:      ${result.errors} network + ${result.timeouts} timeouts + ${result.non2xx} non-2xx`)
console.log(`  error_rate:  ${(errorRate * 100).toFixed(2)}% (budget ${(MAX_ERROR_RATE * 100).toFixed(2)}%)`)

let failed = false
if (errorRate > MAX_ERROR_RATE) {
  console.error(
    `[loadtest] ❌ error rate ${(errorRate * 100).toFixed(2)}% > budget ${(MAX_ERROR_RATE * 100).toFixed(2)}%`
  )
  failed = true
}
if (result.latency.p99 > MAX_P99_MS) {
  console.error(`[loadtest] ❌ p99 latency ${result.latency.p99.toFixed(0)}ms > budget ${MAX_P99_MS}ms`)
  failed = true
}

if (failed) process.exit(1)
console.log('[loadtest] ✅ within budgets.')
