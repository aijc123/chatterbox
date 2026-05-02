// Targeted regression test for the Layer 1 wiring:
// `sendManualDanmaku` and `repeatDanmaku` must pass `enableAiEvasion: true`
// + `roomId` + `csrfToken` to `verifyBroadcast` so a shadow-banned send can
// trigger AI evasion + rule learning on the receiver side. Easy to drop on
// refactor; integration tests at the verifyBroadcast level wouldn't catch it.

import { beforeEach, describe, expect, mock, test } from 'bun:test'

interface VerifyArgs {
  text: string
  label: string
  display: string
  sinceTs: number
  isEmoticon?: boolean
  enableAiEvasion?: boolean
  roomId?: number
  csrfToken?: string
}
const verifyCalls: VerifyArgs[] = []

let enqueueResult = {
  success: true,
  message: '',
  isEmoticon: false,
  startedAt: 1234567890,
  cancelled: false,
}

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

// All `mock.module` calls below spread the real exports and only override
// what this test needs. bun's mock.module is process-wide; partial mocks
// would otherwise shadow the real impl for any test file that runs later
// (e.g. version-update.test.ts) and break their imports.

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({
  ...realApi,
  ensureRoomId: async () => 12345,
  getCsrfToken: () => 'csrf-token-fixture',
}))

const realSendQueue = await import('../src/lib/send-queue')
mock.module('../src/lib/send-queue', () => ({
  ...realSendQueue,
  enqueueDanmaku: async (msg: string) => ({ ...enqueueResult, message: msg }),
}))

const realSendVerification = await import('../src/lib/send-verification')
mock.module('../src/lib/send-verification', () => ({
  ...realSendVerification,
  verifyBroadcast: async (args: VerifyArgs) => {
    verifyCalls.push(args)
  },
}))

mock.module('../src/lib/log', () => ({
  appendLog: () => {},
  appendLogQuiet: () => {},
}))

const realGuardRoomSync = await import('../src/lib/guard-room-sync')
mock.module('../src/lib/guard-room-sync', () => ({
  ...realGuardRoomSync,
  classifyRiskEvent: () => ({ kind: 'send_failed', level: 'observe', advice: '' }),
  syncGuardRoomRiskEvent: async () => {},
}))

const realReplacement = await import('../src/lib/replacement')
mock.module('../src/lib/replacement', () => ({
  ...realReplacement,
  applyReplacements: (s: string) => s,
}))

const realEmoticon = await import('../src/lib/emoticon')
mock.module('../src/lib/emoticon', () => ({
  ...realEmoticon,
  isEmoticonUnique: () => false,
  isLockedEmoticon: () => false,
  formatLockedEmoticonReject: () => '',
}))

const realAiEvasion = await import('../src/lib/ai-evasion')
mock.module('../src/lib/ai-evasion', () => ({
  ...realAiEvasion,
  tryAiEvasion: async () => ({ success: false }),
}))

// Stub the alert-dialog so repeatDanmaku's `confirm` path doesn't need DOM.
mock.module('../src/components/ui/alert-dialog', () => ({
  showConfirm: async () => true,
}))

const { repeatDanmaku, sendManualDanmaku } = await import('../src/lib/danmaku-actions')

beforeEach(() => {
  verifyCalls.length = 0
  enqueueResult = {
    success: true,
    message: '',
    isEmoticon: false,
    startedAt: 1234567890,
    cancelled: false,
  }
})

describe('sendManualDanmaku → verifyBroadcast wiring', () => {
  test('passes enableAiEvasion=true + roomId + csrfToken on success', async () => {
    await sendManualDanmaku('hello')
    expect(verifyCalls).toHaveLength(1)
    expect(verifyCalls[0].enableAiEvasion).toBe(true)
    expect(verifyCalls[0].roomId).toBe(12345)
    expect(verifyCalls[0].csrfToken).toBe('csrf-token-fixture')
    expect(verifyCalls[0].label).toBe('手动')
    expect(verifyCalls[0].text).toBe('hello')
    expect(verifyCalls[0].sinceTs).toBe(1234567890)
  })

  test('does NOT call verifyBroadcast when enqueue is cancelled', async () => {
    enqueueResult = { ...enqueueResult, cancelled: true }
    await sendManualDanmaku('hello')
    expect(verifyCalls).toHaveLength(0)
  })

  test('does NOT call verifyBroadcast on API failure', async () => {
    enqueueResult = { ...enqueueResult, success: false }
    await sendManualDanmaku('hello')
    expect(verifyCalls).toHaveLength(0)
  })
})

describe('repeatDanmaku (+1) → verifyBroadcast wiring', () => {
  test('passes enableAiEvasion=true + roomId + csrfToken on success', async () => {
    await repeatDanmaku('hi')
    expect(verifyCalls).toHaveLength(1)
    expect(verifyCalls[0].enableAiEvasion).toBe(true)
    expect(verifyCalls[0].roomId).toBe(12345)
    expect(verifyCalls[0].csrfToken).toBe('csrf-token-fixture')
    expect(verifyCalls[0].label).toBe('+1')
  })

  test('does NOT call verifyBroadcast when enqueue is cancelled', async () => {
    enqueueResult = { ...enqueueResult, cancelled: true }
    await repeatDanmaku('hi')
    expect(verifyCalls).toHaveLength(0)
  })
})
