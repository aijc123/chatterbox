import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

// NOTE: deliberately do NOT mock guard-room-sync — bun's process-wide module
// mocks would then leak into `tests/guard-room-shadow-rule.test.ts` and
// replace the real impl with a spy. Instead we disable cloud sync at the data
// layer by leaving guardRoomEndpoint/guardRoomSyncKey empty so the REAL
// `syncGuardRoomShadowRule` no-ops. Cloud-uplink coverage is in
// `tests/guard-room-shadow-rule.test.ts`.

const appendLogCalls: string[] = []
mock.module('../src/lib/log', () => ({
  appendLog: (msg: string) => appendLogCalls.push(msg),
  appendLogQuiet: (msg: string) => appendLogCalls.push(msg),
}))

const {
  clearShadowBanObservations,
  learnShadowRules,
  promoteObservationToRule,
  recordShadowBanObservation,
  removeShadowBanObservation,
} = await import('../src/lib/shadow-learn')
const { autoLearnShadowRules, shadowBanObservations } = await import('../src/lib/store-shadow-learn')
const { localRoomRules } = await import('../src/lib/store-replacement')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store')

beforeEach(() => {
  appendLogCalls.length = 0
  shadowBanObservations.value = []
  localRoomRules.value = {}
  autoLearnShadowRules.value = true
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
})

afterEach(() => {
  shadowBanObservations.value = []
  localRoomRules.value = {}
})

describe('learnShadowRules', () => {
  test('writes (sensitiveWord → processText(word)) to localRoomRules', () => {
    learnShadowRules({
      roomId: 12345,
      sensitiveWords: ['上车冲鸭'],
      evadedMessage: '上­车­冲­鸭',
      originalMessage: '上车冲鸭',
    })

    const rules = localRoomRules.value['12345']
    expect(rules?.length).toBe(1)
    expect(rules?.[0].from).toBe('上车冲鸭')
    expect(rules?.[0].to).not.toBe('上车冲鸭')
    expect(rules?.[0].to.includes('­')).toBe(true)
  })

  test('skips when autoLearnShadowRules is off', () => {
    autoLearnShadowRules.value = false
    learnShadowRules({
      roomId: 1,
      sensitiveWords: ['屏蔽'],
      evadedMessage: '屏­蔽',
      originalMessage: '屏蔽',
    })
    expect(localRoomRules.value['1']).toBeUndefined()
  })

  test('does not overwrite existing rules with same `from`', () => {
    localRoomRules.value = { '7': [{ from: '屏蔽', to: '手动改写' }] }
    learnShadowRules({
      roomId: 7,
      sensitiveWords: ['屏蔽'],
      evadedMessage: 'x',
      originalMessage: '屏蔽',
    })
    expect(localRoomRules.value['7']).toEqual([{ from: '屏蔽', to: '手动改写' }])
  })

  test('caps total auto-learned rules per room', () => {
    const seedRules = Array.from({ length: 49 }, (_, i) => ({ from: `seed${i}`, to: `s${i}` }))
    localRoomRules.value = { '9': seedRules }
    learnShadowRules({
      roomId: 9,
      sensitiveWords: ['新词A', '新词B', '新词C'],
      evadedMessage: 'x',
      originalMessage: 'irrelevant',
    })
    const rules = localRoomRules.value['9']
    expect(rules?.length).toBe(50)
    expect(rules?.some(r => r.from === '新词C')).toBe(true)
    expect(rules?.[0].from).toBe('seed2')
  })

  test('skips empty / oversized sensitive words', () => {
    learnShadowRules({
      roomId: 1,
      sensitiveWords: ['', '   ', 'a'.repeat(200)],
      evadedMessage: 'x',
      originalMessage: 'y',
    })
    expect(localRoomRules.value['1']).toBeUndefined()
  })
})

describe('recordShadowBanObservation', () => {
  test('first occurrence creates a new entry', () => {
    recordShadowBanObservation({ text: '可疑文本', roomId: 1, evadedAlready: false })
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].count).toBe(1)
  })

  test('repeat occurrence increments count and updates ts', async () => {
    recordShadowBanObservation({ text: '可疑文本', roomId: 1, evadedAlready: false })
    const firstTs = shadowBanObservations.value[0].ts
    await new Promise(r => setTimeout(r, 5))
    recordShadowBanObservation({ text: '可疑文本', roomId: 1, evadedAlready: false })
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].count).toBe(2)
    expect(shadowBanObservations.value[0].ts).toBeGreaterThanOrEqual(firstTs)
  })

  test('different roomId is treated as a separate entry', () => {
    recordShadowBanObservation({ text: 'x', roomId: 1, evadedAlready: false })
    recordShadowBanObservation({ text: 'x', roomId: 2, evadedAlready: false })
    expect(shadowBanObservations.value).toHaveLength(2)
  })

  test('evadedAlready flag becomes sticky once true', () => {
    recordShadowBanObservation({ text: 't', roomId: 1, evadedAlready: false })
    recordShadowBanObservation({ text: 't', roomId: 1, evadedAlready: true })
    recordShadowBanObservation({ text: 't', roomId: 1, evadedAlready: false })
    expect(shadowBanObservations.value[0].evadedAlready).toBe(true)
  })

  test('removeShadowBanObservation drops the matching entry', () => {
    recordShadowBanObservation({ text: 'a', roomId: 1, evadedAlready: false })
    recordShadowBanObservation({ text: 'b', roomId: 1, evadedAlready: false })
    removeShadowBanObservation('a', 1)
    expect(shadowBanObservations.value.map(o => o.text)).toEqual(['b'])
  })

  test('clearShadowBanObservations empties the list', () => {
    recordShadowBanObservation({ text: 'a', roomId: 1, evadedAlready: false })
    clearShadowBanObservations()
    expect(shadowBanObservations.value).toEqual([])
  })
})

describe('promoteObservationToRule', () => {
  test('moves an observation into localRoomRules and removes it from the list', () => {
    recordShadowBanObservation({ text: 'foo', roomId: 5, evadedAlready: false })
    const obs = shadowBanObservations.value[0]
    const ok = promoteObservationToRule(obs, 'fo­o')
    expect(ok).toBe(true)
    expect(localRoomRules.value['5']).toEqual([{ from: 'foo', to: 'fo­o' }])
    expect(shadowBanObservations.value).toHaveLength(0)
  })

  test('refuses when from === to', () => {
    recordShadowBanObservation({ text: 'foo', roomId: 5, evadedAlready: false })
    const obs = shadowBanObservations.value[0]
    expect(promoteObservationToRule(obs, 'foo')).toBe(false)
    expect(localRoomRules.value['5']).toBeUndefined()
  })

  test('refuses when roomId is undefined', () => {
    recordShadowBanObservation({ text: 'foo', evadedAlready: false })
    const obs = shadowBanObservations.value[0]
    expect(promoteObservationToRule(obs, 'fo­o')).toBe(false)
  })
})
