import { readFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const bundlePath = new URL('../dist/bilibili-live-wheel-auto-follow.user.js', import.meta.url)
// Hard-coded budget. Bumped 1000 → 1024 KB (24 KB headroom) when the opt-in
// /radar/report aggregator landed and pushed the raw bundle to 1000.79 KB
// (gzip 249.66 KB, brotli 194.43 KB — both still well under any practical
// userscript distribution limit).
// Bumped 1024 → 1120 KB when Chatfilter (前端弹幕语义归一化 + 观察日志面板)
// landed — raw 1057.52 KB / gzip 278.02 KB after M0-M3. 60 KB headroom for
// M4-M6 (远程聚类客户端 + 同义折叠 + replacement 学习喂数据)；任何超出再走 PR。
//
// 安全:之前用 `process.env.BUNDLE_BUDGET_KB ?? '1024'` 允许用环境变量覆盖,
// 等于 CI 里随便 export 一下就能让"超预算"的构建静默通过——预算就失去意义了。
// 现在写死;调整预算 = 改这一行 = 走 PR review。
const BUDGET_KB = 1120
const bundle = readFileSync(bundlePath)

const rawKb = bundle.byteLength / 1024
const gzipKb = gzipSync(bundle).byteLength / 1024
const brotliKb = brotliCompressSync(bundle).byteLength / 1024

console.log(`Bundle: ${rawKb.toFixed(2)} kB raw`)
console.log(`Gzip:   ${gzipKb.toFixed(2)} kB`)
console.log(`Brotli: ${brotliKb.toFixed(2)} kB`)
console.log(`Budget: ${BUDGET_KB.toFixed(2)} kB raw`)

if (rawKb > BUDGET_KB) {
  console.error(`Bundle exceeds budget by ${(rawKb - BUDGET_KB).toFixed(2)} kB`)
  process.exitCode = 1
}
