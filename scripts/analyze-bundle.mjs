import { readFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const bundlePath = new URL('../dist/bilibili-live-wheel-auto-follow.user.js', import.meta.url)
// Default budget bumped 1000 → 1024 KB (24 KB headroom) when the opt-in
// /radar/report aggregator landed and pushed the raw bundle to 1000.79 KB
// (gzip 249.66 KB, brotli 194.43 KB — both still well under any practical
// userscript distribution limit). Override via BUNDLE_BUDGET_KB env var.
const budgetKb = Number.parseFloat(process.env.BUNDLE_BUDGET_KB ?? '1024')
const bundle = readFileSync(bundlePath)

const rawKb = bundle.byteLength / 1024
const gzipKb = gzipSync(bundle).byteLength / 1024
const brotliKb = brotliCompressSync(bundle).byteLength / 1024

console.log(`Bundle: ${rawKb.toFixed(2)} kB raw`)
console.log(`Gzip:   ${gzipKb.toFixed(2)} kB`)
console.log(`Brotli: ${brotliKb.toFixed(2)} kB`)
console.log(`Budget: ${budgetKb.toFixed(2)} kB raw`)

if (rawKb > budgetKb) {
  console.error(`Bundle exceeds budget by ${(rawKb - budgetKb).toFixed(2)} kB`)
  process.exitCode = 1
}
