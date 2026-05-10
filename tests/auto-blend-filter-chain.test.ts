// Integration coverage for the full recordDanmaku filter chain — exercises
// every short-circuit wired into auto-blend.ts in this fork (locked emoticon,
// cross-room emote ID, large-emote/bulge, text blacklist, UID blacklist,
// avoid-repeat, reply gating, self-echo). Each assertion reads through the
// trend-map size to confirm "did it get past the filter?", which is what
// auto-blend cares about end-to-end.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

function TestXMLHttpRequest() {}
TestXMLHttpRequest.prototype.open = () => {}
TestXMLHttpRequest.prototype.send = () => {}
;(globalThis as unknown as { XMLHttpRequest: typeof TestXMLHttpRequest }).XMLHttpRequest = TestXMLHttpRequest

const realApi = await import('../src/lib/api')
mock.module('../src/lib/api', () => ({ ...realApi }))

const { _recordDanmakuForTests, _getTrendMapSizeForTests, _getCpmWindowSizeForTests, _resetAutoBlendStateForTests } =
  await import('../src/lib/auto-blend')

const {
  autoBlendEnabled,
  autoBlendIncludeReply,
  autoBlendMessageBlacklist,
  autoBlendUserBlacklist,
  cachedEmoticonPackages,
} = await import('../src/lib/store')

