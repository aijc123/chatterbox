import { getAutoBlendPresetValues } from '../src/lib/auto-blend-preset-config.ts'
import { formatAutoBlendCandidate, formatAutoBlendStatus } from '../src/lib/auto-blend-status.ts'

function assertEqual<T>(name: string, actual: T, expected: T): void {
  if (actual !== expected) {
    console.error(`FAIL ${name}`)
    console.error(`  expected: ${String(expected)}`)
    console.error(`  actual:   ${String(actual)}`)
    process.exitCode = 1
    return
  }
  console.log(`PASS ${name}`)
}

console.log('Auto-follow state checks')
console.log('='.repeat(40))

const now = 1_000_000

assertEqual(
  'status: disabled wins',
  formatAutoBlendStatus({ enabled: false, isSending: true, cooldownUntil: now + 10_000, now }),
  '已关闭'
)
assertEqual(
  'status: sending wins over cooldown',
  formatAutoBlendStatus({ enabled: true, isSending: true, cooldownUntil: now + 10_000, now }),
  '正在跟车'
)
assertEqual(
  'status: cooldown countdown rounds up',
  formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: now + 1201, now }),
  '冷却中 2s'
)
assertEqual(
  'status: observing after cooldown',
  formatAutoBlendStatus({ enabled: true, isSending: false, cooldownUntil: now - 1, now }),
  '观察中'
)

assertEqual('candidate: empty clears to placeholder', formatAutoBlendCandidate([]), '暂无')
assertEqual(
  'candidate: single message is not shown',
  formatAutoBlendCandidate([{ text: '还不算刷屏', totalCount: 1, uniqueUsers: 1 }]),
  '暂无'
)
assertEqual(
  'candidate: picks most repeated text',
  formatAutoBlendCandidate([
    { text: '一般路过', totalCount: 2, uniqueUsers: 2 },
    { text: '主播好强主播好强主播好强主播好强', totalCount: 5, uniqueUsers: 3 },
  ]),
  '主播好强主播好强主播好强主播好强（3 人 / 5 条）'
)

const normal = getAutoBlendPresetValues('normal')
assertEqual('preset: normal window', normal.windowSec, 15)
assertEqual('preset: normal threshold', normal.threshold, 3)
assertEqual('preset: normal cooldown', normal.cooldownSec, 15)
assertEqual('preset: resets @ replies', normal.includeReply, false)
assertEqual('preset: requires multiple users', normal.requireDistinctUsers, true)
assertEqual('preset: resets send count', normal.sendCount, 1)
assertEqual('preset: resets all-trending blast', normal.sendAllTrending, false)
assertEqual('preset: keeps replacement rules on', normal.useReplacements, true)

if (process.exitCode) {
  console.log('='.repeat(40))
  console.log('Auto-follow checks failed')
  process.exit(process.exitCode)
}

console.log('='.repeat(40))
console.log('All auto-follow checks passed')
