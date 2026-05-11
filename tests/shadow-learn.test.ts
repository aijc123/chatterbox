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
  // notifyUser is consumed transitively (guard-room-sync imports it). The
  // mock has to expose every export the real module does or the importer
  // throws "Export named 'notifyUser' not found".
  notifyUser: (level: string, message: string, detail?: string) =>
    appendLogCalls.push(`${level}:${message}${detail ? `:${detail}` : ''}`),
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

  test('caps total per room AND preserves manual user rules — only learned can be evicted', () => {
    // 行为变更:之前 cap-eviction 用 `merged.slice(-CAP)`,会无差别砍掉最老的
    // 项,包括用户手输的规则——直接违反 docstring 的"user wins"承诺。
    // 现在 manual(无 source / source!=='learned')永远保留,只从 learned 队列里
    // 按"老的先丢"裁剪。
    //
    // 49 条 manual seed(没 source 字段) + 3 条 learned → 总共 52 → cap=50;
    // manuals(49) < 50 → 留 50-49=1 条 learned(取最新一条 → '新词C')。
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
    // 全部 49 条 seed 都被保留(包括 seed0、seed1)。
    expect(rules?.[0]?.from).toBe('seed0')
    expect(rules?.[1]?.from).toBe('seed1')
    // 仅最新的一条 learned 被纳入(新词A/B 因 cap 被丢)。
    expect(rules?.some(r => r.from === '新词C')).toBe(true)
    expect(rules?.some(r => r.from === '新词A')).toBe(false)
    expect(rules?.some(r => r.from === '新词B')).toBe(false)
  })

  test('cap-evicts only learned, never manual: 50 manuals + new learned → learned dropped, log warning', () => {
    // 极端情况:manual 单独已经达到 cap → 任何新 learned 都不能进库。
    // 之前的实现会无声地把头部 manual 切掉给 learned 让位,违反"user wins"。
    const seedRules = Array.from({ length: 50 }, (_, i) => ({ from: `seed${i}`, to: `s${i}` }))
    localRoomRules.value = { '11': seedRules }
    learnShadowRules({
      roomId: 11,
      sensitiveWords: ['新词X'],
      evadedMessage: 'x',
      originalMessage: 'irrelevant',
    })
    const rules = localRoomRules.value['11']
    expect(rules?.length).toBe(50)
    expect(rules?.[0]?.from).toBe('seed0') // 全 manual 保留,无 learned 进入
    expect(rules?.some(r => r.from === '新词X')).toBe(false)
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