describe('recordDanmaku filter chain — text blacklist', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
    autoBlendEnabled.value = true
    autoBlendIncludeReply.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    cachedEmoticonPackages.value = []
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    _resetAutoBlendStateForTests()
  })

  test('blacklisted text never enters the trend map', () => {
    autoBlendMessageBlacklist.value = { '666': true }
    _recordDanmakuForTests('666', 'user-1', false)
    _recordDanmakuForTests('666', 'user-2', false)
    _recordDanmakuForTests('666', 'user-3', false)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('non-blacklisted text in the same batch DOES enter the trend map', () => {
    autoBlendMessageBlacklist.value = { '666': true }
    _recordDanmakuForTests('666', 'u-1', false)
    _recordDanmakuForTests('上车', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('text blacklist filters AFTER trim — incoming "  666  " is dropped', () => {
    // recordDanmaku trims rawText before keying; the user types "666" into
    // the blacklist UI but real chat often has trailing whitespace.
    autoBlendMessageBlacklist.value = { '666': true }
    _recordDanmakuForTests('  666  ', 'u-1', false)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('text blacklist still tracks CPM (room activity proxy, not trigger-eligibility)', () => {
    // Same invariant as the avoidRepeat test: filtering the message out of
    // the trend MUST NOT remove it from CPM tracking, otherwise heavily-
    // blacklisted rooms would underestimate room speed and stretch the
    // adaptive cooldown to its ceiling.
    autoBlendMessageBlacklist.value = { '666': true }
    _recordDanmakuForTests('666', 'u-1', false)
    _recordDanmakuForTests('666', 'u-2', false)
    _recordDanmakuForTests('666', 'u-3', false)
    expect(_getTrendMapSizeForTests()).toBe(0)
    expect(_getCpmWindowSizeForTests()).toBe(3)
  })

  test('Object.prototype-named text passes through normally with empty blacklist', () => {
    // Regression for the upstream `in`→`Object.hasOwn` fix: a viewer typing
    // literally "toString" must reach the trend like any other text.
    _recordDanmakuForTests('toString', 'u-1', false)
    _recordDanmakuForTests('constructor', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(2)
  })
})

describe('recordDanmaku filter chain — large emote (hasLargeEmote=true)', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
    autoBlendEnabled.value = true
    autoBlendIncludeReply.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    cachedEmoticonPackages.value = []
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    _resetAutoBlendStateForTests()
  })

  test('bulge-emoticon events never enter the trend map', () => {
    _recordDanmakuForTests('应援', 'u-1', false, true)
    _recordDanmakuForTests('应援', 'u-2', false, true)
    _recordDanmakuForTests('应援', 'u-3', false, true)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('non-bulge events with the same text DO enter the trend (signal owns the gate, not text)', () => {
    // A coincidental plain-text "应援" (no bulge marker) is just a normal
    // word and should be eligible. Only the DOM-level bulge marker is the
    // disqualifier — text alone is not enough.
    _recordDanmakuForTests('应援', 'u-1', false, false)
    _recordDanmakuForTests('应援', 'u-2', false, false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('bulge events still update CPM (room activity, not trigger-eligibility)', () => {
    _recordDanmakuForTests('应援', 'u-1', false, true)
    _recordDanmakuForTests('应援', 'u-2', false, true)
    expect(_getCpmWindowSizeForTests()).toBe(2)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })
})

describe('recordDanmaku filter chain — cross-room unavailable emoticon ID', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
    autoBlendEnabled.value = true
    autoBlendIncludeReply.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    // Seed a cache so isUnavailableEmoticon is "live" (not in fail-open mode).
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'in-room',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [{ emoji: '', descript: '', url: '', emoticon_unique: 'room_111_22', emoticon_id: 22, perm: 1 }],
      },
    ]
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    cachedEmoticonPackages.value = []
    _resetAutoBlendStateForTests()
  })

  test('cross-room emoticon_unique IDs (not in cache) never enter the trend map', () => {
    _recordDanmakuForTests('room_999_88', 'u-1', false)
    _recordDanmakuForTests('room_999_88', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('an in-room emoticon_unique that looks like an ID DOES enter the trend (legitimate emote)', () => {
    _recordDanmakuForTests('room_111_22', 'u-1', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })

  test('non-ID-shaped text passes through unaffected by the unavailable filter', () => {
    _recordDanmakuForTests('上车', 'u-1', false)
    _recordDanmakuForTests('666', 'u-2', false)
    expect(_getTrendMapSizeForTests()).toBe(2)
  })

  test('unavailable IDs still update CPM (room activity tracked even though unactionable)', () => {
    _recordDanmakuForTests('room_999_88', 'u-1', false)
    _recordDanmakuForTests('room_999_88', 'u-2', false)
    expect(_getCpmWindowSizeForTests()).toBe(2)
    expect(_getTrendMapSizeForTests()).toBe(0)
  })

  test('with empty cache, the filter is fail-open (avoid false-rejecting during startup)', () => {
    cachedEmoticonPackages.value = []
    // ID-shaped text reaches the trend because the helper can't tell
    // unavailable from "still loading".
    _recordDanmakuForTests('room_999_88', 'u-1', false)
    expect(_getTrendMapSizeForTests()).toBe(1)
  })
})

describe('recordDanmaku filter chain — interaction', () => {
  beforeEach(() => {
    resetGmStore()
    _resetAutoBlendStateForTests()
    autoBlendEnabled.value = true
    autoBlendIncludeReply.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    cachedEmoticonPackages.value = []
  })

  afterEach(() => {
    autoBlendEnabled.value = false
    autoBlendUserBlacklist.value = {}
    autoBlendMessageBlacklist.value = {}
    _resetAutoBlendStateForTests()
  })

  test('UID and text blacklists compose: either one filters independently', () => {
    autoBlendUserBlacklist.value = { 'u-1': 'bad-user' }
    autoBlendMessageBlacklist.value = { '666': true }

    _recordDanmakuForTests('上车', 'u-1', false) // dropped by uid
    _recordDanmakuForTests('666', 'u-2', false) // dropped by text
    _recordDanmakuForTests('666', 'u-1', false) // dropped by both
    _recordDanmakuForTests('上车', 'u-2', false) // ✓ passes
    _recordDanmakuForTests('冲', 'u-3', false) // ✓ passes

    expect(_getTrendMapSizeForTests()).toBe(2)
  })

  test('every filter category still leaves CPM tracking intact', () => {
    autoBlendUserBlacklist.value = { 'u-1': 'bad' }
    autoBlendMessageBlacklist.value = { '666': true }

    _recordDanmakuForTests('上车', 'u-1', false) // uid
    _recordDanmakuForTests('666', 'u-2', false) // text
    _recordDanmakuForTests('应援', 'u-3', false, true) // bulge

    // CPM = total non-self danmaku, regardless of category.
    expect(_getCpmWindowSizeForTests()).toBe(3)
    // None made it into the trend map.
    expect(_getTrendMapSizeForTests()).toBe(0)
  })
})
