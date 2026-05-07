import { readFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const bundlePath = new URL('../dist/bilibili-live-wheel-auto-follow.user.js', import.meta.url)
const budgetKb = Number.parseFloat(process.env.BUNDLE_BUDGET_KB ?? '1000')
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
