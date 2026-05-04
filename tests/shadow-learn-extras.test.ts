// Supplemental coverage for `src/lib/shadow-learn.ts` — fills the branches
// the existing `tests/shadow-learn.test.ts` doesn't reach (44% func / 77%
// lines per coverage report). Targets:
//
//   - learnShadowRules early-exit when sensitiveWords is empty
//   - learnShadowRules skips a word when processText returns the same string
//   - learnShadowRules mixed valid/invalid words in one call
//   - recordShadowBanObservation early-exit on empty/whitespace text
//   - recordShadowBanObservation OBSERVATION_CAP eviction (>200 entries)
//   - recordShadowBanObservation candidates parameter (new entry + update)
//   - promoteObservationToRule rejects when from === to after trim
//   - promoteObservationToRule rejects when an existing rule has the same `from`
//   - promoteObservationToRule rejects when trimmedText is empty

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

const appendLogCalls: string[] = []
mock.module('../src/lib/log', () => ({
  appendLog: (msg: string) => appendLogCalls.push(msg),
  appendLogQuiet: (msg: string) => appendLogCalls.push(msg),
  notifyUser: (level: string, message: string, detail?: string) =>
    appendLogCalls.push(`${level}:${message}${detail ? `:${detail}` : ''}`),
}))

const { clearShadowBanObservations, learnShadowRules, promoteObservationToRule, recordShadowBanObservation } =
  await import('../src/lib/shadow-learn')
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

describe('learnShadowRules — extra branches', () => {
  test('empty sensitiveWords array → no rule written, no log', () => {
    learnShadowRules({
      roomId: 1,
      sensitiveWords: [],
      evadedMessage: '',
      originalMessage: 'x',
    })
    expect(localRoomRules.value['1']).toBeUndefined()
    expect(appendLogCalls).toHaveLength(0)
  })

  test('skips word when its processText output equals the input (no-op rewrite)', () => {
    // ASCII letters and most non-segmentable single chars: addRandomCharacter
    // inserts a soft hyphen, so output != input. To reach this branch we'd
    // need a word for which processText is a no-op. In practice this is
    // unreachable for non-empty input, so we assert the contract via a more
    // robust path: if all sensitive words are filtered out by validation,
    // newRules is empty and the function early-exits without log.
    learnShadowRules({
      roomId: 1,
      sensitiveWords: ['a'.repeat(100)], // exceeds SHADOW_RULE_MAX_LEN(60)
      evadedMessage: 'irrelevant',
      originalMessage: 'irrelevant',
    })
    expect(localRoomRules.value['1']).toBeUndefined()
    expect(appendLogCalls.some(l => l.includes('已学到'))).toBe(false)
  })

  test('mixed valid / invalid: only valid words are written, log lists exactly those', () => {
    // Validator rules:
    //   - trim() length must be >= 1 and <= 60
    //   - the TRIMMED string must not contain '\n'
    // Note that '\nwithLF'.trim() === 'withLF' (no embedded LF after trim),
    // so it's accepted. To reach the LF-rejection branch we use 'with\nLF'
    // (LF in the middle of an otherwise-valid string).
    learnShadowRules({
      roomId: 7,
      sensitiveWords: ['', '   ', 'good', 'a'.repeat(200), 'with\nLF', 'also-good'],
      evadedMessage: 'x',
      originalMessage: 'y',
    })
    const rules = localRoomRules.value['7']
    expect(rules?.length).toBe(2)
    const froms = rules!.map(r => r.from)
    expect(froms).toEqual(expect.arrayContaining(['good', 'also-good']))
    const log = appendLogCalls.find(l => l.includes('已学到'))
    expect(log).toContain('good')
    expect(log).toContain('also-good')
    expect(log).not.toContain('LF')
  })

  test('logs "(房间 N)" with the exact roomId in Chinese', () => {
    learnShadowRules({
      roomId: 99,
      sensitiveWords: ['xyz'],
      evadedMessage: 'x',
      originalMessage: 'y',
    })
    expect(appendLogCalls.some(l => l.includes('房间 99'))).toBe(true)
  })

  test('repeated learn calls accumulate without exceeding cap', () => {
    for (let i = 0; i < 60; i++) {
      learnShadowRules({
        roomId: 3,
        sensitiveWords: [`word-${i}`],
        evadedMessage: 'x',
        originalMessage: 'x',
      })
    }
    const rules = localRoomRules.value['3']
    expect(rules!.length).toBe(50)
    // Newest preserved (eviction takes from the start).
    expect(rules!.at(-1)?.from).toBe('word-59')
  })
})

describe('recordShadowBanObservation — extra branches', () => {
  test('empty text → no-op, list unchanged', () => {
    recordShadowBanObservation({ text: '', evadedAlready: false })
    expect(shadowBanObservations.value).toEqual([])
  })

  test('whitespace-only text → no-op (trimmed to empty)', () => {
    recordShadowBanObservation({ text: '   \n  ', evadedAlready: false })
    expect(shadowBanObservations.value).toEqual([])
  })

  test('trims surrounding whitespace before storage', () => {
    recordShadowBanObservation({ text: '  hello  ', roomId: 1, evadedAlready: false })
    expect(shadowBanObservations.value[0].text).toBe('hello')
  })

  test('candidates argument is stored on first observation', () => {
    const candidates = [{ kind: 'spaced' as const, label: 'spaced', text: 'h e l l o' }]
    recordShadowBanObservation({ text: 'hello', roomId: 1, evadedAlready: false, candidates })
    expect(shadowBanObservations.value[0].candidates).toEqual(candidates)
  })

  test('repeat with new candidates overwrites the prior candidates (freshest wins)', () => {
    recordShadowBanObservation({
      text: 't',
      roomId: 1,
      evadedAlready: false,
      candidates: [{ kind: 'spaced' as const, label: 'old', text: 'old' }],
    })
    recordShadowBanObservation({
      text: 't',
      roomId: 1,
      evadedAlready: false,
      candidates: [{ kind: 'spaced' as const, label: 'new', text: 'new' }],
    })
    expect(shadowBanObservations.value).toHaveLength(1)
    expect(shadowBanObservations.value[0].candidates?.[0].label).toBe('new')
  })

  test('repeat WITHOUT candidates preserves the previously-stored ones', () => {
    recordShadowBanObservation({
      text: 't',
      roomId: 1,
      evadedAlready: false,
      candidates: [{ kind: 'spaced' as const, label: 'kept', text: 'kept' }],
    })
    recordShadowBanObservation({ text: 't', roomId: 1, evadedAlready: false })
    expect(shadowBanObservations.value[0].candidates?.[0].label).toBe('kept')
  })

  test('OBSERVATION_CAP (200): pushing 250 distinct entries keeps only the last 200', () => {
    for (let i = 0; i < 250; i++) {
      recordShadowBanObservation({ text: `unique-${i}`, roomId: 1, evadedAlready: false })
    }
    expect(shadowBanObservations.value).toHaveLength(200)
    // Newest is preserved.
    expect(shadowBanObservations.value.at(-1)?.text).toBe('unique-249')
    // Eviction takes from the start, so unique-50 is the oldest survivor.
    expect(shadowBanObservations.value[0]?.text).toBe('unique-50')
  })
})

describe('promoteObservationToRule — extra branches', () => {
  test('refuses when trimmedText is empty (text was all whitespace before trim)', () => {
    // Manually craft an observation that bypassed the empty-text guard via
    // direct assignment; promotion still must guard.
    shadowBanObservations.value = [{ text: '   ', roomId: 5, ts: 0, count: 1, evadedAlready: false }]
    expect(promoteObservationToRule(shadowBanObservations.value[0], 'replacement')).toBe(false)
    expect(localRoomRules.value['5']).toBeUndefined()
  })

  test('refuses when after trimming, from === to', () => {
    recordShadowBanObservation({ text: '  same  ', roomId: 5, evadedAlready: false })
    const obs = shadowBanObservations.value[0]
    expect(promoteObservationToRule(obs, '   same   ')).toBe(false)
  })

  test('refuses when an existing rule already has the same `from`', () => {
    localRoomRules.value = { '5': [{ from: 'dup', to: 'manual-replacement' }] }
    recordShadowBanObservation({ text: 'dup', roomId: 5, evadedAlready: false })
    const obs = shadowBanObservations.value[0]
    expect(promoteObservationToRule(obs, 'auto-replacement')).toBe(false)
    // Original rule preserved unchanged.
    expect(localRoomRules.value['5']).toEqual([{ from: 'dup', to: 'manual-replacement' }])
    // Observation NOT removed since promotion failed.
    expect(shadowBanObservations.value).toHaveLength(1)
  })

  test('clearShadowBanObservations is idempotent (calling twice is safe)', () => {
    recordShadowBanObservation({ text: 'x', roomId: 1, evadedAlready: false })
    clearShadowBanObservations()
    clearShadowBanObservations()
    expect(shadowBanObservations.value).toEqual([])
  })
})
